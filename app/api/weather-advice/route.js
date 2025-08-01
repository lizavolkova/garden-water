import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const zipCode = searchParams.get('zipCode');

  if (!zipCode) {
    return Response.json({ error: 'ZIP code is required' }, { status: 400 });
  }

  try {
    // Fetch weather data from OpenWeatherMap
    const weatherData = await fetchWeatherData(zipCode);
    
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

async function fetchWeatherData(zipCode) {
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

async function getAIWateringAdvice(weatherData) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const weatherSummary = weatherData.map(day => 
    `${day.date}: High ${Math.round(day.temp_max)}°F, Low ${Math.round(day.temp_min)}°F, Humidity ${day.humidity}%, Rain ${day.rain.toFixed(2)} inches, Conditions: ${day.description}`
  ).join('\n');

  const prompt = `Given this 7-day weather forecast for a vegetable garden, please provide specific daily watering recommendations:

${weatherSummary}

Return your response as a JSON object with this exact structure:
{
  "weekSummary": "Brief overall recommendation for the week",
  "dailyRecommendations": [
    {
      "date": "YYYY-MM-DD",
      "shouldWater": true/false,
      "wateringAmount": "light/moderate/heavy",
      "reason": "Brief explanation why",
      "priority": "low/medium/high"
    }
  ]
}

Consider factors like temperature, rainfall, humidity, and consecutive dry days. Focus on practical advice for maintaining healthy vegetable plants.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert gardening assistant specializing in vegetable garden care. You must respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to get AI watering advice');
  }
}
