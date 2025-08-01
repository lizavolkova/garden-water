import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    if (weatherAPI === 'nws') {
      weatherData = await fetchNWSWeatherData(zipCode);
    } else {
      weatherData = await fetchOpenWeatherData(zipCode);
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
    const date = new Date(item.dt * 1000).toDateString();
    
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date: new Date(item.dt * 1000).toISOString().split('T')[0],
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
    const geoResponse = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
    if (!geoResponse.ok) {
      throw new Error('Invalid ZIP code or failed to fetch location data');
    }
    
    const geoData = await geoResponse.json();
    const lat = parseFloat(geoData.places[0].latitude);
    const lon = parseFloat(geoData.places[0].longitude);

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
    const date = new Date(period.startTime).toISOString().split('T')[0];
    
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
`TASK  Decide when to water a vegetable garden in Ossining, NY (zip 10562).

DATA  ${JSON.stringify(weather)}
RULES ${JSON.stringify(rules)}

FIELD GLOSSARY
d=date, hi/day-high°F, lo/day-low°F, rain=today inches,
rainPast3=sum inches today+previous 2 days (never future rain).

LOGIC
1  Max ${rules.maxDays} "yes" per week.
2  No "yes" on consecutive days (minGap ${rules.minGap}).
3  Skip if rain ≥ rainSkip OR rainPast3 ≥ rainSkip3.
4  Else "yes" when (hi ≥ hot OR rainPast3 < 0.2) AND gap rule satisfied.
5  Else "maybe" (check soil) or "no" (if cool & moist).
6  Reason: one warm, conversational sentence that explains *why* in plain English, e.g. “We’ve had good soaking rain this week—let the soil dry out today." or "It's warm today, but if you watered yesterday you should be all set today"

OUTPUT  valid JSON only:
{
 "weekSummary":"string",
 "dailyRecommendations":[
   {"date":"YYYY-MM-DD","wateringStatus":"yes|maybe|no","reason":"string"}
 ]
}`;   // keep tight, no blank lines
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
