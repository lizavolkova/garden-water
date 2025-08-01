import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function fetchLocationFromZipCode(zipCode) {
  const geoResponse = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
  if (!geoResponse.ok) {
    throw new Error('Invalid ZIP code or failed to fetch location data');
  }
  
  const geoData = await geoResponse.json();
  const lat = parseFloat(geoData.places[0].latitude);
  const lon = parseFloat(geoData.places[0].longitude);
  
  return { lat, lon, geoData };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const zipCode = searchParams.get('zipCode');
  const weatherAPI = searchParams.get('weatherAPI') || 'openweather';

  if (!zipCode) {
    return Response.json({ error: 'ZIP code is required' }, { status: 400 });
  }

  try {
    // Fetch weather data from selected API
    let weatherData;
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
    
    // Get AI advice from OpenAI
    const advice = await getAIWateringAdvice(weatherData);

    return Response.json({
      weather: weatherData,
      advice: advice
    });
  } catch (error) {
    console.error('Error generating weather advice:', error);
    return Response.json({ error: error.message || 'Failed to generate weather advice' }, { status: 500 });
  }
}

async function fetchOpenWeatherData(zipCode) {
  const API_KEY = process.env.OPENWEATHER_API_KEY;
  
  if (!API_KEY) {
    throw new Error('OpenWeatherMap API key not configured');
  }

  // First, get coordinates from zip code
  const geoResponse = await fetch(
    `https://api.openweathermap.org/geo/1.0/zip?zip=${zipCode},US&appid=${API_KEY}`
  );
  
  if (!geoResponse.ok) {
    throw new Error('Invalid ZIP code or failed to fetch location data', geoResponse);
  }
  
  const geoData = await geoResponse.json();
  const { lat, lon } = geoData;

  // Get 5-day forecast in imperial units (Fahrenheit)
  const forecastResponse = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial`
  );
  
  if (!forecastResponse.ok) {
    throw new Error('Failed to fetch weather forecast');
  }
  
  const forecastData = await forecastResponse.json();
  
  // Process the forecast data to get daily summaries
  const dailyData = processForecastData(forecastData);
  
  return dailyData;
}

function processForecastData(forecastData) {
  const dailyMap = new Map();
  
  forecastData.list.forEach(item => {
    const forecastDate = new Date(item.dt * 1000);
    const date = forecastDate.toDateString();
    
    // Use local timezone for date formatting instead of UTC
    const localDateString = new Date(forecastDate.getTime() - (forecastDate.getTimezoneOffset() * 60000))
      .toISOString().split('T')[0];
    
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date: localDateString,
        temp_max: item.main.temp_max,
        temp_min: item.main.temp_min,
        humidity: item.main.humidity,
        description: item.weather[0].description,
        rain: item.rain ? (item.rain['3h'] || 0) / 25.4 : 0, // Convert mm to inches
        readings: 1
      });
    } else {
      const existing = dailyMap.get(date);
      existing.temp_max = Math.max(existing.temp_max, item.main.temp_max);
      existing.temp_min = Math.min(existing.temp_min, item.main.temp_min);
      existing.humidity = (existing.humidity + item.main.humidity) / 2;
      existing.rain += item.rain ? (item.rain['3h'] || 0) / 25.4 : 0;
      existing.readings += 1;
    }
  });
  
  return Array.from(dailyMap.values()).slice(0, 7); // Return first 7 days
}

async function fetchNWSWeatherData(zipCode) {
  try {
    // First, get coordinates from zip code using a geocoding service
    const { lat, lon } = await fetchLocationFromZipCode(zipCode);

    // Get NWS office and grid coordinates
    const pointsResponse = await fetch(`https://api.weather.gov/points/${lat},${lon}`);
    if (!pointsResponse.ok) {
      throw new Error('Failed to get NWS grid information');
    }
    
    const pointsData = await pointsResponse.json();
    const forecastUrl = pointsData.properties.forecast;

    // Get forecast data
    const forecastResponse = await fetch(forecastUrl);
    if (!forecastResponse.ok) {
      throw new Error('Failed to fetch NWS forecast');
    }
    
    const forecastData = await forecastResponse.json();
    
    // Process NWS forecast data
    const dailyData = processNWSForecastData(forecastData);
    
    return dailyData;
  } catch (error) {
    console.error('NWS API error:', error);
    throw new Error(`NWS API failed: ${error.message}`);
  }
}

function processNWSForecastData(forecastData) {
  const dailyMap = new Map();
  
  // NWS provides periods (day/night) instead of hourly data
  forecastData.properties.periods.forEach(period => {
    const periodDate = new Date(period.startTime);
    // Use local timezone for date formatting instead of UTC
    const date = new Date(periodDate.getTime() - (periodDate.getTimezoneOffset() * 60000))
      .toISOString().split('T')[0];
    
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
  
  return Array.from(dailyMap.values()).slice(0, 7); // Return first 7 days
}

async function fetchOpenMeteoWeatherData(zipCode) {
  try {
    // First, get coordinates from zip code using a geocoding service
    const { lat, lon } = await fetchLocationFromZipCode(zipCode);

    // Get 7-day forecast from Open-Meteo
    const forecastResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=America%2FNew_York&past_days=0&forecast_days=7`
    );
    
    if (!forecastResponse.ok) {
      throw new Error('Failed to fetch Open-Meteo forecast');
    }
    
    const forecastData = await forecastResponse.json();
    
    // Process Open-Meteo forecast data
    const dailyData = processOpenMeteoForecastData(forecastData);
    
    return dailyData;
  } catch (error) {
    console.error('Open-Meteo API error:', error);
    throw new Error(`Open-Meteo API failed: ${error.message}`);
  }
}

function processOpenMeteoForecastData(forecastData) {
  const daily = forecastData.daily;
  const dailyData = [];
  
  for (let i = 0; i < daily.time.length && i < 7; i++) {
    const date = daily.time[i]; // Already in YYYY-MM-DD format
    
    dailyData.push({
      date: date,
      temp_max: daily.temperature_2m_max[i] || 70,
      temp_min: daily.temperature_2m_min[i] || 50,
      humidity: daily.relative_humidity_2m[i] || 50,
      description: daily.precipitation_sum[i] > 0.1 ? 'light rain' : 'partly cloudy',
      rain: daily.precipitation_sum[i] || 0
    });
  }
  
  return dailyData;
}

async function fetchVisualCrossingWeatherData(zipCode) {
  try {
    // Visual Crossing API requires an API key - for demo purposes, we'll use a similar approach to Open-Meteo
    // In production, you'd need to set VISUAL_CROSSING_API_KEY environment variable
    const API_KEY = process.env.VISUAL_CROSSING_API_KEY || 'demo'; // Demo key for testing
    
    // First, get coordinates from zip code
    const { lat, lon } = await fetchLocationFromZipCode(zipCode);

    // Get 7-day forecast from Visual Crossing
    const forecastResponse = await fetch(
      `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lon}/next7days?unitGroup=us&key=${API_KEY}&contentType=json&include=days`
    );
    
    if (!forecastResponse.ok) {
      // Fallback to demo data if API key is not valid
      return generateDemoWeatherData();
    }
    
    const forecastData = await forecastResponse.json();
    
    // Process Visual Crossing forecast data
    const dailyData = processVisualCrossingForecastData(forecastData);
    
    return dailyData;
  } catch (error) {
    console.error('Visual Crossing API error:', error);
    // Return demo data as fallback
    return generateDemoWeatherData();
  }
}

function processVisualCrossingForecastData(forecastData) {
  const dailyData = [];
  
  for (let i = 0; i < forecastData.days.length && i < 7; i++) {
    const day = forecastData.days[i];
    
    dailyData.push({
      date: day.datetime, // Already in YYYY-MM-DD format
      temp_max: day.tempmax || 70,
      temp_min: day.tempmin || 50,
      humidity: day.humidity || 50,
      description: day.conditions?.toLowerCase() || 'partly cloudy',
      rain: (day.precip || 0) // Already in inches
    });
  }
  
  return dailyData;
}

function generateDemoWeatherData() {
  const today = new Date();
  const dailyData = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateString = date.toISOString().split('T')[0];
    
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
  
  return dailyData;
}

async function getAIWateringAdvice(weatherData) {
  if (!process.env.OPENAI_API_KEY) {
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
  
  /* ---------- build INPUT objects ---------- */
/* ---------- INPUT objects ---------- */
const weather = weatherData.map(d => ({
    d:  d.date,                      // YYYY-MM-DD
    hi: Math.round(d.temp_max),      // °F high
    lo: Math.round(d.temp_min),      // °F low
    rain: +d.rain.toFixed(2),        // inches today
    rainPast3: 0                     // 3-day running total incl. today
  }));
  weather.forEach((d,i)=>{ d.rainPast3 = +weather
    .slice(Math.max(0,i-2), i+1)
    .reduce((s,x)=>s+x.rain,0).toFixed(2);
  });
  
  const rules = {
    hot: 85,          // hi ≥ hot triggers earlier watering
    cool: 70,
    rainSkip: 0.5,    // skip if rain ≥ …
    rainSkip3: 1.0,   // skip if rainPast3 ≥ …
    maxDays: 3,       // max “yes” per week
    minGap: 1         // no consecutive “yes”
  };
  
  
  /* ---------- PROMPT ---------- */
  const prompt =
`
SYSTEM: You are a master vegetable gardener. Think step-by-step but **only return JSON**.

TASK  For each day decide watering. Process the list in order; maintain this state:
  state = { lastYesDate: null, yesThisWeek: 0 }

  When you decide "yes":
  • state.lastYesDate = current date
  • state.yesThisWeek += 1

DATA  ${JSON.stringify(weather)}
RULES ${JSON.stringify(rules)}

FIELD GLOSSARY
d=date, hi/day-high°F, lo/day-low°F, rain=today inches,
rainPast3=sum inches today+previous 2 days (never future rain).

LOGIC
1 Max ${rules.maxDays} yes per ISO-week (Mon-Sun).
2 No yes if (today − lastYesDate) ≤ ${rules.minGap} days.
3 Skip if rain ≥ ${rules.rainSkip} **OR** rainPast3 ≥ ${rules.rainSkip3}.
4 Else yes when (hi ≥ ${rules.hot} OR rainPast3 < 0.2) AND rules 1-2 satisfied.
5 Else maybe.
6  Reason: Brief, user friendly explanation considering soil moisture, recent watering, and weather
7 "weekSummary": "Brief overall recommendation for the week including total water needs"

  IMPORTANT VEGETABLE GARDEN WATERING PRINCIPLES:
  - Most vegetables need 1-1.5 inches of water per week (including rainfall)
  - Deep, infrequent watering (2-3 times per week) is better than daily shallow watering
  - Deep watering encourages strong root development and drought resistance
  - Daily watering creates shallow roots and weak plants
  - Water early morning (6-10 AM) to reduce evaporation and disease
  - Skip watering if soil is still moist from previous watering or recent rain
  - Consider cumulative rainfall over 3-7 days, not just daily amounts
  - Hot, windy days increase water needs; cool, humid days reduce them

STRICT WATERING RULES TO FOLLOW:
  1. NEVER recommend watering on consecutive days - always skip at least 1 day between waterings
  2. Maximum 3 watering days per week, ideally 2 days per week
  3. If today's rain >= 0.5" OR 3-day total rain >= 1.0" → wateringStatus = "no"
  4. After any "yes" watering day, the next day must be "no" (minimum 1 day gap)
  5. Ideal pattern: Water Monday, skip Tuesday, water Wednesday, skip Thursday/Friday, water Saturday, skip Sunday
  6. Hot days (temp_max >= 85°F) may justify closer spacing but NEVER consecutive days
  7. Cool days (temp_max < 70°F) should have 2-3 day gaps between watering
  8. Each watering should be deep and thorough, not light surface watering
  
OUTPUT  valid JSON only:
{
 "weekSummary":"string",
 "dailyRecommendations":[
   {"date":"YYYY-MM-DD","wateringStatus":"yes|maybe|no","reason":"string"}
 ]
}`;   // keep tight, no blank lines

try {
const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.25,          // lower randomness = fewer surprises
    max_tokens: 600,           // you can probably drop to 500 now
    messages: [
      { role: "system",
        content: "You are an expert vegetable-garden assistant. Reply with VALID JSON only." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  });

  return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to get AI watering advice');
  }
}


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
