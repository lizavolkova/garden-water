import OpenAI from 'openai';
import { fetchOpenWeatherData } from '../../utils/weather/openweather.js';
import { fetchNWSWeatherData } from '../../utils/weather/nws.js';
import { fetchOpenMeteoWeatherData } from '../../utils/weather/openmeteo.js';
import { fetchVisualCrossingWeatherData } from '../../utils/weather/visualcrossing.js';
//import { getLocalDateString } from '../../utils/weather/common.js';

// Debug environment variable loading
console.log('[DEBUG] OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('[DEBUG] OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length);
console.log('[DEBUG] OPENAI_API_KEY starts with:', process.env.OPENAI_API_KEY?.substring(0, 10));
console.log('[DEBUG] OPENAI_API_KEY ends with:', process.env.OPENAI_API_KEY?.substring(-10));
console.log('[DEBUG] Full API key:', process.env.OPENAI_API_KEY);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY?.trim(),
});

  // Helper: YYYY-MM-DD in your app's local zone (defaults to America/New_York)
  function getLocalDateString(tz = process.env.TZ || "America/New_York") {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
  }

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const zipCode = searchParams.get('zipCode');
  const weatherAPI = searchParams.get('weatherAPI') || 'openweather';
  const debug = searchParams.get('debug') === 'true';

  console.log(`[Weather API] New request - ZIP: ${zipCode}, API: ${weatherAPI}, Debug: ${debug}`);

  if (!zipCode) {
    console.error('[Weather API] ZIP code missing from request');
    return Response.json({ error: 'ZIP code is required' }, { status: 400 });
  }

  try {
    // Fetch weather data from selected API
    console.log(`[Weather API] Fetching weather data using ${weatherAPI} API`);
    let weatherData;
    const startTime = Date.now();
    
    switch (weatherAPI) {
      case 'nws':
        weatherData = await fetchNWSWeatherData(zipCode);
        break;
      case 'openmeteo':
        weatherData = await fetchOpenMeteoWeatherData(zipCode);
        break;
      case 'visualcrossing':
        weatherData = await fetchVisualCrossingWeatherData(zipCode);
        break;
      case 'openweather':
      default:
        weatherData = await fetchOpenWeatherData(zipCode);
        break;
    }
    
    const fetchTime = Date.now() - startTime;
    console.log(`[Weather API] Weather data fetched in ${fetchTime}ms using ${weatherAPI}`);
    
    // If debug mode, return raw weather data without AI analysis
    if (debug) {
      console.log(`[Weather API] Debug mode - returning raw weather data only (no AI tokens used)`);
      return Response.json({
        weather: weatherData,
        debug: true,
        api: weatherAPI,
        totalTime: fetchTime,
        serverToday: getLocalDateString(),
        serverTimezone: new Date().getTimezoneOffset(),
        serverTime: new Date().toString()
      });
    }
    
    // Get AI advice from OpenAI (only in non-debug mode)
    console.log('[Weather API] Requesting AI watering advice...');
    const aiStartTime = Date.now();
    
    // Get both the 7-day schedule and today's specific recommendation in one call
    const advice = await getAIWateringAdvice(weatherData);
    
    const aiTime = Date.now() - aiStartTime;
    console.log(`[Weather API] AI advice generated in ${aiTime}ms`);

    console.log(`[Weather API] Request completed successfully - Total time: ${Date.now() - startTime}ms`);
    return Response.json({
      weather: weatherData,
      advice: advice.weeklyAdvice,
      todayAdvice: advice.todayAdvice
    });
  } catch (error) {
    console.error('[Weather API] Error generating weather advice:', error.message || error);
    console.error('[Weather API] Full error stack:', error.stack);
    return Response.json({ error: error.message || 'Failed to generate weather advice' }, { status: 500 });
  }
}

// ---- Helpers: date utils & scoring ----
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
  
  // Fuzzy score (0..1)
  function scoreDay(d) {
    const heat = Math.max(0, (d.hi - 80) / 12);          // steeper: 92°F ⇒ ~1.0
    const dryness = 1 - Math.min(1, d.rainPast3 / 0.6);  // 0.6" saturates
    const humidityBrake = Math.min(1, d.humidity / 100);
    const rainSoon = Math.min(1, d.rainNext3 / 0.25);    // little forecast rain ⇒ low penalty
    let s = 0.55*heat + 0.45*dryness - 0.15*humidityBrake - 0.25*rainSoon;
    return Math.max(0, Math.min(1, s));
  }
  function statusFromScore(s) { return s >= 0.60 ? "yes" : s >= 0.40 ? "maybe" : "no"; }
  
 // Deterministic planner with positive triggers + spacing + weekly cap
function planSchedule(weather, policy, today) {
    const out = [];
    let lastYesDate = null;
    let weekYes = 0;
    let curWeek = isoWeekNumber(weather[0].d);
  
    for (let i = 0; i < weather.length; i++) {
      const d = weather[i];
      const wk = isoWeekNumber(d.d);
      if (wk !== curWeek) { curWeek = wk; weekYes = 0; }
  
      // --- Hard "no" gates first
      let status = "maybe";
      if (d.rain >= policy.rainSkip || d.rainPast3 >= policy.rainSkip3) status = "no";
      else if (d.rainNext3 >= 0.30) status = "no";
      else if (d.humidity >= policy.humidHigh && d.hiNext3 < policy.warmDay) status = "no";
      else if (weekYes >= policy.maxYesPerWeek) status = "no";
      else if (lastYesDate && daysBetweenISO(d.d, lastYesDate) <= policy.minGapDays) status = "no";
  
      // --- Positive "yes" triggers (pre-score)
      if (status === "maybe") {
        const veryHotWave = d.hiNext3 >= policy.hotWave && d.rainNext3 < 0.20 && d.rainPast3 < policy.dryTrigger3 && d.humidity < policy.humidMod;
        const hotDryToday = d.hi >= policy.hotDay && d.rainPast3 < policy.dryTrigger3 && d.humidity < policy.humidHigh;
        if (veryHotWave || hotDryToday) status = "yes";
      }
  
      // --- Fuzzy score if still undecided
      if (status === "maybe") status = statusFromScore(scoreDay(d));
  
      // --- Spacing & cap re-check before committing "yes"
      if (status === "yes") {
        if (weekYes >= policy.maxYesPerWeek) status = "no";
        if (lastYesDate && daysBetweenISO(d.d, lastYesDate) <= policy.minGapDays) status = "no";
      }
  
      if (status === "yes") { lastYesDate = d.d; weekYes += 1; }
      out.push({ date: d.d, status, score: +scoreDay(d).toFixed(2) });
    }
  
    // --- Integrity: never consecutive "yes"
    for (let i = 1; i < out.length; i++) {
      if (out[i-1].status === "yes" && out[i].status === "yes") out[i].status = "no";
    }
  
    // --- Target-yes nudge for hot/dry 7-day window (planning quality)
    const startIdx = weather.findIndex(x => x.d >= today);
    const endIdx = Math.min(weather.length - 1, startIdx + 6);
    if (startIdx >= 0) {
      const next7 = weather.slice(startIdx, endIdx + 1);
      const rain7 = next7.reduce((s, x) => s + x.rain, 0);
      const avgHi7 = Math.round(next7.reduce((s, x) => s + x.hi, 0) / next7.length);
      let yesCount7 = out.slice(startIdx, endIdx + 1).filter(x => x.status === "yes").length;
  
      if (rain7 < 0.25 && avgHi7 >= 84 && yesCount7 < 2) {
        // upgrade the earliest eligible "maybe" after spacing to "yes"
        const firstYes = out.slice(startIdx, endIdx + 1).findIndex(x => x.status === "yes");
        const lastYesDateIn7 = firstYes >= 0 ? out[startIdx + firstYes].date : null;
        for (let i = startIdx; i <= endIdx; i++) {
          const canUpgrade = out[i].status === "maybe" &&
            (!lastYesDateIn7 || daysBetweenISO(out[i].date, lastYesDateIn7) > policy.minGapDays);
          if (canUpgrade) { out[i].status = "yes"; yesCount7++; break; }
        }
      }
    }
  
    // ensure integrity again
    for (let i = 1; i < out.length; i++) {
      if (out[i-1].status === "yes" && out[i].status === "yes") out[i].status = "no";
    }
  
    return out;
  }

  
/**
 * Build the compact weather objects your Assistant expects:
 * d, hi, lo, rain, rainPast3, hiNext3, rainNext3, humidity
 * (oldest → newest)
 */
function buildWeather(weatherData) {
    // Ensure chronological order just in case
    const src = [...weatherData].sort((a, b) => a.date.localeCompare(b.date));
  
    // First pass: normalize + round
    const w = src.map(d => ({
      d: d.date,
      hi: Math.round(d.temp_max),
      lo: Math.round(d.temp_min),
      rain: +(d.rain ?? 0).toFixed(2),
      humidity: Math.round(d.humidity ?? 0),
      rainPast3: 0,
      hiNext3: 0,
      rainNext3: 0
    }));
  
    // Second pass: rolling sums & forward-looking aggregates
    for (let i = 0; i < w.length; i++) {
      const past3 = w.slice(Math.max(0, i - 2), i + 1);
      w[i].rainPast3 = +past3.reduce((s, x) => s + x.rain, 0).toFixed(2);
  
      const next3 = w.slice(i, i + 3);
      w[i].hiNext3   = Math.round(next3.reduce((s, x) => s + x.hi, 0) / next3.length);
      w[i].rainNext3 = +next3.reduce((s, x) => s + x.rain, 0).toFixed(2);
    }
    return w;
  }
  


  async function getAIWateringAdvice(weatherData) {
    console.log("[AI Advice] Starting AI watering advice generation");
    console.log(`[AI Advice] Weather data contains ${weatherData.length} days`);
  
    if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI API key not configured");
    if (!process.env.WATER_GNOME_ASSISTANT_ID) throw new Error("Assistant ID not configured (set WATER_GNOME_ASSISTANT_ID)");
  
    // Build the compact weather array your Assistant expects
    const weather = buildWeather(weatherData);
    const weatherLen = weather.length;
    console.log("[AI Advice] WEATHER:", weather);
    const today = getLocalDateString();
  
    // Policy
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
      humidMod: 50
    };
  
    // ---- Deterministic plan first ----
    const decisions = planSchedule(weather, policy, today);
    if (decisions.length !== weatherLen) throw new Error("Planner output length mismatch");
  
    // ---------- Plan hints (labels + callouts) ----------
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
  
    // Callouts to help Wynn naturally name days
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
  
      // poll
      let status = run.status, lastRun = run;
      while (!["completed","failed","cancelled","expired"].includes(status)) {
        await new Promise(r => setTimeout(r, 800));
        lastRun = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        status = lastRun.status;
      }
      if (status !== "completed") throw new Error(`Assistant run ended with status: ${status}`);
  
      // read + parse
      const msgs = await openai.beta.threads.messages.list(thread.id, { order: "desc", limit: 1 });
      const content = msgs.data[0]?.content?.find(c => c.type === "text")?.text?.value || "{}";
      const ai = JSON.parse(content);
  
      // ---- Post-fixes: keep schedule authoritative ----
      // If the model still returned < weatherLen items, REPAIR instead of throwing.
      const decisionByDate = new Map(decisions.map(d => [d.date, d.status]));
      const inputDates = weather.map(d => d.d);
  
      if (!ai.weeklyAdvice) ai.weeklyAdvice = {};
      if (!ai.weeklyAdvice.daily) ai.weeklyAdvice.daily = [];
  
      let daily = ai.weeklyAdvice.daily;
  
      // Normalize to a map by date so we can repair easily
      const byDate = new Map();
      if (Array.isArray(daily)) {
        for (const it of daily) {
          if (it?.date) byDate.set(it.date, { ...it });
        }
      } else if (typeof daily === "object" && daily !== null) {
        for (const [date, it] of Object.entries(daily)) {
          byDate.set(date, { date, ...it });
        }
      }
  
      // Build a fixed array in input order; fill any missing days from decisions
      const fixedDaily = inputDates.map(date => {
        const have = byDate.get(date);
        const status = decisionByDate.get(date);
        if (have) {
          return {
            date,
            wateringStatus: status, // enforce schedule
            reason: have.reason && have.reason.trim()
              ? have.reason
              : (status === "yes"
                  ? "Deep soak planned; heat and dry spell ahead."
                  : status === "maybe"
                  ? "Borderline day; check top 2″ for dryness."
                  : "Rest or humid stretch; soil likely holding moisture.")
          };
        }
        // synthesize a friendly default if model omitted the date
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
  
      // Sync todayAdvice.shouldWater with today's row
      const todayRow =
        fixedDaily.find(d => d.date === today) ||
        fixedDaily.find(d => d.date > today) ||
        fixedDaily[fixedDaily.length - 1];
  
      if (!ai.todayAdvice) ai.todayAdvice = {};
      if (todayRow) {
        ai.todayAdvice.shouldWater = todayRow.wateringStatus;
      }
  
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
  
