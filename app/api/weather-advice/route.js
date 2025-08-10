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
  
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }
    if (!process.env.WATER_GNOME_ASSISTANT_ID) {
      throw new Error("Assistant ID not configured (set WATER_GNOME_ASSISTANT_ID)");
    }
  
    // Build the compact weather array your Assistant expects
    const weather = buildWeather(weatherData);
    console.log("[AI Advice] WEATHER: ", weather)
    const today = getLocalDateString();
  
    // Numeric policy (tweak if you like; matches your prompt constants)
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
  
    try {
        // 1) Create a thread (reuse per user if you want history)
        const thread = await openai.beta.threads.create();
    
        // 2) Add just the small JSON payload (no long prompt here)
        const payload = { today, policy, weather };
        await openai.beta.threads.messages.create(thread.id, {
          role: "user",
          content: JSON.stringify(payload)
        });
    
        // 3) Run the saved Assistant
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
                            minItems: weatherData.length,
                            maxItems: weatherData.length,
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
    
        // 4) Poll until complete
        let status = run.status, lastRun = run;
        while (!["completed", "failed", "cancelled", "expired"].includes(status)) {
          await new Promise(r => setTimeout(r, 800));
          lastRun = await openai.beta.threads.runs.retrieve(thread.id, run.id);
          status = lastRun.status;
        }
        if (status !== "completed") {
          throw new Error(`Assistant run ended with status: ${status}`);
        }
    
        // 5) Read the latest assistant message and parse JSON
        const msgs = await openai.beta.threads.messages.list(thread.id, { order: "desc", limit: 1 });
        const content = msgs.data[0]?.content?.find(c => c.type === "text")?.text?.value || "{}";
        const aiResponse = JSON.parse(content);
    
        // (Optional) Log token usage if returned by the run
        if (lastRun?.usage) {
          console.log(`[AI Advice] Usage prompt=${lastRun.usage.prompt_tokens} completion=${lastRun.usage.completion_tokens}`);
        }
    
        console.log(`[AI Advice] Generated advice for ${aiResponse.weeklyAdvice?.daily?.length || 0} days; today: ${aiResponse.todayAdvice?.shouldWater}`);
        return aiResponse;
  } catch (error) {
    console.error('[AI Advice] OpenAI API error:', error.message || error);
    console.error('[AI Advice] Full error details:', error);
    throw new Error('Failed to get AI watering advice');
  }
}
