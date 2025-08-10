import { fetchLocationFromZipCode, generateDemoWeatherData, getLocalDateString } from './common.js';

export async function fetchVisualCrossingWeatherData(zipCode) {
  console.log('[VisualCrossing] Starting weather data fetch for ZIP:', zipCode);
  
  try {
    // Visual Crossing API requires an API key - for demo purposes, we'll use a similar approach to Open-Meteo
    // In production, you'd need to set VISUAL_CROSSING_API_KEY environment variable
    const API_KEY = process.env.VISUAL_CROSSING_API_KEY || 'demo'; // Demo key for testing
    console.log(`[VisualCrossing] Using API key: ${API_KEY === 'demo' ? 'demo (fallback mode)' : 'configured'}`);
    
    // First, get coordinates from zip code
    const { lat, lon } = await fetchLocationFromZipCode(zipCode);

    // Get extended forecast from Visual Crossing (3 days prior + 7 days future)
    console.log(`[VisualCrossing] Fetching extended forecast for coordinates: ${lat}, ${lon}`);
    
    // Calculate dates for 3 days ago to 7 days from now
    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);
    
    const startDate = getLocalDateString(threeDaysAgo);
    const endDate = getLocalDateString(sevenDaysFromNow);
    
    const apiUrl = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lon}/${startDate}/${endDate}?unitGroup=us&key=${API_KEY}&contentType=json&include=days`;
    console.log('[VisualCrossing] Making API request to:', apiUrl.replace(API_KEY, 'REDACTED_KEY'));
    
    const forecastResponse = await fetch(apiUrl);
    
    console.log('[VisualCrossing] API response status:', forecastResponse.status);
    console.log('[VisualCrossing] API response headers:', Object.fromEntries(forecastResponse.headers.entries()));
    
    if (!forecastResponse.ok) {
      const errorText = await forecastResponse.text();
      console.error('[VisualCrossing] API request failed. Status:', forecastResponse.status);
      console.error('[VisualCrossing] Error response:', errorText);
      console.warn('[VisualCrossing] Falling back to demo data');
      // Fallback to demo data if API key is not valid
      return generateDemoWeatherData();
    }
    
    const forecastData = await forecastResponse.json();
    console.log(`[VisualCrossing] Received forecast data for ${forecastData.days?.length || 0} days`);
    console.log('[VisualCrossing] Sample response structure:', JSON.stringify(forecastData, null, 2).substring(0, 500) + '...');
    
    // Process Visual Crossing forecast data
    const dailyData = processVisualCrossingForecastData(forecastData);
    console.log(`[VisualCrossing] Processed into ${dailyData.length} daily summaries`);
    
    return dailyData;
  } catch (error) {
    console.error('[VisualCrossing] API error:', error);
    console.log('[VisualCrossing] Falling back to demo data');
    // Return demo data as fallback
    return generateDemoWeatherData();
  }
}

function processVisualCrossingForecastData(forecastData) {
  console.log('[VisualCrossing] Processing daily forecast data');
  
  const dailyData = [];
  
  for (let i = 0; i < forecastData.days.length && i < 10; i++) {
    const day = forecastData.days[i];
    const tempMax = day.tempmax || 70;
    const tempMin = day.tempmin || 50;
    const humidity = day.humidity || 50;
    const rain = day.precip || 0; // Already in inches
    const precipProb = day.precipprob || 0; // Precipitation probability (0-100%)
    const windSpeed = day.windspeed || 0; // Wind speed in mph
    const description = day.conditions?.toLowerCase() || 'partly cloudy';
    
    console.log(`[VisualCrossing] Day ${i + 1} (${day.datetime}): ${tempMin}°F - ${tempMax}°F, ${humidity}% humidity, ${rain}" rain (${precipProb}% chance), ${windSpeed} mph wind, ${description}`);
    
    dailyData.push({
      date: day.datetime, // Already in YYYY-MM-DD format
      temp_max: tempMax,
      temp_min: tempMin,
      humidity: humidity,
      description: description,
      rain: rain,
      precip_prob: precipProb,
      wind_speed: windSpeed
    });
  }
  
  console.log(`[VisualCrossing] Created daily summaries for dates: ${dailyData.map(d => d.date).join(', ')}`);
  return dailyData;
}