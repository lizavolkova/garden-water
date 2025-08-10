// Utility function to get local date in YYYY-MM-DD format (not UTC)
export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function fetchLocationFromZipCode(zipCode) {
  console.log(`[Weather Utils] Fetching location data for ZIP code: ${zipCode}`);
  
  const geoResponse = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
  if (!geoResponse.ok) {
    console.error(`[Weather Utils] Failed to fetch location data for ZIP ${zipCode}:`, geoResponse.status);
    throw new Error('Invalid ZIP code or failed to fetch location data');
  }
  
  const geoData = await geoResponse.json();
  const lat = parseFloat(geoData.places[0].latitude);
  const lon = parseFloat(geoData.places[0].longitude);
  const city = geoData.places[0]['place name'];
  const state = geoData.places[0].state;
  
  console.log(`[Weather Utils] Location found: ${city}, ${state} (${lat}, ${lon})`);
  
  return { lat, lon, city, state, geoData };
}

export function generateDemoWeatherData() {
  console.log('[Weather Utils] Generating demo weather data');
  
  const today = new Date();
  const dailyData = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateString = getLocalDateString(date);
    
    // Generate some demo weather data
    const baseTemp = 70 + Math.sin(i * 0.5) * 10;
    const rain = Math.random() > 0.7 ? Math.random() * 0.5 : 0;
    
    dailyData.push({
      date: dateString,
      temp_max: Math.round(baseTemp + 10),
      temp_min: Math.round(baseTemp - 10),
      humidity: Math.round(40 + Math.random() * 40),
      description: rain > 0.1 ? 'light rain' : 'partly cloudy',
      rain: rain
    });
  }
  
  console.log(`[Weather Utils] Generated ${dailyData.length} days of demo data`);
  return dailyData;
}
