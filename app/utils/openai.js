// openai.js — fast-mode (Responses API) with optional Assistants fallback
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY?.trim(),
});

/**
 * USAGE (stability across runs)
 * const out1 = await getAIWateringAdvice(weatherData);             // first call
 * await save(userId, out1._planSnapshot);                          // persist snapshot
 * const prev = await load(userId);                                 // later
 * const out2 = await getAIWateringAdvice(weatherData, prev);       // stabilized
 */

// ------------------------------ Time & Date helpers ------------------------------
function getLocalDateString(tz = process.env.TZ || "America/New_York") {
  if (tz && tz.startsWith(":")) tz = tz.slice(1);
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date()); // YYYY-MM-DD
}
function daysBetweenISO(a, b) {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  const A = Date.UTC(ya, ma - 1, da);
  const B = Date.UTC(yb, mb - 1, db);
  return Math.round((A - B) / 86400000);
}
function isoWeekNumber(dStr) {
  const d = new Date(dStr + "T00:00:00Z");
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil((((t - yearStart) / 86400000) + 1) / 7);
}
function shortLabel(dateStr, tz = "America/New_York") {
  const date = new Date(dateStr + "T12:00:00Z");
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, weekday: "short", month: "numeric", day: "numeric"
  });
  return fmt.format(date).replace(",", ""); // "Sun 8/10"
}

// ------------------------------ Build compact weather ------------------------------
/**
 * Input per day:
 * { date, temp_max, temp_min, humidity, description, rain, precip_prob, wind_speed }
 * Output per day (oldest → newest):
 * { d, hi, lo, rain, humidity, wind, pop, rainPast3, hiNext3, rainNext3 }
 */
function buildWeather(weatherData) {
  const src = [...weatherData].sort((a, b) => a.date.localeCompare(b.date));
  const w = src.map(d => ({
    d: d.date,
    hi: Math.round(d.temp_max),
    lo: Math.round(d.temp_min),
    rain: +(d.rain ?? 0).toFixed(2),                 // inches
    humidity: Math.round(d.humidity ?? 0),           // %
    wind: Math.round((d.wind_speed ?? 0) * 10) / 10, // mph
    pop: Math.round(d.precip_prob ?? 0),             // %
    desc: String(d.description || "").toLowerCase(), // <-- NEW
    rainPast3: 0,
    hiNext3: 0,
    rainNext3: 0,
  }));
  for (let i = 0; i < w.length; i++) {
    const past3 = w.slice(Math.max(0, i - 2), i + 1);
    w[i].rainPast3 = +past3.reduce((s, x) => s + x.rain, 0).toFixed(2);
    const next3 = w.slice(i, i + 3);
    w[i].hiNext3   = Math.round(next3.reduce((s, x) => s + x.hi, 0) / next3.length);
    w[i].rainNext3 = +next3.reduce((s, x) => s + x.rain, 0).toFixed(2);
  }
  return w;
}

// ------------------------------ Scoring & deterministic plan ------------------------------
function scoreDay(d) {
  const heat          = Math.max(0, (d.hi - 80) / 12);             // ~1 near low 90s
  const dryness       = 1 - Math.min(1, d.rainPast3 / 0.6);        // 0.6" saturates
  const humidityBrake = Math.min(1, d.humidity / 100);             // slows drying
  const rainSoon      = Math.min(1, d.rainNext3 / 0.25);           // expected rain next ~3d
  const wind          = Math.max(0, Math.min(1, ((d.wind ?? 0) - 6) / 14)); // 0@6 → 1@~20
  const pop           = (d.pop ?? 0) / 100;                        // precip probability today

  let s = 0.52*heat + 0.42*dryness - 0.18*humidityBrake - 0.25*rainSoon + 0.18*wind - 0.20*pop;
  return Math.max(0, Math.min(1, s));
}
function statusFromScore(s) { return s >= 0.60 ? "yes" : s >= 0.40 ? "maybe" : "no"; }

function planSchedule(weather, policy, today) {
  const out = [];
  let lastYesDate = null;
  let weekYes = 0;
  let curWeek = isoWeekNumber(weather[0].d);

  for (let i = 0; i < weather.length; i++) {
    const d = weather[i];
    const wk = isoWeekNumber(d.d);
    if (wk !== curWeek) { curWeek = wk; weekYes = 0; }

    let status = "maybe";
    const pop = (d.pop ?? 0);
    const smallQpf = d.rain < 0.05 && d.rainNext3 < 0.20;
    const hasStormWord = /thunder|t-?storm|storm/.test(d.desc || "");

    const tinyToday = d.rain < policy.qpfTinyToday;
    const tinyNext3 = d.rainNext3 < policy.qpfTinyNext3;

    // Definitive skips
    if (d.rain >= policy.rainSkip || d.rainPast3 >= policy.rainSkip3) {
    status = "no";
    } else if (d.rainNext3 >= 0.30) {
    status = "no";
    } else if (d.humidity >= policy.humidHigh && d.hiNext3 < policy.warmDay) {
    status = "no";
    } else if (weekYes >= policy.maxYesPerWeek) {
    status = "no";
    } else if (lastYesDate && daysBetweenISO(d.d, lastYesDate) <= policy.minGapDays) {
    status = "no";
    } else if (pop >= policy.popCaution && tinyToday && tinyNext3) {
    // High chance but guidance shows only tiny amounts → likely convective bursts; defer
    status = "no";
    } else if (isConvectiveRisk(d, policy)) {
    // Moderate POP (40–59%) with tiny QPF → lean "maybe"
    status = "maybe";
    }
    

    // Positive YES triggers pre-score
    // if (status === "maybe") {
    //   const veryHotWave = d.hiNext3 >= policy.hotWave && d.rainNext3 < 0.20 && d.rainPast3 < policy.dryTrigger3 && d.humidity < policy.humidMod;
    //   const hotDryToday = d.hi >= policy.hotDay && d.rainPast3 < policy.dryTrigger3 && d.humidity < policy.humidHigh;
    //   if (veryHotWave || hotDryToday) status = "yes";
    // }

    // Positive YES triggers pre-score
    if (status === "maybe") {
        const veryHotWave = d.hiNext3 >= policy.hotWave && d.rainNext3 < 0.20 &&
                            d.rainPast3 < policy.dryTrigger3 && d.humidity < policy.humidMod;
        const hotDryToday = d.hi >= policy.hotDay && d.rainPast3 < policy.dryTrigger3 &&
                            d.humidity < policy.humidHigh;
        if (veryHotWave || hotDryToday) status = "yes";
      }

    if (status === "maybe") status = statusFromScore(scoreDay(d));

    // Re-check spacing/cap before committing YES
    if (status === "yes") {
      if (weekYes >= policy.maxYesPerWeek) status = "no";
      if (lastYesDate && daysBetweenISO(d.d, lastYesDate) <= policy.minGapDays) status = "no";
    }

    if (status === "yes") { lastYesDate = d.d; weekYes += 1; }

    // If YES but it’s a convective-risk day with tiny QPF, soften to MAYBE
    // (Remove the heat check if you want to ALWAYS keep "maybe" on these.)
    if (status === "yes" && isConvectiveRisk(d, policy) && d.hi < 92) {
        status = "maybe";
    }
    
    if (status === "maybe") status = statusFromScore(scoreDay(d));
        out.push({ date: d.d, status, score: +scoreDay(d).toFixed(2) });
    }

  // Integrity: no consecutive YES
  for (let i = 1; i < out.length; i++) {
    if (out[i-1].status === "yes" && out[i].status === "yes") out[i].status = "no";
  }

  // Quality nudge: ensure ~2 yes in next 7 if hot/dry
  const startIdx = weather.findIndex(x => x.d >= today);
  const endIdx   = Math.min(weather.length - 1, startIdx + 6);
  if (startIdx >= 0) {
    const next7 = weather.slice(startIdx, endIdx + 1);
    const rain7 = next7.reduce((s, x) => s + x.rain, 0);
    const avgHi7 = Math.round(next7.reduce((s, x) => s + x.hi, 0) / next7.length);
    let yesCount7 = out.slice(startIdx, endIdx + 1).filter(x => x.status === "yes").length;

    if (rain7 < 0.25 && avgHi7 >= 84 && yesCount7 < 2) {
      const firstYes = out.slice(startIdx, endIdx + 1).findIndex(x => x.status === "yes");
      const lastYesDateIn7 = firstYes >= 0 ? out[startIdx + firstYes].date : null;
      for (let i = startIdx; i <= endIdx; i++) {
        const canUpgrade =
        out[i].status === "maybe" &&
        !isConvectiveRisk(weather[i], policy) && // skip convective "maybe"
        (!lastYesDateIn7 || daysBetweenISO(out[i].date, lastYesDateIn7) > policy.minGapDays);
    if (canUpgrade) { out[i].status = "yes"; yesCount7++; break; }

        const ok = out[i].status === "maybe" &&
          (!lastYesDateIn7 || daysBetweenISO(out[i].date, lastYesDateIn7) > policy.minGapDays);
        if (ok) { out[i].status = "yes"; yesCount7++; break; }
      }
    }
  }

  // Integrity again
  for (let i = 1; i < out.length; i++) {
    if (out[i].status === "yes" && isConvectiveRisk(weather[i], policy) && weather[i].hi < 92) {
        out[i].status = "maybe";
      }
    if (out[i-1].status === "yes" && out[i].status === "yes") out[i].status = "no";
  }
  return out;
}

// ------------------------------ Stability: keep today unless material change ------------------------------
function materialChange(prevFeat, nextFeat) {
  const popCrosses  = (prevFeat.pop ?? 0) < 50 && (nextFeat.pop ?? 0) >= 60;
  const qpfJump     = (prevFeat.rainNext3 ?? 0) < 0.20 && (nextFeat.rainNext3 ?? 0) >= 0.30;
  const rp3NowWet   = (prevFeat.rainPast3 ?? 0) < 0.50 && (nextFeat.rainPast3 ?? 0) >= 0.60;
  const scoreDelta  = Math.abs((prevFeat.score ?? 0) - (nextFeat.score ?? 0)) >= 0.15;
  return popCrosses || qpfJump || rp3NowWet || scoreDelta;
}
function stabilizeTodayDecision(today, weather, decisions, prevPlan /* may be null */) {
  if (!prevPlan) return decisions;

  const byDatePrev = new Map((prevPlan.decisions || []).map(d => [d.date, d]));
  const byDateNext = new Map(decisions.map(d => [d.date, d]));
  const todayRow   = weather.find(d => d.d === today) ||
                     weather.find(d => d.d > today) ||
                     weather[0];
  if (!todayRow) return decisions;

  const prev = byDatePrev.get(todayRow.d);
  const next = byDateNext.get(todayRow.d);
  if (!prev || !next || prev.status === next.status) return decisions;

  const featPrev = (prevPlan.weather || []).find(d => d.d === todayRow.d) || {};
  const featNext = weather.find(d => d.d === todayRow.d) || {};
  featPrev.score = prev.score; featNext.score = next.score;

  if (!materialChange(featPrev, featNext)) {
    next.status = prev.status; // pin previous status
  }
  return decisions;
}

// ------------------------------ Plan hints for Wynn ------------------------------
function buildPlanHints({ weather, decisions, today, policy }) {
  const labels = Object.fromEntries(weather.map(d => [d.d, shortLabel(d.d)]));
  const startIdx = Math.max(0, weather.findIndex(x => x.d >= today));
  const endIdx   = Math.min(weather.length - 1, startIdx + 6);
  const next7Weather   = weather.slice(startIdx, endIdx + 1);
  const next7Decisions = decisions.slice(startIdx, endIdx + 1);

  const yesDatesNext7 = next7Decisions.filter(d => d.status === "yes").map(d => d.date);
  const yesCountNext7 = yesDatesNext7.length;

  let candidateSecondYes = null;
  if (yesCountNext7 < 2) {
    const firstYesIdx = next7Decisions.findIndex(d => d.status === "yes");
    const lastYesDate = firstYesIdx >= 0 ? next7Decisions[firstYesIdx].date : null;
    for (let i = (firstYesIdx >= 0 ? startIdx + firstYesIdx + 1 : startIdx); i <= endIdx; i++) {
      const d = decisions[i];
      const okGap = !lastYesDate || daysBetweenISO(d.date, lastYesDate) > policy.minGapDays;
      if (d.status !== "no" && okGap) { candidateSecondYes = d.date; break; }
    }
  }

  let heatPeak = null;
  for (const wd of next7Weather) {
    if (!heatPeak || wd.hi > heatPeak.hi) heatPeak = { date: wd.d, hi: wd.hi };
  }
  const callouts = [];
  if (yesDatesNext7[0]) callouts.push({ date: yesDatesNext7[0], why: "planned soak" });
  if (candidateSecondYes) callouts.push({ date: candidateSecondYes, why: "possible second soak" });
  if (heatPeak?.date && heatPeak.hi >= 88) callouts.push({ date: heatPeak.date, why: "heat peak" });
  if (next7Weather[0]?.humidity >= 70) callouts.push({ date: next7Weather[0].d, why: "humid stretch" });
  const windy = next7Weather.find(d => (d.wind ?? 0) >= (policy.windyMph ?? 12));
  if (windy) callouts.push({ date: windy.d, why: "breezy afternoon" });

  return { yesDatesNext7, candidateSecondYes, yesCountNext7, labels, callouts };
}

// ============================================================================
// FAST MODE: Responses API — ask only for text (summary + reasons), then merge
// ============================================================================
const FAST_SYSTEM = `
You are “Wynn,” a friendly garden gnome with a scientist’s eye. Tone: light and cheery; precise first, whimsical second (about 10–20%). One emoji max per field. Avoid slang, rhyme, and flowery prose. Rare “!” only. Output VALID JSON per schema. Do not include wateringStatus.

CLARITY OVER CUTE
• No vague biology/personification: never “plants breathe heavily,” “happy roots,” “thirsty plants,” etc.
• Be concrete: “top 2″ feels dry,” “root zone still moist,” “evaporation faster with wind,” “humidity slows drying,” “two rest days after a soak.”
• Use weekday names (Monday…Sunday), not numeric dates.

CONSISTENCY WITH THE SCHEDULE (decisions[])
• The schedule is authoritative. Reasons must *justify* the given status.
• If today’s status is “no” and the previous day was “yes,” lead with spacing/rest after a deep soak (e.g., acknowledge the recent soak and say why rest is okay even if hot).
• If “no” due to recent rain or weekly cap, say that plainly (wet soil, weekly limit reached). Do not imply watering is needed on a “no” day.
• If “maybe,” point to one concrete uncertainty (borderline dryness, possible rain, humid slowdown) and defer to a simple check.

WEEK SUMMARY (today → +7)
• 1–2 planning sentences. State likely watering count and why (heat building, little rain, humid stretch, wind).
• You may mention one weekday (two at most) if it improves planning clarity. Do not list a full itinerary.

DAILY REASONS (map: dailyReasons[date])
• ≤ 24 words. Start with the key factor (heat/dry spell/humidity/wind/spacing/weekly cap/recent rain). End with a brief, friendly note in Wynn’s voice.
• Never contradict status: 
  – On “no” days, do not say “needs water” or similar; acknowledge rest/rain/spacing instead.
  – On “yes” days, avoid “soil still moist” unless explaining a rare exception.
• Strict variety:
  – No identical sentences across the week.
  – Adjacent days must not start with the same two words.
  – Avoid fillers like “monitor conditions,” “adequate moisture,” “conditions remain.”

TODAY FIELDS
• todayReason (≤ 18 words): same style; if yesterday was “yes,” acknowledge the rest day explicitly before any heat note.
• todayAdvice (30–60 words): instructional and varied. Rotate tips (2″ finger test, deep-soak method, mulch/shade, watering timing, tool choice). Do not repeat the exact same tip two days in a row. Define any test simply (finger to 2″ beside stem; water only if dry).

GUARDRAILS
• Provide a dailyReasons entry for EVERY input date (oldest → newest).
• Do not echo wateringStatus; the app merges decisions[].status.
• JSON only; no extra keys or prose.
`;



const FAST_SCHEMA = {
  name: "WateringAdviceText",
  schema: {
    type: "object",
    required: ["weekSummary","dailyReasons","todayReason","todayAdvice","soilMoisture","keyFactors"],
    additionalProperties: false,
    properties: {
      weekSummary: { type: "string", minLength: 6 },
      dailyReasons: {
        type: "object",
        additionalProperties: { type: "string", minLength: 2 }
      },
      todayReason:  { type: "string", minLength: 2 },
      todayAdvice:  { type: "string", minLength: 6 },
      soilMoisture: { type: "string" },
      keyFactors:   { type: "array", items: { type: "string" } }
    }
  }
};

// A robust extractor so SDK changes don’t break you
function parseResponsesJSON(resp) {
  try {
    if (resp.output_text) return JSON.parse(resp.output_text);
  } catch {}
  try {
    const parts = resp.output ?? resp.choices ?? [];
    const first = parts[0];
    const maybeContent = first?.content ?? first?.message?.content ?? [];
    const text = Array.isArray(maybeContent)
      ? maybeContent.map(c => c.text?.value ?? c.text ?? c).join("")
      : (maybeContent?.text?.value ?? maybeContent?.text ?? "");
    if (text) return JSON.parse(text);
  } catch {}
  throw new Error("Failed to parse Responses JSON");
}

function isConvectiveRisk(d, policy) {
    const pop = d.pop ?? 0;
    const tinyToday  = (d.rain < (policy.qpfTinyToday ?? 0.05));
    const tinyNext3  = (d.rainNext3 < (policy.qpfTinyNext3 ?? 0.20));
    // “Stormy maybe”: moderate POP but guidance shows tiny totals
    return (pop >= (policy.popMaybeMin ?? 40) && pop < (policy.popCaution ?? 60)) && tinyToday && tinyNext3;
  }

async function runFastMode({ today, policy, weather, decisions, planHints }) {
  const payload = { today, policy, weather, decisions, planHints };
  
  try {
    // Try using the new Responses API first
    if (openai.responses && openai.responses.create) {
      const resp = await openai.responses.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_schema", json_schema: FAST_SCHEMA },
        input: [
          { role: "system", content: FAST_SYSTEM },
          { role: "user",   content: JSON.stringify(payload) }
        ]
      });
      return parseResponsesJSON(resp);
    }
  } catch (error) {
    console.warn("[AI Advice] Responses API failed, falling back to Chat Completions:", error.message);
  }
  
  // Fallback to standard Chat Completions API
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_schema", json_schema: FAST_SCHEMA },
    messages: [
      { role: "system", content: FAST_SYSTEM },
      { role: "user", content: JSON.stringify(payload) }
    ]
  });
  
  return JSON.parse(resp.choices[0].message.content);
}

// ============================================================================
// ASSISTANTS FALLBACK (kept for compatibility / feature flag)
// ============================================================================
async function runAssistantsMode({ today, policy, weather, decisions, planHints, weatherLen }) {
  if (!openai.beta || !openai.beta.threads) {
    throw new Error("Beta API not available in this OpenAI SDK version");
  }
  const thread = await openai.beta.threads.create();
  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: JSON.stringify({ today, policy, weather, decisions, planHints })
  });

  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: process.env.WATER_GNOME_ASSISTANT_ID,
    max_completion_tokens: 1100,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "WateringAdvice",
        schema: {
          type: "object",
          required: ["weeklyAdvice","todayAdvice"],
          additionalProperties: false,
          properties: {
            weeklyAdvice: {
              type: "object",
              required: ["weekSummary","daily"],
              additionalProperties: false,
              properties: {
                weekSummary: { type: "string", minLength: 6 },
                daily: {
                  type: "array",
                  minItems: weatherLen,
                  maxItems: weatherLen,
                  items: {
                    type: "object",
                    required: ["date","wateringStatus","reason"],
                    additionalProperties: false,
                    properties: {
                      date: { type: "string" },
                      wateringStatus: { type: "string", enum: ["yes","maybe","no"] },
                      reason: { type: "string", minLength: 2 }
                    }
                  }
                }
              }
            },
            todayAdvice: {
              type: "object",
              required: ["shouldWater","confidence","reason","advice","soilMoisture","keyFactors"],
              additionalProperties: false,
              properties: {
                shouldWater: { type: "string", enum: ["yes","maybe","no"] },
                confidence: { type: "string", enum: ["high","medium","low"] },
                reason: { type: "string", minLength: 2 },
                advice:  { type: "string", minLength: 6 },
                soilMoisture: { type: "string" },
                keyFactors:  { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      }
    }
  });

  // Poll
  let status = run.status, lastRun = run;
  while (!["completed","failed","cancelled","expired"].includes(status)) {
    await new Promise(r => setTimeout(r, 800));
    lastRun = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    status = lastRun.status;
  }
  if (status !== "completed") throw new Error(`Assistant run ended with status: ${status}`);

  // Read + parse
  const msgs = await openai.beta.threads.messages.list(thread.id, { order: "desc", limit: 1 });
  const content = msgs.data[0]?.content?.find(c => c.type === "text")?.text?.value || "{}";
  return JSON.parse(content);
}

// ------------------------------ Main entry ------------------------------
export async function getAIWateringAdvice(weatherData, prevPlan = null) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

  // Default to fast mode unless explicitly set to use assistants
  const useAssistants = String(process.env.WATER_GNOME_USE_ASSISTANTS || "false").toLowerCase() === "true" && process.env.WATER_GNOME_ASSISTANT_ID;

  const weather = buildWeather(weatherData);
  const weatherLen = weather.length;
  const today = getLocalDateString();

  // Policy (includes POP & wind)
  const policy = {
    maxYesPerWeek: 3,
    minGapDays: 2,
    rainSkip: 0.30,
    rainSkip3: 0.60,
    dryTrigger3: 0.20,
    hotWave: 88,
    hotDay: 85,
    warmDay: 80,
    coolDay: 75,
    humidHigh: 70,
    humidMod: 50,
    popCaution: 60,   // % precip probability to lean away from watering
    windyMph: 12,      // for callouts; scoring uses continuous wind
    popCaution: 60,         // ≥ this → likely skip if QPF is tiny
    popMaybeMin: 40,        // 40–59% POP with tiny QPF → prefer "maybe"
    qpfTinyToday: 0.05,     // "tiny" rain today (in)
    qpfTinyNext3: 0.20      // "tiny" total next 3 days (in)
  };

  // Plan deterministically + stabilize
  let decisions = planSchedule(weather, policy, today);
  decisions = stabilizeTodayDecision(today, weather, decisions, prevPlan);
  if (decisions.length !== weatherLen) throw new Error("Planner output length mismatch");

  // Hints for text generation
  const planHints = buildPlanHints({ weather, decisions, today, policy });

  // ---------------- Generate text ----------------
  let aiText;
  if (useAssistants) {
    try {
      // legacy full-object path
      const aiFull = await runAssistantsMode({ today, policy, weather, decisions, planHints, weatherLen });

      // Repair + enforce schedule
      const decisionByDate = new Map(decisions.map(d => [d.date, d.status]));
      const inputDates = weather.map(d => d.d);
      if (!aiFull.weeklyAdvice) aiFull.weeklyAdvice = {};
      if (!aiFull.weeklyAdvice.daily) aiFull.weeklyAdvice.daily = [];

      const byDate = new Map();
      if (Array.isArray(aiFull.weeklyAdvice.daily)) {
        for (const it of aiFull.weeklyAdvice.daily) if (it?.date) byDate.set(it.date, { ...it });
      } else if (typeof aiFull.weeklyAdvice.daily === "object" && aiFull.weeklyAdvice.daily !== null) {
        for (const [date, it] of Object.entries(aiFull.weeklyAdvice.daily)) byDate.set(date, { date, ...it });
      }

      const fixedDaily = inputDates.map(date => {
        const have = byDate.get(date);
        const must = decisionByDate.get(date);
        if (have) {
          return {
            date,
            wateringStatus: must,
            reason: have.reason && have.reason.trim()
              ? have.reason
              : (must === "yes"
                  ? "Deep soak planned; heat and dry spell ahead."
                  : must === "maybe"
                  ? "Borderline day; check top 2″ for dryness."
                  : "Rest or humid stretch; soil likely holding moisture.")
          };
        }
        return {
          date,
          wateringStatus: must,
          reason: must === "yes"
            ? "Deep soak planned; heat and dry spell ahead."
            : must === "maybe"
            ? "Borderline day; check top 2″ for dryness."
            : "Rest or humid stretch; soil likely holding moisture."
        };
      });

      aiFull.weeklyAdvice.daily = fixedDaily;

      const todayRow =
        fixedDaily.find(d => d.date === today) ||
        fixedDaily.find(d => d.date > today) ||
        fixedDaily[fixedDaily.length - 1];

      if (!aiFull.todayAdvice) aiFull.todayAdvice = {};
      if (todayRow) aiFull.todayAdvice.shouldWater = todayRow.wateringStatus;

      // Add snapshot and return
      aiFull._planSnapshot = { today, policy, weather, decisions };
      return aiFull;
    } catch (error) {
      console.error("[AI Advice] Assistants API failed, falling back to fast mode:", error.message);
      // Fall through to fast mode
    }
  }
  
  // FAST MODE (or fallback from failed assistants mode)
  try {
    // FAST: only ask for text fields, then merge locally
    aiText = await runFastMode({ today, policy, weather, decisions, planHints });

    // Build final object by merging your authoritative decisions
    const reasonsByDate = aiText.dailyReasons || {};
    const daily = weather.map(d => ({
      date: d.d,
      wateringStatus: decisions.find(x => x.date === d.d)?.status || "no",
      reason: (reasonsByDate[d.d] || "").trim() ||
        "Friendly reminder: check the top 2″; water only if dry."
    }));

    const todayRow =
      daily.find(d => d.date === today) ||
      daily.find(d => d.date > today) ||
      daily[daily.length - 1];

    const result = {
      weeklyAdvice: {
        weekSummary: aiText.weekSummary || "Plan on deep, infrequent watering as heat and rain allow.",
        daily
      },
      todayAdvice: {
        shouldWater: todayRow.wateringStatus,
        confidence: "medium", // you can compute from score if desired
        reason: aiText.todayReason || "Keep an eye on the topsoil.",
        advice: aiText.todayAdvice || "Press a finger ~2″ beside the stem; water only if it feels dry and your finger comes up clean.",
        soilMoisture: aiText.soilMoisture || "moderately moist",
        keyFactors: Array.isArray(aiText.keyFactors) && aiText.keyFactors.length
          ? aiText.keyFactors
          : ["rainPast3","hiNext3","rainNext3","humidity","gap","weekly cap"]
      },
      _planSnapshot: { today, policy, weather, decisions } // persist for stability next call
    };

    return result;
  } catch (error) {
    console.error("[AI Advice] Fast mode failed, using fallback:", error.message);
    
    // Final fallback with minimal functionality
    const daily = weather.map(d => ({
      date: d.d,
      wateringStatus: decisions.find(x => x.date === d.d)?.status || "no",
      reason: "Check soil moisture at 2″ depth; water if dry and crumbly."
    }));

    const todayRow =
      daily.find(d => d.date === today) ||
      daily.find(d => d.date > today) ||
      daily[daily.length - 1];

    return {
      weeklyAdvice: {
        weekSummary: "Plan on deep, infrequent watering as heat and rain allow.",
        daily
      },
      todayAdvice: {
        shouldWater: todayRow.wateringStatus,
        confidence: "medium",
        reason: "Check soil moisture levels.",
        advice: "Press a finger 2″ beside the stem; water only if it feels dry and your finger comes up clean.",
        soilMoisture: "moderately moist",
        keyFactors: ["rainPast3","hiNext3","rainNext3","humidity"]
      },
      _planSnapshot: { today, policy, weather, decisions }
    };
  }
}

// Optional named exports for unit tests
export { buildWeather, planSchedule, scoreDay, shortLabel };
