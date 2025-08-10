import { fetchLocationFromZipCode, getLocalDateString } from './common.js';

export async function fetchNWSWeatherData(zipCode) {
  console.log('[NWS] Starting weather data fetch for ZIP:', zipCode);
  
  try {
    // First, get coordinates and location info from zip code using a geocoding service
    const { lat, lon, city, state } = await fetchLocationFromZipCode(zipCode);

    // Get NWS office and grid coordinates
    console.log(`[NWS] Getting grid information for coordinates: ${lat}, ${lon}`);
    const pointsResponse = await fetch(`https://api.weather.gov/points/${lat},${lon}`);
    if (!pointsResponse.ok) {
      console.error('[NWS] Failed to get grid information:', pointsResponse.status);
      throw new Error('Failed to get NWS grid information');
    }
    
    const pointsData = await pointsResponse.json();
    const forecastUrl = pointsData.properties.forecast;
    console.log('[NWS] Forecast URL obtained:', forecastUrl);

    // Get forecast data
    console.log('[NWS] Fetching forecast data...');
    const forecastResponse = await fetch(forecastUrl);
    if (!forecastResponse.ok) {
      console.error('[NWS] Forecast fetch failed:', forecastResponse.status);
      throw new Error('Failed to fetch NWS forecast');
    }
    
    const forecastData = await forecastResponse.json();
    console.log(`[NWS] Received ${forecastData.properties.periods.length} forecast periods`);
    
    // Process NWS forecast data and add historical placeholder data
    const dailyData = processNWSForecastData(forecastData);
    console.log(`[NWS] Processed into ${dailyData.length} daily summaries`);
    
    return {
      weather: dailyData,
      location: { city, state, zipCode }
    };
  } catch (error) {
    console.error('[NWS] API error:', error);
    throw new Error(`NWS API failed: ${error.message}`);
  }
}

function processNWSForecastData(forecastData) {
  console.log('[NWS] Processing forecast periods into daily summaries');
  
  const dailyData = [];
  
  // Add placeholder historical data (3 days prior) since NWS doesn't provide historical data
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
      description: 'partly cloudy (historical estimate)',
      rain: 0 // No historical rain data available
    });
  }
  
  const dailyMap = new Map();
  
  // NWS provides periods (day/night) instead of hourly data
  forecastData.properties.periods.forEach((period, index) => {
    const periodDate = new Date(period.startTime);
    // Use local timezone for date formatting
    const date = getLocalDateString(periodDate);
    
    console.log(`[NWS] Processing period ${index + 1}: ${period.name} (${date}) - ${period.temperature}°F, ${period.shortForecast}`);
    
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date: date,
        temp_max: period.temperature,
        temp_min: period.temperature,
        humidity: 50, // NWS doesn't provide humidity in basic forecast, using default
        description: period.shortForecast.toLowerCase(),
        rain: period.shortForecast.toLowerCase().includes('rain') ? 0.1 : 0, // Estimate rain
        isDaytime: period.isDaytime
      });
    } else {
      const existing = dailyMap.get(date);
      if (period.isDaytime) {
        existing.temp_max = Math.max(existing.temp_max, period.temperature);
      } else {
        existing.temp_min = Math.min(existing.temp_min, period.temperature);
      }
      // Update description to include both day and night info
      if (!existing.description.includes(period.shortForecast.toLowerCase())) {
        existing.description += `, ${period.shortForecast.toLowerCase()}`;
      }
      // Update rain estimate
      if (period.shortForecast.toLowerCase().includes('rain') || 
          period.shortForecast.toLowerCase().includes('showers')) {
        existing.rain = Math.max(existing.rain, 0.1);
      }
    }
  });
  
  // Add forecast data to the historical data
  const forecastDays = Array.from(dailyMap.values()).slice(0, 7);
  dailyData.push(...forecastDays);
  
  // Sort by date and return first 10 days
  const result = dailyData.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 10);
  console.log(`[NWS] Created daily summaries for dates: ${result.map(d => d.date).join(', ')}`);
  console.log(`[NWS] Today should be: ${getLocalDateString()}`);
  console.log(`[NWS] Result array length: ${result.length}`);
  
  return result;
}
