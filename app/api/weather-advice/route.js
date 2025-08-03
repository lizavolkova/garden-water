import OpenAI from 'openai';
import { fetchOpenWeatherData } from '../../utils/weather/openweather.js';
import { fetchNWSWeatherData } from '../../utils/weather/nws.js';
import { fetchOpenMeteoWeatherData } from '../../utils/weather/openmeteo.js';
import { fetchVisualCrossingWeatherData } from '../../utils/weather/visualcrossing.js';
import { getLocalDateString } from '../../utils/weather/common.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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


async function getAIWateringAdvice(weatherData) {
  console.log('[AI Advice] Starting AI watering advice generation');
  console.log(`[AI Advice] Weather data contains ${weatherData.length} days of data`);
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('[AI Advice] OpenAI API key not configured');
    throw new Error('OpenAI API key not configured');
  }

  // BEFORE calling the model, build richer daily objects:
const daily = weatherData.map(d => ({
    date: d.date,                         // "2025-08-01"
    tMaxF: Math.round(d.temp_max),
    tMinF: Math.round(d.temp_min),
    humidity: d.humidity,                 // %
    rainIn: +d.rain.toFixed(2),           // inches
  }));
  
  // Add a 3-day rolling rain total to each object
  daily.forEach((d, i) => {
    const last3 = daily.slice(Math.max(0, i - 2), i + 1)
                       .reduce((s, x) => s + x.rainIn, 0);
    d.rain3dIn = +last3.toFixed(2);
  });
  

function buildWeather(data) {
    // data = [{date, temp_max, temp_min, rain}, …] oldest→newest
    const w = data.map(d => ({
      d:  d.date,
      hi: Math.round(d.temp_max),
      lo: Math.round(d.temp_min),
      rain: +d.rain.toFixed(2),   // today’s rain
      rainPast3: 0,
      hiNext3:   0,
      rainNext3: 0
    }));
  
    // compute rolling sums & forward-looking metrics
    for (let i = 0; i < w.length; i++) {
      // ─── rainPast3 ───
      const past3 = w.slice(Math.max(0, i - 2), i + 1);
      w[i].rainPast3 = +past3.reduce((s, x) => s + x.rain, 0).toFixed(2);
  
      // ─── next-3-day aggregates ───
      const next3 = w.slice(i, i + 3);
      w[i].hiNext3   = Math.round(next3.reduce((s, x) => s + x.hi, 0) / next3.length);
      w[i].rainNext3 = +next3.reduce((s, x) => s + x.rain, 0).toFixed(2);
    }
    return w;
  }
  
  const weather = buildWeather(weatherData);   // ← ready for prompt
  
  
  /* ---------- ENHANCED PROMPT FOR BOTH WEEKLY AND TODAY ---------- */
  const today = getLocalDateString(); // YYYY-MM-DD format in local timezone

  const prompt = `
  # =====================  SYSTEM MESSAGE  =====================
You are a friendly garden gnome—think Tom Bombadil, but brief.  
Keep language light and cheery, never flowery or poetic.  
Avoid slang or colloquial phrases such as “check it out,” “gonna,” “cool,” etc.
**NEVER use an exclamation mark (!) in any field unless explicitly allowed.**
Return **valid JSON only** – no prose outside JSON.

# ======================  USER MESSAGE  ======================
# Context
• Today : ${today}

# Input  (chronological array, past → future)
${JSON.stringify(weather)}
Return exactly one “daily” object for **every** element in the input.
All text fields must follow the whimsical tone in the system message.

Fields per day:  
d, hi, lo, rain, rainPast3, hiNext3, rainNext3, humidity   <!-- new field -->

# Constants
maxYesPerWeek = 3
minGapDays    = 2       # never water on consecutive days
rainSkip      = 0.30    # inches today
rainSkip3     = 0.60    # inches past 3 days
dryTrigger3   = 0.20
hotWave       = 88      # °F avg hiNext3
hotDay        = 85
warmDay       = 80
coolDay       = 75
humidHigh     = 70      # % RH marks slow evaporation
humidMod      = 50

# Decision logic (first match wins)
0 if rain ≥ rainSkip OR rainPast3 ≥ rainSkip3                  → "no"
1 if rainNext3 ≥ 0.30                                          → "no"
2 if humidity ≥ humidHigh AND hiNext3 < warmDay                → "no"
3 if weekYes ≥ maxYesPerWeek                                   → "no"
4 if daysSinceLastYes ≤ minGapDays                             → "no"
5 if hiNext3 ≥ hotWave AND rainNext3 < 0.20
     AND rainPast3 < dryTrigger3 AND humidity < humidMod       → "yes"
6 if hi ≥ hotDay AND rainPast3 < dryTrigger3
     AND humidity < humidMod                                   → "yes"
7 otherwise                                                    → "maybe"

Process days chronologically, maintaining:
state = { lastYesDate:null, weekYes:0 }
After "yes": lastYesDate = today, weekYes += 1
Reset weekYes when ISO-week changes.
⇒ reason = quick friendly note.  
⇒ advice = practical how-to, written as instructions.
weeklyAdvice.daily MUST contain exactly one object for EACH record in the input array, including past days and today, in the same order.
→ weekSummary should help the user plan at a glance; think “forecast headline,” not pep talk.

# Output (JSON only)
{
  "weeklyAdvice": {
    "weekSummary": "1–2 plain sentences that tell the gardener what to expect between today and seven days out: likely watering count, main rain or heat patterns, and any special note (e.g., mid-week heat wave). No mention of who made the decision.",
    "daily": [
      { "date":"YYYY-MM-DD",
        "wateringStatus":"yes|maybe|no",
        "reason":"≤20 playful words, emoji welcome, NO \"!\" character" }
    ]
  },
  "todayAdvice": {
    "shouldWater": "(copy wateringStatus for ${today})",
    "confidence": "high|medium|low",
    "reason": "≤15 friendly words; playful, *no slang*, no poetry, no \"!\"",
    "advice":  "≤45 words, step-by-step teaching. Explain any test you mention (e.g. finger-test = push finger 2\" deep; water only if dry). Avoid jargon; keep sentences short.",
    "soilMoisture": "likely dry|moderately moist|saturated",
    "keyFactors": ["rainPast3","hiNext3","rainNext3","humidity","gap","weekly cap"]
  }
}
# ============================================================


  `;
   // keep tight, no blank lines


try {
  console.log('[AI Advice] Sending request to OpenAI API...');
  console.log(`[AI Advice] Prompt length: ${prompt.length} characters`);
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.25,          // lower randomness = fewer surprises
    max_tokens: 800,           // increased for both responses
    messages: [
      { role: "system",
        content: "You are an expert vegetable-garden assistant. Reply with VALID JSON only." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  });

  console.log(`[AI Advice] Received response from OpenAI. Usage - prompt tokens: ${completion.usage?.prompt_tokens}, completion tokens: ${completion.usage?.completion_tokens}`);
  
  const aiResponse = JSON.parse(completion.choices[0].message.content);
  console.log(`[AI Advice] Generated advice for ${aiResponse.weeklyAdvice?.daily?.length || 0} days and today's assessment: ${aiResponse.todayAdvice?.shouldWater}`);
  
  return aiResponse;
  } catch (error) {
    console.error('[AI Advice] OpenAI API error:', error.message || error);
    console.error('[AI Advice] Full error details:', error);
    throw new Error('Failed to get AI watering advice');
  }
}


// UNIFIED LOGIC (apply to BOTH 7-day schedule AND today's assessment):
// 1 Max ${rules.maxDays} yes per ISO-week (Mon-Sun).
// 2 No yes if (today − lastYesDate) ≤ ${rules.minGap} days.
// 3 Skip if rain ≥ ${rules.rainSkip} **OR** rainPast3 ≥ ${rules.rainSkip3}.
// 4 NEVER water if significant rain in past 24-48 hours (≥0.5" total)
// 5 NEVER water if today's forecast shows ≥0.3" rain  
// 6 Cool days (<75°F) with recent rain (≥0.3" in past 2 days) = definitely no watering
// 7 Hot days (≥85°F) may justify watering ONLY if no recent rain AND rules 1-3 satisfied
// 8 Else maybe (check soil moisture first)

// IMPORTANT VEGETABLE GARDEN WATERING PRINCIPLES:
// - Most vegetables need 1-1.5 inches of water per week (including rainfall)
// - Deep, infrequent watering (2-3 times per week) is better than daily shallow watering
// - Deep watering encourages strong root development and drought resistance
// - Skip watering if soil is still moist from previous watering or recent rain
// - Consider cumulative rainfall over 3-7 days, not just daily amounts
// - Hot, windy days increase water needs; cool, humid days reduce them
// - Recent heavy rain keeps soil moist for 2-3 days depending on temperature

// STRICT WATERING RULES (MUST BE IDENTICAL FOR BOTH ANALYSES):
// 1. NEVER recommend watering on consecutive days
// 2. Maximum 3 watering days per week, ideally 2 days per week  
// 3. If recent rain ≥ 0.5" in past 2 days → wateringStatus = "no" for that day
// 4. After any "yes" watering day, next day must be "no" (minimum 1 day gap)
// 5. Cool days (temp_max < 75°F) with recent rain (≥0.3" in past 2 days) = definitely "no"
// 6. Each watering should be deep and thorough, not light surface watering

// CONSISTENCY REQUIREMENT: 
// - The "shouldWater" in todayAdvice MUST exactly match the "wateringStatus" for ${today} in daily
// - If 7-day schedule says "no" for today, todayAdvice must say "no"  
// - If 7-day schedule says "yes" for today, todayAdvice must say "yes"
// - If 7-day schedule says "maybe" for today, todayAdvice must say "maybe"



// ----------------------------------------
// const weatherSummary = weatherData.map(day => ({
//     date: day.date,                         // "YYYY-MM-DD"
//     temp_max: Math.round(day.temp_max),     // °F
//     temp_min: Math.round(day.temp_min),     // °F
//     humidity: day.humidity,                 // %
//     rain: +day.rain.toFixed(2),             // inches
//     description: day.description
//   }));
  
//   // Calculate 3-day rolling rainfall for cumulative moisture
//   weatherSummary.forEach((d, i) => {
//     const last3 = weatherSummary
//       .slice(Math.max(0, i - 2), i + 1)
//       .reduce((s, x) => s + x.rain, 0);
//     d.rain_3day = +last3.toFixed(2);
//   });
  
//   const prompt = `Given this 7-day weather forecast for a vegetable garden, provide daily watering recommendations based on proper vegetable gardening best practices:
  
//   WEATHER DATA (JSON):
//   ${JSON.stringify(weatherSummary, null, 2)}
  
//   IMPORTANT VEGETABLE GARDEN WATERING PRINCIPLES:
//   - Most vegetables need 1-1.5 inches of water per week (including rainfall)
//   - Deep, infrequent watering (2-3 times per week) is better than daily shallow watering
//   - Deep watering encourages strong root development and drought resistance
//   - Daily watering creates shallow roots and weak plants
//   - Water early morning (6-10 AM) to reduce evaporation and disease
//   - Skip watering if soil is still moist from previous watering or recent rain
//   - Consider cumulative rainfall over 3-7 days, not just daily amounts
//   - Hot, windy days increase water needs; cool, humid days reduce them
//   - Newly planted seeds/seedlings may need more frequent watering initially
  
//   STRICT WATERING RULES TO FOLLOW:
//   1. NEVER recommend watering on consecutive days - always skip at least 1 day between waterings
//   2. Maximum 3 watering days per week, ideally 2 days per week
//   3. If today's rain >= 0.5" OR 3-day total rain >= 1.0" → wateringStatus = "no"
//   4. After any "yes" watering day, the next day must be "no" (minimum 1 day gap)
//   5. Ideal pattern: Water Monday, skip Tuesday, water Wednesday, skip Thursday/Friday, water Saturday, skip Sunday
//   6. Hot days (temp_max >= 85°F) may justify closer spacing but NEVER consecutive days
//   7. Cool days (temp_max < 70°F) should have 2-3 day gaps between watering
//   8. Each watering should be deep and thorough, not light surface watering
  
//   Return your response as a JSON object with this exact structure:
//   {
//     "weekSummary": "Brief overall recommendation for the week including total water needs",
//     "dailyRecommendations": [
//       {
//         "date": "YYYY-MM-DD",
//         "wateringStatus": "yes/maybe/no",
//         "reason": "Brief explanation considering soil moisture, recent watering, and weather"
//       }
//     ]
//   }
  
//   WATERING STATUS GUIDELINES:
//   - "yes": Definite watering needed BUT ONLY if no watering yesterday (hot weather, 3+ days since last watering, no recent rain)
//   - "maybe": Consider watering depending on soil moisture (moderate conditions, 2+ days since watering, check soil first)
//   - "no": Do not water (recent rain, cool weather, adequate soil moisture, OR watered yesterday)
  
//   EXAMPLES OF PROPER WEEKLY PATTERNS:
//   - Monday: yes, Tuesday: no, Wednesday: maybe, Thursday: no, Friday: no, Saturday: yes, Sunday: no
//   - Monday: no, Tuesday: yes, Wednesday: no, Thursday: no, Friday: yes, Saturday: no, Sunday: no
//   - Monday: maybe, Tuesday: no, Wednesday: no, Thursday: yes, Friday: no, Saturday: no, Sunday: yes
  
//   CRITICAL: When generating the daily recommendations, review the entire 7-day sequence to ensure:
//   - No consecutive "yes" days
//   - Maximum 3 watering days total in the week
//   - At least 1 day gap between any "yes" recommendations
//   - Prioritize deep, infrequent watering over frequent shallow watering
  
//   Focus on deep, infrequent watering that promotes healthy root development. Output ONLY valid JSON.`;

//   try {
//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         {
//           role: "system",
//           content: "You are an expert gardening assistant specializing in vegetable garden care. You must respond with valid JSON only."
//         },
//         {
//           role: "user",
//           content: prompt
//         }
//       ],
//       max_tokens: 800,
//       temperature: 0.6,
//       response_format: { type: "json_object" }
//     });



//     return JSON.parse(completion.choices[0].message.content);
