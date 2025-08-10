import { fetchOpenWeatherData } from '../../utils/weather/openweather.js';
import { fetchNWSWeatherData } from '../../utils/weather/nws.js';
import { fetchOpenMeteoWeatherData } from '../../utils/weather/openmeteo.js';
import { fetchVisualCrossingWeatherData } from '../../utils/weather/visualcrossing.js';
import { getAIWateringAdvice } from '../../utils/openai.js';

// Debug environment variable loading
console.log('[DEBUG] OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('[DEBUG] OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length);
console.log('[DEBUG] OPENAI_API_KEY starts with:', process.env.OPENAI_API_KEY?.substring(0, 10));
console.log('[DEBUG] OPENAI_API_KEY ends with:', process.env.OPENAI_API_KEY?.substring(-10));
console.log('[DEBUG] Full API key:', process.env.OPENAI_API_KEY);

// Helper: YYYY-MM-DD in your app's local zone (defaults to America/New_York)
function getLocalDateString(tz = process.env.TZ || "America/New_York") {
  // Handle case where TZ might have a colon prefix (e.g., ":UTC" instead of "UTC")
  if (tz && tz.startsWith(':')) {
    tz = tz.substring(1);
  }
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
    let weatherResponse;
    let weatherData;
    let locationData = null;
    const startTime = Date.now();
    
    switch (weatherAPI) {
      case 'nws':
        weatherResponse = await fetchNWSWeatherData(zipCode);
        break;
      case 'openmeteo':
        weatherResponse = await fetchOpenMeteoWeatherData(zipCode);
        break;
      case 'visualcrossing':
        weatherResponse = await fetchVisualCrossingWeatherData(zipCode);
        break;
      case 'openweather':
      default:
        weatherResponse = await fetchOpenWeatherData(zipCode);
        break;
    }
    
    // Handle both old format (array) and new format (object with weather and location)
    if (Array.isArray(weatherResponse)) {
      // Old format - just weather data
      weatherData = weatherResponse;
    } else {
      // New format - extract weather data and location info
      weatherData = weatherResponse.weather;
      locationData = weatherResponse.location;
    }
    
    const fetchTime = Date.now() - startTime;
    console.log(`[Weather API] Weather data fetched in ${fetchTime}ms using ${weatherAPI}`);
    
    // If debug mode, return raw weather data without AI analysis
    if (debug) {
      console.log(`[Weather API] Debug mode - returning raw weather data only (no AI tokens used)`);
      return Response.json({
        weather: weatherData,
        location: locationData,
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
      location: locationData,
      advice: advice.weeklyAdvice,
      todayAdvice: advice.todayAdvice
    });
  } catch (error) {
    console.error('[Weather API] Error generating weather advice:', error.message || error);
    console.error('[Weather API] Full error stack:', error.stack);
    return Response.json({ error: error.message || 'Failed to generate weather advice' }, { status: 500 });
  }
}
  
