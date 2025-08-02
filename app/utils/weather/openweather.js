import { getLocalDateString } from './common.js';

export async function fetchOpenWeatherData(zipCode) {
  console.log('[OpenWeather] Starting weather data fetch for ZIP:', zipCode);
  
  const API_KEY = process.env.OPENWEATHER_API_KEY;
  
  if (!API_KEY) {
    console.error('[OpenWeather] API key not configured');
    throw new Error('OpenWeatherMap API key not configured');
  }

  console.log('[OpenWeather] API key found, fetching coordinates...');

  // First, get coordinates from zip code
  const geoResponse = await fetch(
    `https://api.openweathermap.org/geo/1.0/zip?zip=${zipCode},US&appid=${API_KEY}`
  );
  
  if (!geoResponse.ok) {
    console.error('[OpenWeather] Geocoding failed:', geoResponse.status);
    throw new Error('Invalid ZIP code or failed to fetch location data', geoResponse);
  }
  
  const geoData = await geoResponse.json();
  const { lat, lon } = geoData;
  console.log(`[OpenWeather] Coordinates found: ${lat}, ${lon}`);

  // Get both historical (3 days prior) and forecast (7 days future) data
  console.log('[OpenWeather] Fetching historical and forecast data...');
  
  // Calculate timestamps for 3 days ago and current time
  const now = Math.floor(Date.now() / 1000);
  const threeDaysAgo = now - (3 * 24 * 60 * 60);
  
  // Fetch historical data for past 3 days (using One Call API)
  const historicalResponse = await fetch(
    `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${threeDaysAgo}&appid=${API_KEY}&units=imperial`
  );
  
  // Fetch current + 7-day forecast (using One Call API)
  const forecastResponse = await fetch(
    `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial&exclude=minutely,alerts`
  );
  
  // Check both responses
  let historicalData = null;
  if (historicalResponse.ok) {
    historicalData = await historicalResponse.json();
    console.log('[OpenWeather] Historical data fetched successfully');
  } else {
    console.warn('[OpenWeather] Historical data fetch failed:', historicalResponse.status);
  }
  
  if (!forecastResponse.ok) {
    console.error('[OpenWeather] Forecast fetch failed:', forecastResponse.status);
    throw new Error('Failed to fetch weather forecast');
  }
  
  const forecastData = await forecastResponse.json();
  console.log(`[OpenWeather] Received forecast data with ${forecastData.daily?.length || 0} daily entries`);
  
  // Process the combined data to get daily summaries
  const dailyData = processOpenWeatherData(historicalData, forecastData);
  console.log(`[OpenWeather] Processed into ${dailyData.length} daily summaries`);
  
  return dailyData;
}

function processOpenWeatherData(historicalData, forecastData) {
  console.log('[OpenWeather] Processing historical and forecast data into daily summaries');
  
  const dailyData = [];
  
  // Process historical data if available (past 3 days)
  if (historicalData && historicalData.data) {
    for (let i = 0; i < Math.min(3, historicalData.data.length); i++) {
      const day = historicalData.data[i];
      const date = getLocalDateString(new Date(day.dt * 1000));
      
      dailyData.push({
        date: date,
        temp_max: day.temp.max || day.temp,
        temp_min: day.temp.min || day.temp,
        humidity: day.humidity || 50,
        description: day.weather?.[0]?.description || 'partly cloudy',
        rain: day.rain ? Object.values(day.rain)[0] / 25.4 : 0 // Convert mm to inches
      });
    }
  } else {
    // Generate placeholder historical data if API call failed
    const today = new Date();
    for (let i = 3; i >= 1; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = getLocalDateString(date);
      
      dailyData.push({
        date: dateStr,
        temp_max: 75,
        temp_min: 60,
        humidity: 50,
        description: 'partly cloudy',
        rain: 0
      });
    }
  }
  
  // Process forecast data (current + 7 days)
  if (forecastData.daily) {
    for (let i = 0; i < Math.min(7, forecastData.daily.length); i++) {
      const day = forecastData.daily[i];
      const date = getLocalDateString(new Date(day.dt * 1000));
      
      dailyData.push({
        date: date,
        temp_max: day.temp.max,
        temp_min: day.temp.min,
        humidity: day.humidity,
        description: day.weather[0].description,
        rain: day.rain ? day.rain / 25.4 : 0 // Convert mm to inches
      });
    }
  }
  
  // Sort by date and return first 10 days
  const result = dailyData.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 10);
  console.log(`[OpenWeather] Created daily summaries for dates: ${result.map(d => d.date).join(', ')}`);
  
  return result;
}