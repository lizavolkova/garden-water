// /mnt/data/openai.js
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY?.trim(),
});

// ---------- Date helpers ----------
function getLocalDateString(tz = process.env.TZ || "America/New_York") {
  if (tz && tz.startsWith(':')) tz = tz.substring(1);
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
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

// ---------- Scoring (now includes wind + precip probability) ----------
function scoreDay(d) {
  // Heat: steeper curve so upper 80s/90s matter
  const heat = Math.max(0, (d.hi - 80) / 12);               // 0 @80°F … ~1 @92°F
  const dryness = 1 - Math.min(1, d.rainPast3 / 0.6);       // 1 if rp3=0 … 0 if ≥0.6"
  const humidityBrake = Math.min(1, d.humidity / 100);      // slows drying
  const rainSoonAmt = Math.min(1, d.rainNext3 / 0.25);      // expected rain next ~3d
  // Wind: afternoon/daily mean mph; 0 at ≤6 mph; ~1 around 20 mph
  const wind = Math.max(0, Math.min(1, ((d.wind ?? 0) - 6) / 14));
  // Probability of precip today (POP): down-weight watering if high
  const pop = (d.pop ?? 0) / 100;

  let s = 0.52*heat + 0.42*dryness - 0.18*humidityBrake - 0.25*rainSoonAmt + 0.18*wind - 0.20*pop;
  return Math.max(0, Math.min(1, s));
}
function statusFromScore(s) {
  return s >= 0.60 ? "yes" : s >= 0.40 ? "maybe" : "no";
}

// ---------- Deterministic planner (spacing, weekly cap, positive triggers) ----------
function planSchedule(weather, policy, today) {
  const out = [];
  let lastYesDate = null;
  let weekYes = 0;
  let curWeek = isoWeekNumber(weather[0].d);

  for (let i = 0; i < weather.length; i++) {
    const d = weather[i];
    const wk = isoWeekNumber(d.d);
    if (wk !== curWeek) { curWeek = wk; weekYes = 0; }

    // Hard "no" gates
    let status = "maybe";
    if (d.rain >= policy.rainSkip || d.rainPast3 >= policy.rainSkip3) status = "no";
    else if (d.rainNext3 >= 0.30) status = "no";
    else if (d.humidity >= policy.humidHigh && d.hiNext3 < policy.warmDay) status = "no";
    else if (weekYes >= policy.maxYesPerWeek) status = "no";
    else if (lastYesDate && daysBetweenISO(d.d, lastYesDate) <= policy.minGapDays) status = "no";
    // Cautious skip if POP is strong (likely rain today) even when amounts are low
    else if ((d.pop ?? 0) >= policy.popCaution && d.rain < 0.05 && d.rainNext3 < 0.20) status = "no";

    // Positive triggers (pre-score) for hot/dry spells
    if (status === "maybe") {
      const veryHotWave = d.hiNext3 >= policy.hotWave && d.rainNext3 < 0.20 && d.rainPast3 < policy.dryTrigger3 && d.humidity < policy.humidMod;
      const hotDryToday = d.hi >= policy.hotDay && d.rainPast3 < policy.dryTrigger3 && d.humidity < policy.humidHigh;
      if (veryHotWave || hotDryToday) status = "yes";
    }

    if (status === "maybe") status = statusFromScore(scoreDay(d));

    // Re-check spacing/cap before committing "yes"
    if (status === "yes") {
      if (weekYes >= policy.maxYesPerWeek) status = "no";
      if (lastYesDate && daysBetweenISO(d.d, lastYesDate) <= policy.minGapDays) status = "no";
    }

    if (status === "yes") { lastYesDate = d.d; weekYes += 1; }
    out.push({ date: d.d, status, score: +scoreDay(d).toFixed(2) });
  }

  // Integrity: never consecutive yes
  for (let i = 1; i < out.length; i++) {
    if (out[i-1].status === "yes" && out[i].status === "yes") out[i].status = "no";
  }

  // Target-yes nudge for hot/dry 7-day window (planning quality)
  const startIdx = weather.findIndex(x => x.d >= today);
  const endIdx = Math.min(weather.length - 1, startIdx + 6);
  if (startIdx >= 0) {
    const next7 = weather.slice(startIdx, endIdx + 1);
    const rain7 = next7.reduce((s, x) => s + x.rain, 0);
    const avgHi7 = Math.round(next7.reduce((s, x) => s + x.hi, 0) / next7.length);
    let yesCount7 = out.slice(startIdx, endIdx + 1).filter(x => x.status === "yes").length;

    if (rain7 < 0.25 && avgHi7 >= 84 && yesCount7 < 2) {
      const firstYes = out.slice(startIdx, endIdx + 1).findIndex(x => x.status === "yes");
      const lastYesDateIn7 = firstYes >= 0 ? out[startIdx + firstYes].date : null;
      for (let i = startIdx; i <= endIdx; i++) {
        const canUpgrade = out[i].status === "maybe" &&
          (!lastYesDateIn7 || daysBetweenISO(out[i].date, lastYesDateIn7) > policy.minGapDays);
        if (canUpgrade) { out[i].status = "yes"; yesCount7++; break; }
      }
    }
  }

  // Integrity again
  for (let i = 1; i < out.length; i++) {
    if (out[i-1].status === "yes" && out[i].status === "yes") out[i].status = "no";
  }

  return out;
}

// ---------- Build weather array (now includes wind + precip prob) ----------
function buildWeather(weatherData) {
  // Ensure chronological order
  const src = [...weatherData].sort((a, b) => a.date.localeCompare(b.date));

  const w = src.map(d => ({
    d: d.date,                               // YYYY-MM-DD
    hi: Math.round(d.temp_max),
    lo: Math.round(d.temp_min),
    rain: +(d.rain ?? 0).toFixed(2),        // inches
    humidity: Math.round(d.humidity ?? 0),  // %
    // NEW:
    wind: Math.round((d.wind_speed ?? 0) * 10) / 10,  // mph daily/afternoon mean if available
    pop: Math.round(d.precip_prob ?? 0),              // % probability of precip today

    // computed
    rainPast3: 0,
    hiNext3: 0,
    rainNext3: 0
  }));

  // Rolling sums & next-3 aggregates
  for (let i = 0; i < w.length; i++) {
    const past3 = w.slice(Math.max(0, i - 2), i + 1);
    w[i].rainPast3 = +past3.reduce((s, x) => s + x.rain, 0).toFixed(2);

    const next3 = w.slice(i, i + 3);
    w[i].hiNext3   = Math.round(next3.reduce((s, x) => s + x.hi, 0) / next3.length);
    w[i].rainNext3 = +next3.reduce((s, x) => s + x.rain, 0).toFixed(2);
  }
  return w;
}

// ---------- Public: main entry ----------
export async function getAIWateringAdvice(weatherData) {
  console.log("[AI Advice] Starting AI watering advice generation");
  console.log(`[AI Advice] Weather data contains ${weatherData.length} days`);

  if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI API key not configured");
  if (!process.env.WATER_GNOME_ASSISTANT_ID) throw new Error("Assistant ID not configured (set WATER_GNOME_ASSISTANT_ID)");

  const weather = buildWeather(weatherData);
  const weatherLen = weather.length;
  const today = getLocalDateString();

  // Policy (added POP & wind context thresholds)
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
    // NEW:
    popCaution: 60,   // % precip probability where we lean away from watering into likely rain
    windyMph: 12      // mph threshold used only for callouts/UX (scoring uses continuous wind)
  };

  // Plan deterministically
  const decisions = planSchedule(weather, policy, today);
  if (decisions.length !== weatherLen) throw new Error("Planner output length mismatch");

  // ----- Plan hints for Wynn (labels + callouts) -----
  function shortLabel(dateStr, tz = "America/New_York") {
    const date = new Date(dateStr + "T12:00:00Z");
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, weekday: "short", month: "numeric", day: "numeric"
    });
    return fmt.format(date).replace(",", ""); // "Sun 8/10"
  }
  const labels = Object.fromEntries(weather.map(d => [d.d, shortLabel(d.d)]));

  const startIdx = Math.max(0, weather.findIndex(x => x.d >= today));
  const endIdx = Math.min(weatherLen - 1, startIdx + 6);
  const next7Weather = weather.slice(startIdx, endIdx + 1);
  const next7Decisions = decisions.slice(startIdx, endIdx + 1);

  const yesDatesNext7 = next7Decisions.filter(d => d.status === "yes").map(d => d.date);
  const yesCountNext7 = yesDatesNext7.length;

  // Candidate second soak (if fewer than 2 planned yeses)
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

  // Callouts to help Wynn naturally name days (now includes windy)
  let heatPeak = null;
  for (let i = 0; i < next7Weather.length; i++) {
    const wd = next7Weather[i];
    if (!heatPeak || wd.hi > heatPeak.hi) heatPeak = { date: wd.d, hi: wd.hi };
  }
  const callouts = [];
  if (yesDatesNext7[0]) callouts.push({ date: yesDatesNext7[0], why: "planned soak" });
  if (candidateSecondYes) callouts.push({ date: candidateSecondYes, why: "possible second soak" });
  if (heatPeak?.date && heatPeak.hi >= 88) callouts.push({ date: heatPeak.date, why: "heat peak" });
  if (next7Weather[0]?.humidity >= 70) callouts.push({ date: next7Weather[0].d, why: "humid stretch" });
  const windy = next7Weather.find(d => (d.wind ?? 0) >= policy.windyMph);
  if (windy) callouts.push({ date: windy.d, why: "breezy afternoon" });

  const planHints = { yesDatesNext7, candidateSecondYes, yesCountNext7, labels, callouts };

  // ---------- Assistants API ----------
  try {
    const thread = await openai.beta.threads.create();
    const payload = { today, policy, weather, decisions, planHints };
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: JSON.stringify(payload)
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
                  advice: { type: "string", minLength: 6 },
                  soilMoisture: { type: "string" },
                  keyFactors: { type: "array", items: { type: "string" } }
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
    const ai = JSON.parse(content);

    // ---- Post-fixes (repair & enforce schedule) ----
    const decisionByDate = new Map(decisions.map(d => [d.date, d.status]));
    const inputDates = weather.map(d => d.d);

    if (!ai.weeklyAdvice) ai.weeklyAdvice = {};
    if (!ai.weeklyAdvice.daily) ai.weeklyAdvice.daily = [];

    const byDate = new Map();
    if (Array.isArray(ai.weeklyAdvice.daily)) {
      for (const it of ai.weeklyAdvice.daily) {
        if (it?.date) byDate.set(it.date, { ...it });
      }
    } else if (typeof ai.weeklyAdvice.daily === "object" && ai.weeklyAdvice.daily !== null) {
      for (const [date, it] of Object.entries(ai.weeklyAdvice.daily)) {
        byDate.set(date, { date, ...it });
      }
    }

    const fixedDaily = inputDates.map(date => {
      const have = byDate.get(date);
      const status = decisionByDate.get(date);
      if (have) {
        return {
          date,
          wateringStatus: status,
          reason: have.reason && have.reason.trim()
            ? have.reason
            : (status === "yes"
                ? "Deep soak planned; heat and dry spell ahead."
                : status === "maybe"
                ? "Borderline day; check top 2″ for dryness."
                : "Rest or humid stretch; soil likely holding moisture.")
        };
      }
      return {
        date,
        wateringStatus: status,
        reason: status === "yes"
          ? "Deep soak planned; heat and dry spell ahead."
          : status === "maybe"
          ? "Borderline day; check top 2″ for dryness."
          : "Rest or humid stretch; soil likely holding moisture."
      };
    });

    ai.weeklyAdvice.daily = fixedDaily;

    const todayRow =
      fixedDaily.find(d => d.date === today) ||
      fixedDaily.find(d => d.date > today) ||
      fixedDaily[fixedDaily.length - 1];

    if (!ai.todayAdvice) ai.todayAdvice = {};
    if (todayRow) ai.todayAdvice.shouldWater = todayRow.wateringStatus;

    if (lastRun?.usage) {
      console.log(`[AI Advice] Usage prompt=${lastRun.usage.prompt_tokens} completion=${lastRun.usage.completion_tokens}`);
    }
    console.log(`[AI Advice] Returned ${ai.weeklyAdvice.daily.length} days; today: ${ai.todayAdvice?.shouldWater}`);

    return ai;

  } catch (error) {
    console.error("[AI Advice] OpenAI API error:", error.message || error);
    console.error("[AI Advice] Full error details:", error);
    throw new Error("Failed to get AI watering advice");
  }
}

