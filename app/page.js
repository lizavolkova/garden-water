"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Head from 'next/head';
import {
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Avatar,
  Divider,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  SmartToy,
  LocationOn,
  WbSunny,
  Cloud,
  Umbrella,
  Air,
  WaterDrop,
  Block,
  Thermostat,
  Settings,
  CloudQueue,
  Public,
  BugReport,
  LocalFlorist,
} from '@mui/icons-material';

// Utility function to get local date in YYYY-MM-DD format (client timezone)
function getLocalDateString(date = new Date()) {
  // Use the user's local timezone, not server timezone
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


export default function Home() {
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
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Temperature utility functions
  const convertFahrenheitToCelsius = (fahrenheit) => {
    return (fahrenheit - 32) * 5 / 9;
  };
  
  useEffect(() => {
    console.log("debugMode", debugMode);
}, [debugMode]); // Dependency array ensures effect runs when myState changes
  
  const formatTemperature = (tempF, unit = temperatureUnit) => {
    if (unit === 'celsius') {
      const celsius = convertFahrenheitToCelsius(tempF);
      return `${Math.round(celsius)}°C`;
    }
    return `${Math.round(tempF)}°F`;
  };

  // Preference management
  const saveTemperaturePreference = (unit) => {
    localStorage.setItem('gardenWateringTempUnit', unit);
  };
  
  const loadTemperaturePreference = () => {
    return localStorage.getItem('gardenWateringTempUnit') || 'fahrenheit';
  };

  const saveWeatherAPIPreference = (api) => {
    localStorage.setItem('gardenWateringWeatherAPI', api);
  };
  
  const loadWeatherAPIPreference = () => {
    return localStorage.getItem('gardenWateringWeatherAPI') || 'visualcrossing';
  };

  // Cache utility functions
  const getCacheKey = useCallback((zipCode) => `gardenWateringData_${zipCode}_${weatherAPI}`, [weatherAPI]);
  
  const getCachedData = useCallback((zipCode) => {
    try {
      const cacheKey = getCacheKey(zipCode);
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      const now = Date.now();
      const cacheAge = now - data.timestamp;
      const twelveHours = 12 * 60 * 60 * 1000;
      
      // Check if cache is older than 12 hours
      if (cacheAge > twelveHours) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }, [getCacheKey]);
  
  const setCachedData = useCallback((zipCode, weather, advice, todayAdvice = null) => {
    try {
      const cacheKey = getCacheKey(zipCode);
      const data = {
        weather,
        advice,
        todayAdvice,
        timestamp: Date.now(),
        zipCode
      };
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }, [getCacheKey]);

  const fetchWeatherAndAdviceForZip = useCallback(async (zip, forceRefresh = false) => {
    setLoading(true);
    setError(null);
    
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
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch weather data');
      }
      
      setWeatherData(data.weather);
      
      // Only set advice data if not in debug mode
      if (!data.debug) {
        setWateringAdvice(data.advice);
        setTodayAdvice(data.todayAdvice || null);
        
        // Save to cache and localStorage
        setCachedData(zip, data.weather, data.advice, data.todayAdvice);
      } else {
        setWateringAdvice(null);
        setTodayAdvice(null);
        
      }
      
      localStorage.setItem('gardenWateringZipCode', zip);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [weatherAPI, debugMode, getCachedData, setCachedData]);
  
  // Load saved preferences and check URL params on component mount
  useEffect(() => {
    const savedTempUnit = loadTemperaturePreference();
    const savedWeatherAPI = loadWeatherAPIPreference();
    
    // Check URL parameters for debug mode
    const urlParams = new URLSearchParams(window.location.search);
    const debugParam = urlParams.get('debug');
    const isUrlDebugMode = debugParam === 'true';
    
    setTemperatureUnit(savedTempUnit);
    setWeatherAPI(savedWeatherAPI);
    setIsDebugMode(isUrlDebugMode);
    setIsClient(true); // Mark as client-side
    
    // If debug mode is enabled via URL, also enable internal debug mode
    if (isUrlDebugMode) {
      setDebugMode(true);
    }
  }, []);

  // Load saved location and fetch data after weatherAPI is set
  useEffect(() => {
    // Only run after weatherAPI has been initialized (not default value)
    if (weatherAPI === 'visualcrossing' && !localStorage.getItem('gardenWateringWeatherAPI')) {
      return; // Still initializing, default value
    }
    
    const savedZipCode = localStorage.getItem('gardenWateringZipCode');
    
    if (savedZipCode) {
      setZipCode(savedZipCode);
      // Auto-load cached data for saved ZIP code
      fetchWeatherAndAdviceForZip(savedZipCode, false);
    }
    setInitialLoad(false);
  }, [weatherAPI, fetchWeatherAndAdviceForZip]);

  

  const fetchWeatherAndAdvice = async () => {
    await fetchWeatherAndAdviceForZip(zipCode, true); // Force refresh when manually triggered
  };

  const handleTemperatureUnitChange = (event, newUnit) => {
    if (newUnit !== null) {
      setTemperatureUnit(newUnit);
      saveTemperaturePreference(newUnit);
    }
  };

  const handleWeatherAPIChange = (event) => {
    const newAPI = event.target.value;
    setWeatherAPI(newAPI);
    saveWeatherAPIPreference(newAPI);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };

  const isToday = (dateString) => {
    if (!isClient) return false; // Wait for client-side hydration
    const today = getLocalDateString();
    return dateString === today;
  };

  const isPastDate = (dateString) => {
    if (!isClient) return false; // Wait for client-side hydration
    const today = getLocalDateString();
    return dateString < today;
  };

  const getTodaysRecommendation = () => {
    if (!wateringAdvice?.daily) return null;
    
    return wateringAdvice.daily.find(day => isToday(day.date));
  };

  const getWateringIcon = (shouldWater) => {
    return shouldWater ? '💧' : '🚫';
  };

  const getWeatherDisplay = (date) => {
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
      temp: `${formatTemperature(weatherDay.temp_max)}/${formatTemperature(weatherDay.temp_min)}`,
      description: weatherDay.description,
      rain: weatherDay.rain > 0 ? `${weatherDay.rain.toFixed(1)}` : null
    };
  };

  return (
    <>
      <Head>
        <title>Water Gnome - Your Garden Watering Expert</title>
        <meta name="description" content="Meet Water Gnome, your friendly garden companion who provides expert watering advice based on weather patterns" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box textAlign="center" mb={6} position="relative">
          {/* Temperature Unit Toggle */}
          <Box position="absolute" top={0} right={0}>
            <Tooltip title="Temperature Unit">
              <ToggleButtonGroup
                value={temperatureUnit}
                exclusive
                onChange={handleTemperatureUnitChange}
                size="small"
                sx={{ 
                  bgcolor: '#F8FAF6', 
                  borderRadius: '4px',
                  border: '1px solid #D7E0CC',
                  boxShadow: '0 1px 4px rgba(107, 123, 92, 0.08)',
                  '& .MuiToggleButton-root': {
                    border: 'none',
                    color: '#7A8471',
                    borderRadius: '3px',
                    '&.Mui-selected': {
                      backgroundColor: '#6B7B5C',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#5A6B4B'
                      }
                    },
                    '&:hover': {
                      backgroundColor: '#F0F3EC'
                    }
                  }
                }}
              >
                <ToggleButton value="fahrenheit" sx={{ px: 2 }}>
                  <Thermostat sx={{ mr: 0.5, fontSize: '1rem' }} />
                  °F
                </ToggleButton>
                <ToggleButton value="celsius" sx={{ px: 2 }}>
                  <Thermostat sx={{ mr: 0.5, fontSize: '1rem' }} />
                  °C
                </ToggleButton>
              </ToggleButtonGroup>
            </Tooltip>
          </Box>

          <Box
            sx={{
              width: { xs: 140, sm: 160, md: 180 },
              height: { xs: 140, sm: 160, md: 180 },
              margin: '0 auto 32px',
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'transparent'
            }}
          >
            <Image 
              src="/water-gnome-logo.png" 
              alt="Water Gnome Logo"
              width={180}
              height={180}
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain'
              }}
              priority
            />
          </Box>
          
          <Typography 
            variant="h1" 
            component="h1" 
            gutterBottom
            sx={{
              fontWeight: 500,
              fontSize: { xs: '2rem', sm: '2.3rem', md: '2.8rem' },
              color: '#4A5D3A',
              letterSpacing: '0.01em',
              mb: 2,
              fontFamily: 'serif'
            }}
          >
            Water Gnome
          </Typography>
          
          <Typography 
            variant="body1" 
            color="#7A8471" 
            maxWidth="sm" 
            mx="auto"
            sx={{
              fontWeight: 400,
              lineHeight: 1.6,
              fontSize: '1rem',
              fontStyle: 'italic'
            }}
          >
            Hee-hee-hoo!  I&apos;m Wynn the Water Gnome. I&apos;ll check the weather and tell you when it&apos;s time to water, so your garden is always happy.
          </Typography>
        </Box>

        <Card 
          sx={{ 
            mb: 4,
            bgcolor: '#FEFFFE',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(107, 123, 92, 0.08)',
            border: '1px solid #E8EDE4'
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={3} alignItems="center">
              <TextField
                fullWidth
                label="Where do your green friends live?"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="Where is your garden?"
                InputProps={{
                  startAdornment: <LocationOn sx={{ mr: 1, color: '#6B7B5C' }} />,
                }}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '6px',
                    backgroundColor: '#F8FAF6',
                    border: '1px solid #D7E0CC',
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#6B7B5C'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#6B7B5C',
                      borderWidth: 1
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: '#7A8471',
                    '&.Mui-focused': {
                      color: '#6B7B5C'
                    }
                  }
                }}
              />
              
              {/* Weather API Selection - Only show in debug mode */}
              {isDebugMode && (
                <FormControl 
                  sx={{ 
                    minWidth: 160,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: '#FAFAFA'
                    },
                    '& .MuiInputLabel-root': {
                      color: '#616161',
                      '&.Mui-focused': {
                        color: '#2E7D32'
                      }
                    }
                  }}
                >
                  <InputLabel>Weather Source</InputLabel>
                  <Select
                    value={weatherAPI}
                    onChange={handleWeatherAPIChange}
                    label="Weather Source"
                    size="small"
                  >
                    <MenuItem value="openweather">
                      <Box display="flex" alignItems="center" gap={1}>
                        <CloudQueue sx={{ fontSize: '1rem' }} />
                        OpenWeather
                      </Box>
                    </MenuItem>
                    <MenuItem value="nws">
                      <Box display="flex" alignItems="center" gap={1}>
                        <Public sx={{ fontSize: '1rem' }} />
                        NWS
                      </Box>
                    </MenuItem>
                    <MenuItem value="openmeteo">
                      <Box display="flex" alignItems="center" gap={1}>
                        <WbSunny sx={{ fontSize: '1rem' }} />
                        Open-Meteo
                      </Box>
                    </MenuItem>
                    <MenuItem value="visualcrossing">
                      <Box display="flex" alignItems="center" gap={1}>
                        <Cloud sx={{ fontSize: '1rem' }} />
                        Visual Crossing
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              )}
              
              {/* Debug Mode Toggle - Only show in debug mode */}
              {isDebugMode && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={debugMode}
                      onChange={(e) => setDebugMode(e.target.checked)}
                      color="warning"
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <BugReport sx={{ fontSize: '1rem' }} />
                      <Typography variant="caption">Debug</Typography>
                    </Box>
                  }
                  sx={{ minWidth: 'auto' }}
                />
              )}
              
              <Button
                variant="contained"
                size="large"
                onClick={fetchWeatherAndAdvice}
                disabled={loading || !zipCode}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <WaterDrop sx={{ fontSize: '1.1rem' }} />}
                sx={{ 
                  minWidth: 180,
                  height: 56,
                  px: 2.5,
                  py: 1.25,
                  borderRadius: '6px',
                  bgcolor: '#6B7B5C',
                  boxShadow: '0 1px 4px rgba(122, 132, 113, 0.15)',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  textTransform: 'none',
                  '&:hover': {
                    bgcolor: '#6B7B5C',
                    boxShadow: '0 2px 6px rgba(122, 132, 113, 0.2)'
                  },
                  '&:disabled': {
                    bgcolor: '#C4CDB8',
                    boxShadow: 'none'
                  }
                }}
              >
                {loading ? 'Consulting gnome wisdom...' : debugMode ? 'Check Weather' : 'Ask the Gnome'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 4,
              borderRadius: '8px',
              bgcolor: '#FDF8F6',
              border: '1px solid #E8D4CC',
              boxShadow: '0 1px 8px rgba(184, 149, 107, 0.08)',
              '& .MuiAlert-icon': {
                color: '#A0725C'
              }
            }}
          >
            <Typography sx={{ color: '#A0725C' }}>{error}</Typography>
          </Alert>
        )}

        {todayAdvice && (
          <Card 
            sx={{ 
              mb: 4, 
              bgcolor: '#FEFFFE',
              borderRadius: '12px',
              boxShadow: '0 3px 16px rgba(107, 123, 92, 0.12)',
              border: '1.5px solid #E8EDE4'
            }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Typography 
                variant="h4" 
                component="h2" 
                sx={{
                  color: '#4A5D3A',
                  fontWeight: 500,
                  fontSize: { xs: '1.3rem', sm: '1.5rem' },
                  fontFamily: 'serif',
                  mb: 3
                }}
              >
                A Gnome&apos;s Wisdom for Today
              </Typography>
              
              {/* Simplified icon + advice layout */}
              <Box 
                sx={{
                  p: { xs: 3, md: 4 },
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  alignItems: 'center',
                  gap: { xs: 3, md: 4 },
                  bgcolor: todayAdvice.shouldWater === 'yes' ? '#F4F7FA' : 
                          todayAdvice.shouldWater === 'maybe' ? '#FAF7F0' : '#F6F9F4',
                  border: '1px solid',
                  borderColor: todayAdvice.shouldWater === 'yes' ? '#D6E3F0' : 
                              todayAdvice.shouldWater === 'maybe' ? '#E8DCC9' : '#E0E8D6'
                }}
              >
                {/* Large emoji icon */}
                <Box sx={{ fontSize: { xs: '3.5rem', md: '4rem' } }}>
                  {todayAdvice.shouldWater === 'yes' ? '💧' : 
                   todayAdvice.shouldWater === 'maybe' ? '🌱' : '🍂'}
                </Box>
                
                {/* Advice content */}
                <Box sx={{ textAlign: { xs: 'center', md: 'left' }, flex: 1 }}>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 600,
                    fontSize: { xs: '1.1rem', sm: '1.3rem' },
                    mb: 1,
                    color: todayAdvice.shouldWater === 'yes' ? '#4A6B7A' : 
                           todayAdvice.shouldWater === 'maybe' ? '#8B7355' : '#4A5D3A',
                    fontFamily: 'serif'
                  }}>
                    {todayAdvice.shouldWater === 'yes' ? 'Time for a drink!' : 
                     todayAdvice.shouldWater === 'maybe' ? 'Maybe a little sip?' : 
                     'Let them rest today!'}
                  </Typography>
                  
                  <Typography variant="body1" sx={{ 
                    color: todayAdvice.shouldWater === 'yes' ? '#4A6B7A' : 
                           todayAdvice.shouldWater === 'maybe' ? '#8B7355' : '#4A5D3A',
                    lineHeight: 1.6,
                    fontSize: { xs: '0.95rem', sm: '1rem' }
                  }}>
                    {todayAdvice.reason}
                  </Typography>
                  
                  {/* Additional advice if available */}
                  {todayAdvice.advice && (
                    <Typography variant="body2" sx={{ 
                      color: '#7A8471',
                      lineHeight: 1.5,
                      mt: 1,
                      fontSize: { xs: '0.9rem', sm: '0.95rem' }
                    }}>
                      {todayAdvice.advice}
                    </Typography>
                  )}
                </Box>
              </Box>
              
              {/* Debug info - only show in debug mode */}
              {isDebugMode && (
                <Box mt={3}>
                  {todayAdvice.keyFactors && todayAdvice.keyFactors.length > 0 && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" gutterBottom color="text.secondary">
                        Key factors considered:
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        {todayAdvice.keyFactors.map((factor, index) => (
                          <Chip 
                            key={index} 
                            label={factor} 
                            size="small" 
                            variant="outlined" 
                            color="primary"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                  
                  <Box display="flex" justifyContent="center">
                    <Chip
                      label={`${todayAdvice.confidence} confidence`}
                      size="small"
                      variant="outlined"
                      sx={{ 
                        fontSize: '0.7rem',
                        color: '#616161',
                        borderColor: '#E0E0E0',
                        bgcolor: '#FAFAFA'
                      }}
                    />
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {(weatherData || wateringAdvice) && (
          <Card 
            sx={{ 
              mb: 4,
              bgcolor: '#FEFFFE',
              borderRadius: '12px',
              boxShadow: '0 3px 16px rgba(107, 123, 92, 0.12)',
              border: '1.5px solid #E8EDE4'
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box mb={3}>
                {debugMode && (
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Avatar sx={{ 
                      bgcolor: 'warning.main', 
                      width: 48, 
                      height: 48,
                      borderRadius: '8px'
                    }}>
                      <BugReport sx={{ fontSize: '1.2rem' }} />
                    </Avatar>
                    <Box>
                      <Typography 
                        variant="h4" 
                        component="h2" 
                        sx={{
                          color: 'warning.main',
                          fontWeight: 500,
                          fontSize: { xs: '1.4rem', sm: '1.6rem' },
                          fontFamily: 'serif'
                        }}
                      >
                        Gnome&apos;s Weather Notes
                      </Typography>
                      <Chip 
                        label={`SOURCE: ${weatherAPI.toUpperCase()}`}
                        color="warning" 
                        variant="outlined" 
                        size="small"
                      />
                    </Box>
                  </Box>
                )}
                {!debugMode && (
                  <Typography 
                    variant="h4" 
                    component="h2" 
                    sx={{
                      color: '#4A5D3A',
                      fontWeight: 500,
                      fontSize: { xs: '1.4rem', sm: '1.6rem' },
                      fontFamily: 'serif'
                    }}
                  >
                    A Peek at the Week Ahead
                  </Typography>
                )}
              </Box>
              
              {!debugMode && wateringAdvice && (
                <Box 
                  sx={{ 
                    mb: 3,
                    p: 3,
                    borderRadius: '8px',
                    bgcolor: '#F9FBF7',
                    border: '1px solid #E0E8D6',
                    boxShadow: '0 1px 8px rgba(107, 123, 92, 0.06)'
                  }}
                >
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Box sx={{ fontSize: '1.5rem' }}>🦉</Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#4A5D3A', fontFamily: 'serif' }}>
                      Gnome&apos;s Weekly Wisdom
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ 
                    lineHeight: 1.6, 
                    color: '#4A5D3A',
                    fontSize: '1rem',
                    fontWeight: 500
                  }}>
                    {wateringAdvice.weekSummary}
                  </Typography>
                </Box>
              )}
              
              <TableContainer 
                component={Paper}
                sx={{
                  mb: 2,
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid #F0F3EC',
                  bgcolor: '#FEFFFE',
                  boxShadow: '0 1px 8px rgba(107, 123, 92, 0.06)'
                }}
              >
                <Table 
                  size="small"
                  sx={{
                    // Desktop styles
                    '& .MuiTableHead-root': {
                      '& .MuiTableCell-root': {
                        backgroundColor: '#F9FBF7',
                        fontWeight: 500,
                        fontSize: '0.8rem',
                        color: '#4A5D3A',
                        borderBottom: '1px solid #E8EDE4',
                        fontFamily: 'serif',
                        py: 2,
                        // Hide table header on mobile
                        display: { xs: 'none', md: 'table-cell' }
                      }
                    },
                    '& .MuiTableBody-root': {
                      // On mobile, display as block to stack rows
                      display: { xs: 'block', md: 'table-row-group' },
                      '& .MuiTableRow-root': {
                        // Mobile: transform rows into cards
                        display: { xs: 'block', md: 'table-row' },
                        backgroundColor: { xs: '#FEFFFE', md: 'inherit' },
                        border: { xs: '1px solid #E8EDE4', md: 'none' },
                        borderRadius: { xs: '8px', md: '0' },
                        margin: { xs: '8px 0', md: '0' },
                        padding: { xs: '16px', md: '0' },
                        boxShadow: { xs: '0 2px 8px rgba(107, 123, 92, 0.08)', md: 'none' },
                        '&:hover': {
                          backgroundColor: { xs: '#F9FBF7', md: '#FBFCFA' }
                        },
                        // Special styling for today's row on mobile
                        '&.today-row': {
                          backgroundColor: { xs: '#E3F2FD', md: 'primary.light' },
                          borderColor: { xs: '#2196F3', md: 'inherit' },
                          '&:hover': {
                            backgroundColor: { xs: '#E1F5FE', md: 'primary.dark' }
                          }
                        },
                        '& .MuiTableCell-root': {
                          // Mobile: display as block with labels
                          display: { xs: 'flex', md: 'table-cell' },
                          alignItems: { xs: 'center', md: 'inherit' },
                          justifyContent: { xs: 'space-between', md: 'inherit' },
                          border: { xs: 'none', md: 'inherit' },
                          padding: { xs: '8px 0', md: '12px' },
                          color: '#7A8471',
                          fontSize: '0.75rem',
                          borderBottom: { xs: 'none', md: '1px solid #F0F3EC' },
                          // Add data labels on mobile using CSS pseudo-elements
                          '&::before': {
                            content: { xs: 'attr(data-label)', md: 'none' },
                            fontWeight: { xs: 600, md: 'inherit' },
                            color: { xs: '#4A5D3A', md: 'inherit' },
                            fontSize: { xs: '0.8rem', md: 'inherit' },
                            minWidth: { xs: '100px', md: 'auto' },
                            display: { xs: 'block', md: 'none' }
                          },
                          // Hide certain cells on mobile that are less important
                          '&.mobile-hide': {
                            display: { xs: 'none', md: 'table-cell' }
                          }
                        }
                      }
                    }
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ py: 1 }}>📅 Date</TableCell>
                      <TableCell align="center" sx={{ py: 1 }}>🌤️ Weather</TableCell>
                      {debugMode && (
                        <>
                          <TableCell align="center" sx={{ py: 1 }}>🌡️ High</TableCell>
                          <TableCell align="center" sx={{ py: 1 }}>🌡️ Low</TableCell>
                          <TableCell align="center" sx={{ py: 1 }}>💧 Humidity</TableCell>
                          <TableCell align="center" sx={{ py: 1 }}>🌧️ Rain</TableCell>
                          <TableCell sx={{ py: 1 }}>📝 Description</TableCell>
                        </>
                      )}
                      {!debugMode && (
                        <>
                          <TableCell align="center" sx={{ py: 1 }}>💧 Gnome&apos;s Word</TableCell>
                          <TableCell sx={{ py: 1 }}>💭 Gnome&apos;s Musings</TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(debugMode ? weatherData : wateringAdvice?.daily || []).map((day, index) => {
                      const todayLocal = isClient ? getLocalDateString() : null;
                      const dayDate = debugMode ? day.date : day.date;
                      
                      if (debugMode) {
                        console.log('todayLocal', todayLocal, day.date);
                      }
                      
                      const isTodayRow = todayLocal && todayLocal === dayDate;
                      const isPast = todayLocal && dayDate < todayLocal;
                      
                      const weather = debugMode ? null : getWeatherDisplay(day.date);
                      
                      return (
                        <TableRow 
                          key={index}
                          className={isTodayRow ? 'today-row' : ''}
                          sx={{
                            backgroundColor: isTodayRow ? 'primary.light' : isPast ? 'grey.100' : 'inherit',
                            // Make past days smaller and less prominent
                            transform: isPast ? { xs: 'scale(0.92)', md: 'scale(0.95)' } : 'scale(1)',
                            opacity: isPast ? 0.7 : 1,
                            transformOrigin: 'left center',
                            '& .MuiTableCell-root': {
                              color: isTodayRow ? 'primary.contrastText' : 'inherit',
                              // Smaller padding and font for past days
                              py: isPast ? { xs: 0.5, md: 1 } : { xs: '8px 0', md: 1.5 },
                              fontSize: isPast ? { xs: '0.65rem', md: '0.7rem' } : { xs: '0.75rem', md: '0.75rem' }
                            }
                          }}
                        >
                          <TableCell data-label="Date" sx={{ py: 1 }}>
                            <Box>
                              <Typography 
                                variant="body2" 
                                fontWeight={isPast ? 400 : 600}
                                sx={{ 
                                  fontSize: isPast ? { xs: '0.65rem', md: '0.7rem' } : { xs: '0.75rem', md: '0.875rem' }
                                }}
                              >
                                {new Date(dayDate + 'T12:00:00').toLocaleDateString('en-US', { 
                                  weekday: 'short', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </Typography>
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ 
                                  fontSize: isPast ? { xs: '0.6rem', md: '0.65rem' } : { xs: '0.7rem', md: '0.75rem' }
                                }}
                              >
                                {dayDate}
                              </Typography>
                              {isTodayRow && (
                                <Chip label="TODAY" size="small" color="primary" sx={{ ml: 1, fontSize: '0.6rem', height: 16 }} />
                              )}
                              {isPast && (
                                <Chip 
                                  label="PAST" 
                                  size="small" 
                                  color="default" 
                                  sx={{ 
                                    ml: 1, 
                                    fontSize: { xs: '0.5rem', md: '0.55rem' }, 
                                    height: { xs: 12, md: 14 },
                                    '& .MuiChip-label': {
                                      px: 0.5
                                    }
                                  }} 
                                />
                              )}
                            </Box>
                          </TableCell>
                          
                          {/* Weather column - always shown */}
                          <TableCell data-label="Weather" align="center" sx={{ py: 1 }}>
                            {debugMode ? (
                              <Box display="flex" flexDirection="column" alignItems="center" gap={0.25}>
                                <Typography variant="body2" sx={{ textTransform: 'capitalize', fontSize: '0.7rem' }}>
                                  {day.description}
                                </Typography>
                              </Box>
                            ) : (
                              weather && (
                                <Box display="flex" flexDirection="column" alignItems="center" gap={0.25}>
                                  <Typography variant="h6" sx={{ fontSize: '1rem' }}>
                                    {weather.icon}
                                  </Typography>
                                  <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.7rem' }}>
                                    {weather.temp}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" textTransform="capitalize" sx={{ fontSize: '0.6rem', lineHeight: 1.1 }}>
                                    {weather.description}
                                  </Typography>
                                  {weather.rain && (
                                    <Typography variant="caption" color="info.main" sx={{ fontSize: '0.6rem' }}>
                                      {weather.rain}&quot; rain
                                    </Typography>
                                  )}
                                </Box>
                              )
                            )}
                          </TableCell>
                          
                          {/* Debug mode columns */}
                          {debugMode && (
                            <>
                              <TableCell data-label="High" align="center" sx={{ py: 1 }}>
                                <Typography variant="body2" fontWeight={600}>
                                  {Math.round(day.temp_max)}°
                                </Typography>
                              </TableCell>
                              <TableCell data-label="Low" align="center" sx={{ py: 1 }}>
                                <Typography variant="body2">
                                  {Math.round(day.temp_min)}°
                                </Typography>
                              </TableCell>
                              <TableCell data-label="Humidity" align="center" className="mobile-hide" sx={{ py: 1 }}>
                                <Typography variant="body2">
                                  {day.humidity}%
                                </Typography>
                              </TableCell>
                              <TableCell data-label="Rain" align="center" className="mobile-hide" sx={{ py: 1 }}>
                                <Typography 
                                  variant="body2" 
                                  color={day.rain > 0.1 ? 'info.main' : 'text.secondary'}
                                  fontWeight={day.rain > 0.1 ? 600 : 400}
                                >
                                  {day.rain.toFixed(2)}&quot;
                                </Typography>
                              </TableCell>
                              <TableCell data-label="Description" className="mobile-hide" sx={{ py: 1 }}>
                                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                  {day.description}
                                </Typography>
                              </TableCell>
                            </>
                          )}
                          
                          {/* AI mode columns */}
                          {!debugMode && (
                            <>
                              <TableCell data-label="Water?" align="center" sx={{ py: 1 }}>
                                {isPast ? (
                                  <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic', fontSize: '0.75rem' }}>
                                    Past
                                  </Typography>
                                ) : (() => {
                                  // Handle new API format with wateringStatus
                                  let status, color, icon;
                                  
                                  if (day.wateringStatus) {
                                    status = day.wateringStatus;
                                  } else {
                                    // Backward compatibility: map old format to new
                                    if (day.shouldWater) {
                                      if (day.priority === 'high' || day.wateringAmount === 'heavy') {
                                        status = 'yes';
                                      } else if (day.priority === 'medium' || day.wateringAmount === 'moderate') {
                                        status = 'maybe';
                                      } else {
                                        status = 'yes';
                                      }
                                    } else {
                                      status = 'no';
                                    }
                                  }
                                  
                                  let chipStyles = {};
                                  switch (status) {
                                    case 'yes':
                                      color = 'info';
                                      icon = <WaterDrop />;
                                      chipStyles = {
                                        bgcolor: '#7B8FA3',
                                        color: 'white',
                                        fontSize: '0.7rem'
                                      };
                                      break;
                                    case 'maybe':
                                      color = 'warning';
                                      icon = <WaterDrop />;
                                      chipStyles = {
                                        bgcolor: '#B8956B',
                                        color: 'white',
                                        fontSize: '0.7rem'
                                      };
                                      break;
                                    case 'no':
                                      color = 'success';
                                      icon = <Block />;
                                      chipStyles = {
                                        bgcolor: '#6B7B5C',
                                        color: 'white',
                                        fontSize: '0.7rem'
                                      };
                                      break;
                                    default:
                                      color = 'default';
                                      icon = <Block />;
                                      status = 'no';
                                      chipStyles = {
                                        bgcolor: '#6B7B5C',
                                        color: 'white',
                                        fontSize: '0.7rem'
                                      };
                                  }
                                  
                                  return (
                                    <Chip
                                      icon={icon}
                                      label={status.charAt(0).toUpperCase() + status.slice(1)}
                                      size="small"
                                      sx={chipStyles}
                                    />
                                  );
                                })()}
                              </TableCell>
                              <TableCell data-label="Reasoning" sx={{ py: 1 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.3 }}>
                                  {day.reason}
                                </Typography>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {debugMode && (
                <Alert 
                  severity="info" 
                  sx={{ 
                    mt: 2,
                    borderRadius: '6px',
                    border: '1px solid #E0E8D6',
                    bgcolor: '#F9FBF7',
                    boxShadow: '0 1px 4px rgba(107, 123, 92, 0.04)',
                    '& .MuiAlert-icon': {
                      color: '#6B7B5C'
                    }
                  }}
                >
                  <Typography variant="body2" sx={{ lineHeight: 1.6, color: '#6B7B5C' }}>
                    <strong>Gnome Weather Notes:</strong> Raw weather data from {weatherAPI} API. 
                    {wateringAdvice ? 'Gnome advice is also available.' : 'Turn off debug mode to get gnome watering wisdom.'}
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* AI Disclaimer */}
        <Box 
          sx={{ 
            mt: 4,
            p: 3,
            borderRadius: '8px',
            bgcolor: '#FDF8F6',
            border: '1px solid #E8D4CC',
            textAlign: 'center'
          }}
        >
          <Typography variant="body2" sx={{ 
            color: '#A0725C',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            fontStyle: 'italic'
          }}>
            <strong>Gnome&apos;s Note:</strong> This friendly garden helper uses AI magic to provide watering advice. 
            While I&apos;ve learned much in my centuries of garden watching, I can still make mistakes! 
            Always check your soil, consider your plants&apos; specific needs, and trust your own gardening instincts too. 🌱
          </Typography>
        </Box>

      </Container>
    </>
  );
}
