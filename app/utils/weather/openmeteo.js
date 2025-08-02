import { fetchLocationFromZipCode, getLocalDateString } from './common.js';

export async function fetchOpenMeteoWeatherData(zipCode) {
  console.log('[OpenMeteo] Starting weather data fetch for ZIP:', zipCode);
  
  try {
    // First, get coordinates from zip code using a geocoding service
    const { lat, lon } = await fetchLocationFromZipCode(zipCode);

    // Get extended forecast from Open-Meteo (3 days prior + 7 days future)
    console.log(`[OpenMeteo] Fetching extended forecast for coordinates: ${lat}, ${lon}`);
    const forecastResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&hourly=relative_humidity_2m&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=America%2FNew_York&past_days=3&forecast_days=7`
    );
    
    if (!forecastResponse.ok) {
      console.error('[OpenMeteo] Forecast fetch failed:', forecastResponse.status);
      console.error('[OpenMeteo] Response status text:', forecastResponse.statusText);
      
      // Try to get the error response body
      try {
        const errorText = await forecastResponse.text();
        console.error('[OpenMeteo] Error response body:', errorText);
      } catch (parseError) {
        console.error('[OpenMeteo] Could not parse error response:', parseError.message);
      }
      
      throw new Error('Failed to fetch Open-Meteo forecast');
    }
    
    const forecastData = await forecastResponse.json();
    console.log(`[OpenMeteo] Received forecast data for ${forecastData.daily.time.length} days`);
    
    // Process Open-Meteo forecast data
    const dailyData = processOpenMeteoForecastData(forecastData);
    console.log(`[OpenMeteo] Processed into ${dailyData.length} daily summaries`);
    
    return dailyData;
  } catch (error) {
    console.error('[OpenMeteo] API error:', error);
    throw new Error(`Open-Meteo API failed: ${error.message}`);
  }
}

function processOpenMeteoForecastData(forecastData) {
  console.log('[OpenMeteo] Processing daily forecast data');
  
  const daily = forecastData.daily;
  const hourly = forecastData.hourly;
  const dailyData = [];
  
  for (let i = 0; i < daily.time.length && i < 10; i++) {
    const date = daily.time[i]; // Already in YYYY-MM-DD format
    const tempMax = daily.temperature_2m_max[i] || 70;
    const tempMin = daily.temperature_2m_min[i] || 50;
    const rain = daily.precipitation_sum[i] || 0;
    
    // Calculate average humidity for this day from hourly data
    let humidity = 50; // default
    if (hourly && hourly.time && hourly.relative_humidity_2m) {
      const dayHumidities = [];
      for (let h = 0; h < hourly.time.length; h++) {
        if (hourly.time[h].startsWith(date)) {
          dayHumidities.push(hourly.relative_humidity_2m[h]);
        }
      }
      if (dayHumidities.length > 0) {
        humidity = Math.round(dayHumidities.reduce((a, b) => a + b, 0) / dayHumidities.length);
      }
    }
    
    console.log(`[OpenMeteo] Day ${i + 1} (${date}): ${tempMin}°F - ${tempMax}°F, ${humidity}% humidity, ${rain}" rain`);
    
    dailyData.push({
      date: date,
      temp_max: tempMax,
      temp_min: tempMin,
      humidity: humidity,
      description: rain > 0.1 ? 'light rain' : 'partly cloudy',
      rain: rain
    });
  }
  
  console.log(`[OpenMeteo] Created daily summaries for dates: ${dailyData.map(d => d.date).join(', ')}`);
  return dailyData;
}