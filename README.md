# Garden Watering Assistant

An AI-powered Next.js app that provides intelligent watering recommendations for your vegetable garden based on real weather forecasts and OpenAI analysis.

## Features

- Real weather data from OpenWeatherMap API
- AI-powered watering advice from OpenAI GPT-3.5
- 5-day weather forecast display
- Clean, responsive design
- Easy deployment to Vercel

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file with your API keys:
```
OPENWEATHER_API_KEY=your_openweather_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

3. Get API keys:
   - **OpenWeatherMap**: Sign up at [openweathermap.org](https://openweathermap.org/api) for free
   - **OpenAI**: Get your API key from [platform.openai.com](https://platform.openai.com/api-keys)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard:
   - `OPENWEATHER_API_KEY`
   - `OPENAI_API_KEY`
4. Deploy!

## How It Works

1. **Weather Data**: Fetches real 5-day forecast from OpenWeatherMap using your ZIP code
2. **AI Analysis**: Sends weather data to OpenAI GPT-3.5 with specific prompts about garden watering
3. **Smart Recommendations**: AI considers temperature, rainfall, humidity, and plant needs
4. **User-Friendly Display**: Shows both raw weather data and AI-generated advice

## API Costs

- **OpenWeatherMap**: Free tier includes 1,000 calls/day
- **OpenAI**: GPT-3.5-turbo costs ~$0.002 per request (very affordable)

## Features

- Handles ZIP code validation
- Processes real weather data into daily summaries
- Converts metric units to imperial
- Provides detailed error handling
- Mobile-responsive design
