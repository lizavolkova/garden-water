'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Container,
  Alert,
  Typography,
} from '@mui/material';

// Import components
import Header from './components/Header';
import InputForm from './components/InputForm';
import TodayAdviceCard from './components/TodayAdviceCard';
import WeeklyTable from './components/WeeklyTable';
import Disclaimer from './components/Disclaimer';

// Import utilities
import { getLocalDateString, isToday, isPastDate } from './utils/dateUtils';
import { formatTemperature, getWeatherIcon, convertFahrenheitToCelsius } from './utils/wateringUtils';
import { getCachedData, setCachedData } from './utils/cacheUtils';

export default function Home() {
  // State management
  const [zipCode, setZipCode] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [wateringAdvice, setWateringAdvice] = useState(null);
  const [todayAdvice, setTodayAdvice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [temperatureUnit, setTemperatureUnit] = useState('fahrenheit');
  const [weatherAPI, setWeatherAPI] = useState('visualcrossing');
  const [debugMode, setDebugMode] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Set up client-side rendering flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check for debug mode on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const debugParam = urlParams.get('debug');
      const isDebug = debugParam === 'true';
      setDebugMode(isDebug);
      
      // Load saved ZIP code
      const savedZip = localStorage.getItem('gardenWateringZipCode');
      if (savedZip) {
        setZipCode(savedZip);
      }
    }
  }, []);


  const getWeatherDisplay = useCallback((date) => {
    if (!weatherData) return null;
    
    const weatherDay = weatherData.find(day => day.date === date);
    if (!weatherDay) return null;
    
    const getWeatherIcon = () => {
      if (weatherDay.description.includes('rain')) return '🌧️';
      if (weatherDay.description.includes('cloud')) return '☁️';
      if (weatherDay.description.includes('clear') || weatherDay.description.includes('sun')) return '☀️';
      if (weatherDay.description.includes('snow')) return '❄️';
      return '☀️';
    };
    
    return {
      icon: getWeatherIcon(),
      temp: temperatureUnit === 'celsius' ? 
        `${Math.round(convertFahrenheitToCelsius(weatherDay.temp_max))}°/${Math.round(convertFahrenheitToCelsius(weatherDay.temp_min))}°C` : 
        `${Math.round(weatherDay.temp_max)}°/${Math.round(weatherDay.temp_min)}°F`,
      description: weatherDay.description,
      rain: weatherDay.rain > 0.1 ? weatherDay.rain.toFixed(1) : null
    };
  }, [weatherData, temperatureUnit]);

  const fetchWeatherAndAdvice = useCallback(async (forceRefresh = false) => {
    if (!zipCode.trim()) {
      setError('Please enter a ZIP code');
      return;
    }

    const zip = zipCode.trim();
    setLoading(true);
    setError(null);
    
    // Clear existing data when user manually requests new data
    if (forceRefresh || !initialLoad) {
      setWeatherData(null);
      setWateringAdvice(null);
      setTodayAdvice(null);
    }
    
    try {
      // Check cache first unless forcing refresh
      if (!forceRefresh) {
        const cachedData = getCachedData(zip);
        if (cachedData) {
          setWeatherData(cachedData.weather);
          // Only set advice data if not in debug mode and we have advice data
          if (!debugMode && cachedData.advice) {
            setWateringAdvice(cachedData.advice);
            setTodayAdvice(cachedData.todayAdvice || null);
          } else if (debugMode) {
            // In debug mode, clear advice data to show only weather
            setWateringAdvice(null);
            setTodayAdvice(null);
          }
          localStorage.setItem('gardenWateringZipCode', zip);
          setLoading(false);
          setInitialLoad(false);
          return;
        }
      }
      
      // Fetch fresh data
      const debugParam = debugMode ? '&debug=true' : '';
      const response = await fetch(`/api/weather-advice?zipCode=${zip}&weatherAPI=${weatherAPI}${debugParam}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.weather) {
        setWeatherData(data.weather);
        
        if (!debugMode && data.advice) {
          setWateringAdvice(data.advice);
          const todaysRec = data.advice.daily?.find(day => isToday(day.date));
          setTodayAdvice(data.todayAdvice || todaysRec || null);
          
          // Cache the data
          setCachedData(zip, data.weather, data.advice, data.todayAdvice || todaysRec);
        } else {
          // Debug mode or no advice - just cache weather
          setCachedData(zip, data.weather, null, null);
          setWateringAdvice(null);
          setTodayAdvice(null);
        }
        
        localStorage.setItem('gardenWateringZipCode', zip);
      }
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch weather data. Please try again.');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [zipCode, debugMode, weatherAPI, initialLoad]);

  // Auto-load on mount if we have a saved ZIP code
  useEffect(() => {
    if (zipCode && initialLoad && isClient) {
      fetchWeatherAndAdvice(false);
    }
  }, [zipCode, initialLoad, isClient, fetchWeatherAndAdvice]);

  return (
    <>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <title>Water Gnome - Your Garden Watering Expert</title>
        <meta name="description" content="Meet Water Gnome, your friendly garden companion who provides expert watering advice based on weather patterns" />

        <Header 
          temperatureUnit={temperatureUnit} 
          setTemperatureUnit={setTemperatureUnit} 
        />

        <InputForm 
          zipCode={zipCode}
          setZipCode={setZipCode}
          loading={loading}
          debugMode={debugMode}
          fetchWeatherAndAdvice={fetchWeatherAndAdvice}
        />

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 4,
              borderRadius: '8px',
              '& .MuiAlert-message': {
                width: '100%'
              }
            }}
          >
            <Typography sx={{ color: '#A0725C' }}>{error}</Typography>
          </Alert>
        )}

        <TodayAdviceCard 
          todayAdvice={todayAdvice} 
          isDebugMode={debugMode} 
        />

        <WeeklyTable 
          weatherData={weatherData}
          wateringAdvice={wateringAdvice}
          debugMode={debugMode}
          weatherAPI={weatherAPI}
          getWeatherDisplay={getWeatherDisplay}
          isClient={isClient}
          loading={loading}
        />

        <Disclaimer />

      </Container>
    </>
  );
}