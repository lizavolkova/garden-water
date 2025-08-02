"use client";

import { useState, useEffect, useCallback } from 'react';
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

// Utility function to get local date in YYYY-MM-DD format (not UTC)
function getLocalDateString(date = new Date()) {
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
      // Check cache first unless forcing refresh or in debug mode
      if (!forceRefresh && !debugMode) {
        const cachedData = getCachedData(zip);
        if (cachedData) {
          setWeatherData(cachedData.weather);
          setWateringAdvice(cachedData.advice);
          setTodayAdvice(cachedData.todayAdvice || null);
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
    const today = getLocalDateString();
    return today === dateString;
  };

  const isPastDate = (dateString) => {
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
        <title>Garden Watering Assistant</title>
        <meta name="description" content="AI-powered garden watering recommendations based on weather forecast" />
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

          <Avatar
            sx={{
              width: 80,
              height: 80,
              margin: '0 auto 24px',
              bgcolor: '#6B7B5C',
              fontSize: '2.2rem',
              boxShadow: '0 2px 8px rgba(107, 123, 92, 0.15)',
              borderRadius: 1
            }}
          >
            🌿
          </Avatar>
          
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
            Waterwise Gardening
          </Typography>
          
          <Box display="flex" alignItems="center" justifyContent="center" gap={2} mb={3}>
            <Chip 
              label="Smart Plant Care" 
              sx={{
                bgcolor: '#F4F6F0',
                color: '#6B7B5C',
                fontWeight: 400,
                fontSize: '0.75rem',
                border: '1px solid #D7E0CC',
                borderRadius: '4px',
                fontStyle: 'italic'
              }}
            />
          </Box>
          
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
            Nurture your garden with intelligent watering guidance rooted in nature&apos;s wisdom
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
                label="Garden Location"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="Enter ZIP code"
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
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <LocalFlorist sx={{ fontSize: '1.1rem' }} />}
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
                {loading ? 'Analyzing...' : debugMode ? 'Get Weather Data' : 'Get Garden Advice'}
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
              border: '1.5px solid',
              borderColor: todayAdvice.shouldWater === 'yes' ? '#7B8FA3' : 
                          todayAdvice.shouldWater === 'maybe' ? '#B8956B' : '#6B7B5C'
            }}>
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Avatar sx={{ 
                  bgcolor: todayAdvice.shouldWater === 'yes' ? '#7B8FA3' : 
                           todayAdvice.shouldWater === 'maybe' ? '#B8956B' : '#6B7B5C',
                  width: 52, 
                  height: 52,
                  borderRadius: '8px'
                }}>
                  <WaterDrop sx={{ fontSize: '1.3rem' }} />
                </Avatar>
                <Box>
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
                    Today&apos;s Garden Care
                  </Typography>
                </Box>
              </Box>
              
              {/* Main watering decision in prominent card */}
              <Paper sx={{
                p: 4,
                mb: 3,
                bgcolor: todayAdvice.shouldWater === 'yes' ? '#F4F7FA' : 
                        todayAdvice.shouldWater === 'maybe' ? '#FAF7F0' : '#F6F9F4',
                borderRadius: '10px',
                textAlign: 'center',
                boxShadow: '0 2px 12px rgba(107, 123, 92, 0.08)',
                border: '1px solid',
                borderColor: todayAdvice.shouldWater === 'yes' ? '#D6E3F0' : 
                            todayAdvice.shouldWater === 'maybe' ? '#E8DCC9' : '#E0E8D6'
              }}>
                <Typography variant="h2" sx={{ 
                  fontWeight: 500, 
                  fontSize: { xs: '1.4rem', sm: '1.6rem' },
                  mb: 2,
                  color: todayAdvice.shouldWater === 'yes' ? '#4A6B7A' : 
                         todayAdvice.shouldWater === 'maybe' ? '#8B7355' : '#4A5D3A',
                  fontFamily: 'serif'
                }}>
                  {todayAdvice.shouldWater === 'yes' ? '🌿 Water your garden today' : 
                   todayAdvice.shouldWater === 'maybe' ? '🌱 Consider watering today' : 
                   '🍂 Let your garden rest today'}
                </Typography>
                <Typography variant="body1" sx={{ 
                  fontWeight: 400,
                  fontSize: { xs: '0.95rem', sm: '1rem' },
                  color: '#6B7B5C',
                  lineHeight: 1.6,
                  fontStyle: 'italic'
                }}>
                  {todayAdvice.reason}
                </Typography>
              </Paper>
              
              {/* Key factors - only show in debug mode */}
              {isDebugMode && todayAdvice.keyFactors && todayAdvice.keyFactors.length > 0 && (
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
              
              {/* Confidence level - only show in debug mode */}
              {isDebugMode && (
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
              )}
            </CardContent>
          </Card>
        )}

        {weatherData && debugMode && (
          <Card 
            sx={{ 
              mb: 4, 
              border: '1.5px solid', 
              borderColor: '#B8956B',
              bgcolor: '#FAF7F0',
              borderRadius: '12px',
              boxShadow: '0 2px 16px rgba(184, 149, 107, 0.08)'
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
                  <BugReport fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h2" component="h2" color="warning.main">
                    Debug: Raw Weather Data
                  </Typography>
                  <Chip 
                    label={`SOURCE: ${weatherAPI.toUpperCase()}`}
                    color="warning" 
                    variant="outlined" 
                    size="small"
                  />
                </Box>
              </Box>
              
              <TableContainer component={Paper} sx={{ mb: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Date</strong></TableCell>
                      <TableCell align="center"><strong>High °F</strong></TableCell>
                      <TableCell align="center"><strong>Low °F</strong></TableCell>
                      <TableCell align="center"><strong>Humidity %</strong></TableCell>
                      <TableCell align="center"><strong>Rain (inches)</strong></TableCell>
                      <TableCell><strong>Description</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {weatherData.map((day, index) => {
                      const todayLocal = getLocalDateString();
                      const isTodayRow = todayLocal === day.date;
                      const isPast = new Date(day.date) < new Date(todayLocal);
                      
                      
                      return (
                        <TableRow 
                          key={index}
                          sx={{
                            backgroundColor: isTodayRow ? 'primary.light' : isPast ? 'grey.100' : 'inherit',
                            '& .MuiTableCell-root': {
                              color: isTodayRow ? 'primary.contrastText' : 'inherit'
                            }
                          }}
                        >
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { 
                                  weekday: 'short', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {day.date}
                              </Typography>
                              {isTodayRow && (
                                <Chip label="TODAY" size="small" color="primary" sx={{ ml: 1, fontSize: '0.6rem', height: 16 }} />
                              )}
                              {isPast && (
                                <Chip label="PAST" size="small" color="default" sx={{ ml: 1, fontSize: '0.6rem', height: 16 }} />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight={600}>
                              {Math.round(day.temp_max)}°
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {Math.round(day.temp_min)}°
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {day.humidity}%
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography 
                              variant="body2" 
                              color={day.rain > 0.1 ? 'info.main' : 'text.secondary'}
                              fontWeight={day.rain > 0.1 ? 600 : 400}
                            >
                              {day.rain.toFixed(2)};
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                              {day.description}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              
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
                  <strong>Debug Mode:</strong> Showing raw weather data from {weatherAPI} API without garden analysis. 
                  Turn off debug mode to get watering recommendations.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        )}

        {wateringAdvice && !debugMode && (
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
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Avatar sx={{ 
                  bgcolor: '#6B7B5C', 
                  width: 52, 
                  height: 52,
                  borderRadius: '8px'
                }}>
                  <WbSunny sx={{ fontSize: '1.3rem' }} />
                </Avatar>
                <Box>
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
                    Garden Care Calendar
                  </Typography>
                </Box>
              </Box>
              <Alert 
                severity="info" 
                sx={{ 
                  mb: 3,
                  borderRadius: '8px',
                  bgcolor: '#F9FBF7',
                  border: '1px solid #E0E8D6',
                  boxShadow: '0 1px 8px rgba(107, 123, 92, 0.06)',
                  '& .MuiAlert-icon': {
                    color: '#6B7B5C'
                  }
                }}
              >
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500, color: '#4A5D3A' }}>
                  This Week&apos;s Wisdom
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.6, color: '#6B7B5C', fontStyle: 'italic' }}>
                  {wateringAdvice.weekSummary}
                </Typography>
              </Alert>
              
              {/* Desktop Table View */}
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <TableContainer 
                component={Paper}
                sx={{
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
                      '& .MuiTableHead-root': {
                        '& .MuiTableCell-root': {
                          backgroundColor: '#F9FBF7',
                          fontWeight: 500,
                          fontSize: '0.8rem',
                          color: '#4A5D3A',
                          borderBottom: '1px solid #E8EDE4',
                          fontFamily: 'serif',
                          py: 2
                        }
                      },
                      '& .MuiTableBody-root': {
                        '& .MuiTableRow-root': {
                          '&:hover': {
                            backgroundColor: '#FBFCFA'
                          },
                          '& .MuiTableCell-root': {
                            color: '#7A8471',
                            fontSize: '0.75rem',
                            py: 1.5,
                            borderBottom: '1px solid #F0F3EC'
                          }
                        }
                      }
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ py: 1 }}>📅 Date</TableCell>
                        <TableCell align="center" sx={{ py: 1 }}>🌤️ Weather</TableCell>
                        <TableCell align="center" sx={{ py: 1 }}>💧 Water?</TableCell>
                        <TableCell sx={{ py: 1 }}>💭 Reasoning</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {wateringAdvice.daily?.map((day, index) => {
                        const weather = getWeatherDisplay(day.date);
                        const todayRow = isToday(day.date);
                        const pastRow = isPastDate(day.date);
                        return (
                          <TableRow 
                            key={index} 
                            hover
                            sx={todayRow ? {
                              backgroundColor: 'primary.main',
                              '&:hover': {
                                backgroundColor: 'primary.dark',
                              },
                              '& .MuiTableCell-root': {
                                color: 'primary.contrastText',
                              }
                            } : pastRow ? {
                              backgroundColor: 'grey.100',
                              opacity: 0.6,
                              '& .MuiTableCell-root': {
                                color: 'text.disabled',
                              }
                            } : {}}
                          >
                            <TableCell sx={{ py: 1 }}>
                              <Typography component="div" variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>
                                {formatDate(day.date)}
                                {todayRow && (
                                  <Chip 
                                    label="TODAY" 
                                    size="small" 
                                    color="secondary"
                                    sx={{ ml: 1, fontSize: '0.6rem', height: 18 }}
                                  />
                                )}
                              </Typography>
                            </TableCell>
                            <TableCell align="center" sx={{ py: 1 }}>
                              {weather && (
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
                                      {weather.rain} rain
                                    </Typography>
                                  )}
                                </Box>
                              )}
                            </TableCell>
                            <TableCell align="center" sx={{ py: 1 }}>
                              {pastRow ? (
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
                                
                                let desktopChipStyles = {};
                                switch (status) {
                                  case 'yes':
                                    color = 'info';
                                    icon = <WaterDrop />;
                                    desktopChipStyles = {
                                      bgcolor: '#7B8FA3',
                                      color: 'white',
                                      fontSize: '0.7rem'
                                    };
                                    break;
                                  case 'maybe':
                                    color = 'warning';
                                    icon = <WaterDrop />;
                                    desktopChipStyles = {
                                      bgcolor: '#B8956B',
                                      color: 'white',
                                      fontSize: '0.7rem'
                                    };
                                    break;
                                  case 'no':
                                    color = 'success';
                                    icon = <Block />;
                                    desktopChipStyles = {
                                      bgcolor: '#6B7B5C',
                                      color: 'white',
                                      fontSize: '0.7rem'
                                    };
                                    break;
                                  default:
                                    color = 'default';
                                    icon = <Block />;
                                    status = 'no';
                                    desktopChipStyles = {
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
                                    sx={desktopChipStyles}
                                  />
                                );
                              })()}
                            </TableCell>
                            <TableCell sx={{ py: 1 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.3 }}>
                                {day.reason}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {/* Mobile Card View */}
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                {wateringAdvice.daily?.map((day, index) => {
                  const weather = getWeatherDisplay(day.date);
                  const todayCard = isToday(day.date);
                  const pastCard = isPastDate(day.date);
                  
                  // Get watering status for mobile display (only for non-past days)
                  let status, color, icon;
                  let mobileChipStyles = {};
                  
                  if (!pastCard) {
                    if (day.wateringStatus) {
                      status = day.wateringStatus;
                    } else {
                      // Backward compatibility
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
                    
                    switch (status) {
                      case 'yes':
                        color = 'info';
                        icon = <WaterDrop />;
                        mobileChipStyles = {
                          bgcolor: '#7B8FA3',
                          color: 'white',
                          fontSize: '0.75rem'
                        };
                        break;
                      case 'maybe':
                        color = 'warning';
                        icon = <WaterDrop />;
                        mobileChipStyles = {
                          bgcolor: '#B8956B',
                          color: 'white',
                          fontSize: '0.75rem'
                        };
                        break;
                      case 'no':
                        color = 'success';
                        icon = <Block />;
                        mobileChipStyles = {
                          bgcolor: '#6B7B5C',
                          color: 'white',
                          fontSize: '0.75rem'
                        };
                        break;
                      default:
                        color = 'default';
                        icon = <Block />;
                        status = 'no';
                        mobileChipStyles = {
                          bgcolor: '#6B7B5C',
                          color: 'white',
                          fontSize: '0.75rem'
                        };
                    }
                  }
                  
                  return (
                    <Paper 
                      key={index}
                      sx={{ 
                        p: 2.5, 
                        mb: 2, 
                        border: todayCard ? '1.5px solid' : '1px solid',
                        borderColor: todayCard ? '#6B7B5C' : '#E8EDE4',
                        bgcolor: todayCard ? '#F6F9F4' : pastCard ? '#F5F7F3' : '#FEFFFE',
                        borderRadius: '10px',
                        boxShadow: todayCard ? '0 3px 16px rgba(107, 123, 92, 0.12)' : '0 1px 8px rgba(107, 123, 92, 0.06)',
                        opacity: pastCard ? 0.7 : 1,
                        transition: 'all 0.15s ease-in-out',
                        '&:hover': {
                          transform: pastCard ? 'none' : 'translateY(-1px)',
                          boxShadow: pastCard ? '0 1px 8px rgba(107, 123, 92, 0.06)' : '0 4px 20px rgba(107, 123, 92, 0.1)'
                        }
                      }}
                    >
                      {/* Header Row: Date and Watering Status */}
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography component="div" variant="body2" fontWeight={600} color={pastCard ? "text.disabled" : "text.secondary"} sx={{ fontSize: '16px' }}>
                            {formatDate(day.date)}
                          </Typography>
                          {todayCard && (
                            <Chip 
                              label="TODAY" 
                              size="small" 
                              color="primary"
                              variant="filled"
                              sx={{ fontSize: '0.6rem', height: 20 }}
                            />
                          )}
                        </Box>
                        {pastCard ? (
                          <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic', fontSize: '0.875rem' }}>
                            Past
                          </Typography>
                        ) : (
                          <Chip
                            icon={icon}
                            label={status.charAt(0).toUpperCase() + status.slice(1)}
                            size={todayCard ? "large" : "medium"}
                            sx={{ 
                              fontWeight: 600, 
                              fontSize: todayCard ? '1rem' : '0.875rem',
                              ...mobileChipStyles,
                              ...(todayCard && {
                                boxShadow: 2,
                                transform: 'scale(1.05)'
                              })
                            }}
                          />
                        )}
                      </Box>
                      
                      {/* Content Row: Weather and Reasoning */}
                      <Box display="flex" gap={2} alignItems="flex-start">
                        {/* Compact Weather Info */}
                        {weather && (
                          <Box display="flex" alignItems="center" gap={1} sx={{ minWidth: 'fit-content' }}>
                            <Typography variant="body1" sx={{ fontSize: '1rem' }}>
                              {weather.icon}
                            </Typography>
                            <Box>
                              <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.7rem', display: 'block' }}>
                                {weather.temp}
                              </Typography>
                              {weather.rain && (
                                <Typography variant="caption" color="info.main" sx={{ fontSize: '0.65rem', display: 'block' }}>
                                  {weather.rain}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        )}
                        
                        {/* Reasoning */}
                        <Typography variant="body2" color={pastCard ? "text.disabled" : "text.secondary"} sx={{ flex: 1, fontSize: '0.8rem', lineHeight: 1.3 }}>
                          {day.reason}
                        </Typography>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        )}
      </Container>
    </>
  );
}
