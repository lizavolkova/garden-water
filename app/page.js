'use client';

import { useState, useEffect, useCallback } from 'react';

// SEASONAL THEME CONFIGURATION
// Change this to 'spring', 'summer', 'fall', or 'winter' to test different seasons
const CURRENT_SEASON = 'summer';

// Seasonal background configuration
const getSeasonalBackgrounds = (season) => {
  const backgrounds = {
    spring: {
      mobile: 'url(/mobile-background-spring.png)',
      desktop: 'url(/floral-background-spring.png)'
    },
    summer: {
      mobile: 'url(/mobile-background-summer.png)',
      desktop: 'url(/floral-background-summer.png)'
    },
    fall: {
      mobile: 'url(/mobile-background-fall.png)',
      desktop: 'url(/floral-background-fall.png)'
    },
    winter: {
      mobile: 'url(/mobile-background-winter.png)',
      desktop: 'url(/floral-background-winter.png)'
    }
  };
  
  // Fallback to default if season not found or files don't exist yet
  return backgrounds[season] || {
    mobile: 'url(/mobile-background-new.png)',
    desktop: 'url(/floral-background.png)'
  };
};

import Image from 'next/image';
import {
  Container,
  Alert,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from '@mui/material';
import { WaterDrop, Thermostat } from '@mui/icons-material';

// Import components
import Header from './components/Header';
import InputForm from './components/InputForm';
import NavHeader from './components/NavHeader';
import MobileMenu from './components/MobileMenu';
import IntroText from './components/IntroText';
import TodayAdviceCard from './components/TodayAdviceCard';
import WeeklyTable from './components/WeeklyTable';
import Disclaimer from './components/Disclaimer';
import GnomeCharacter from './components/GnomeCharacter';
import MobileLayoutSection from './components/MobileLayoutSection';

// Import utilities
import { getLocalDateString, isToday, isPastDate } from './utils/dateUtils';
import { formatTemperature, getWeatherIcon, convertFahrenheitToCelsius } from './utils/wateringUtils';
import { getCachedData, setCachedData } from './utils/cacheUtils';

export default function Home() {
  // State management
  const [zipCode, setZipCode] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [wateringAdvice, setWateringAdvice] = useState(null);
  const [todayAdvice, setTodayAdvice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [temperatureUnit, setTemperatureUnit] = useState('fahrenheit');
  const [weatherAPI, setWeatherAPI] = useState('visualcrossing');
  const [debugMode, setDebugMode] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Set up client-side rendering flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle scroll-based mobile menu visibility
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleScroll = () => {
      const scrollY = window.scrollY;
      // Show menu after scrolling down 100px or if at top and has data
      setShowMobileMenu(scrollY > 100 || (scrollY === 0 && (weatherData || wateringAdvice)));
    };

    window.addEventListener('scroll', handleScroll);
    // Initial check
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [weatherData, wateringAdvice]);

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
    
    const getWeatherIconPath = () => {
      return getWeatherIcon(weatherDay.description, weatherDay.temp_max);
    };
    
    return {
      icon: getWeatherIconPath(),
      temp: temperatureUnit === 'celsius' ? 
        `${Math.round(convertFahrenheitToCelsius(weatherDay.temp_max))}°/${Math.round(convertFahrenheitToCelsius(weatherDay.temp_min))}°C` : 
        `${Math.round(weatherDay.temp_max)}°/${Math.round(weatherDay.temp_min)}°F`,
      description: weatherDay.description,
      rain: weatherDay.rain || 0,
      precip_prob: weatherDay.precip_prob || 0,
      wind_speed: weatherDay.wind_speed || 0,
      humidity: weatherDay.humidity || 0
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
    if (forceRefresh) {
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
          setLocationData(cachedData.location);
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
        setLocationData(data.location);
        
        if (!debugMode && data.advice) {
          setWateringAdvice(data.advice);
          const todaysRec = data.advice.daily?.find(day => isToday(day.date));
          setTodayAdvice(data.todayAdvice || todaysRec || null);
          
          // Cache the data
          setCachedData(zip, data.weather, data.advice, data.todayAdvice || todaysRec, data.location);
        } else {
          // Debug mode or no advice - just cache weather
          setCachedData(zip, data.weather, null, null, data.location);
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

  // Load cached data on page load, but don't fetch from API unless user clicks button
  useEffect(() => {
    if (zipCode && initialLoad && isClient) {
      // Only check cache, don't fetch from API
      const zip = zipCode.trim();
      const cachedData = getCachedData(zip);
      if (cachedData) {
        setWeatherData(cachedData.weather);
        setLocationData(cachedData.location);
        if (!debugMode && cachedData.advice) {
          setWateringAdvice(cachedData.advice);
          setTodayAdvice(cachedData.todayAdvice || null);
        } else if (debugMode) {
          setWateringAdvice(null);
          setTodayAdvice(null);
        }
      }
      setInitialLoad(false);
    }
  }, [zipCode, initialLoad, isClient, debugMode]);

  // Get seasonal backgrounds
  const seasonalBgs = getSeasonalBackgrounds(CURRENT_SEASON);

  return (
    <>
      <title>Water Gnome - Your Garden Watering Expert</title>
      <meta name="description" content="Meet Water Gnome, your friendly garden companion who provides expert watering advice based on weather patterns" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      <meta name="theme-color" content="#dfdbc7" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="msapplication-navbutton-color" content="#dfdbc7" />
      
      {/* Desktop Nav Header - Only show when data exists */}
      {(weatherData || wateringAdvice) && (
        <NavHeader 
          zipCode={zipCode}
          setZipCode={setZipCode}
          loading={loading}
          fetchWeatherAndAdvice={fetchWeatherAndAdvice}
          temperatureUnit={temperatureUnit}
          setTemperatureUnit={setTemperatureUnit}
        />
      )}

      {/* Mobile Menu - Show based on scroll and data state */}
      {showMobileMenu && (
        <MobileMenu 
          zipCode={zipCode}
          setZipCode={setZipCode}
          loading={loading}
          fetchWeatherAndAdvice={fetchWeatherAndAdvice}
          temperatureUnit={temperatureUnit}
          setTemperatureUnit={setTemperatureUnit}
        />
      )}

      {/* Responsive Floral Background Section */}
      <Box
        sx={{
          position: 'relative',
          minHeight: { xs: '100dvh', lg: '100vh' }, // Use min-height instead of height
          height: { xs: '100%', lg: '100vh' },
          backgroundColor: '#dfdbc7', // App background color
          backgroundImage: {
            xs: seasonalBgs.mobile, // Seasonal mobile background
            lg: seasonalBgs.desktop  // Seasonal desktop background  
          },
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: { xs: 'local', lg: 'fixed' }, // local on mobile to avoid Safari issues
          backgroundPositionY: {
            xs: '-118px', // Mobile background vertical position
            lg: 'center'  // Desktop background stays centered
          },
          // Handle safe areas and extend background
          paddingTop: { xs: 'env(safe-area-inset-top)', lg: 0 },
          paddingBottom: { xs: 'env(safe-area-inset-bottom)', lg: 0 },
          paddingLeft: { xs: 'env(safe-area-inset-left)', lg: 0 },
          paddingRight: { xs: 'env(safe-area-inset-right)', lg: 0 },
          py: 4,
          pt: { 
            xs: 1, // Mobile padding
            lg: (weatherData || wateringAdvice) ? 8 : 4 // Desktop padding - more when nav present
          },
        }}
      >
        {/* Desktop Layout */}
        <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
          <Container maxWidth="xl">
            {/* Dynamic Header Section */}
            <Grid container spacing={6} alignItems="center" justifyContent="center" sx={{ maxWidth: 1000, mx: 'auto' }}>
              {/* Left Column - Conditional Content */}
              <Grid size={{ xs: 12, lg: 9 }}>
                <Box sx={{ maxWidth: 500, textAlign: 'center' }}>
                  {/* Consistent Card Container */}
                  <Card 
                    sx={{ 
                      mb: 4,
                      bgcolor: '#FFFFFF',
                      borderRadius: '16px',
                      boxShadow: '0 8px 32px rgba(107, 123, 92, 0.15)',
                      border: '1px solid rgba(255, 255, 255, 0.8)',
                      minHeight: 400, // Consistent minimum height
                    }}
                  >
                    <CardContent sx={{ p: 4, minHeight: 320 }}>
                      {loading ? (
                        // Loading State - Show spinner
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, height: '100%', minHeight: 320 }}>
                          <CircularProgress 
                            size={48} 
                            sx={{ color: '#6B7B5C' }}
                          />
                          <Typography sx={{ color: '#7A8471', fontStyle: 'italic', textAlign: 'center' }}>
                            Consulting with Wynn&apos;s gnome wisdom...
                          </Typography>
                        </Box>
                      ) : (!weatherData && !wateringAdvice) ? (
                        // New User Experience - Header + Input Form
                        <>
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
                        </>
                      ) : (
                        // Returning User Experience - Today's Wisdom Card Content
                        <Box sx={{ height: '100%' }}>
                          <TodayAdviceCard 
                            todayAdvice={todayAdvice} 
                            isDebugMode={debugMode}
                            locationData={locationData}
                            compact={true}
                          />
                        </Box>
                      )}
                    </CardContent>
                  </Card>

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
                </Box>
              </Grid>

              {/* Right Column - Gnome Character */}
              <Grid size={{ xs: 12, lg: 3 }}>
                <GnomeCharacter 
                  variant="desktop"
                  sx={{
                    pt: 4,
                    zIndex: 40
                  }}
                />
              </Grid>
            </Grid>


            {/* Weekly Table - Full Width */}
            <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
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
            </Box>
          </Container>
        </Box>

        {/* Mobile Layout */}
        <Box sx={{ display: { xs: 'block', lg: 'none' } }}>
          <Container maxWidth="md" sx={{ pt:2, px: 0 }}>
          {/* Conditional Content based on data availability */}
          {loading ? (
            // Loading State - Show spinner
            <MobileLayoutSection>
              <Card 
                sx={{ 
                  mb: 4,
                  bgcolor: '#dfdbc7',
                  borderRadius: '0',
                  boxShadow: 'none',
                  border: 'none',
                  minHeight: 160,
                }}
              >
                <CardContent sx={{ p: 3, pt: 4 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, height: '100%', minHeight: 120 }}>
                    <Image
                      src="/loading-spinner.gif"
                      alt="Loading..."
                      width={60}
                      height={60}
                      unoptimized
                    />
                    <Typography sx={{ color: '#4d5239', fontStyle: 'italic', textAlign: 'center', fontFamily: 'var(--font-body)' }}>
                      Consulting with Wynn&apos;s gnome wisdom...
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </MobileLayoutSection>
          ) : (!weatherData && !wateringAdvice) ? (
            // New User Experience - Header Text + Gnome + Input Form
            <MobileLayoutSection>
              <InputForm 
                zipCode={zipCode}
                setZipCode={setZipCode}
                loading={loading}
                debugMode={debugMode}
                fetchWeatherAndAdvice={fetchWeatherAndAdvice}
              />
            </MobileLayoutSection>
          ) : (
            // Returning User Experience - Header Text + Gnome + Today's Wisdom Card
            <>
              <MobileLayoutSection>
                <TodayAdviceCard 
                  todayAdvice={todayAdvice} 
                  isDebugMode={debugMode}
                  locationData={locationData}
                />
              </MobileLayoutSection>

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
            </>
          )}

          {/* Error Alert - Show regardless of state */}
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
          </Container>
        </Box>
      </Box>
    </>
  );
}
