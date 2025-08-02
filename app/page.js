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
  const [weatherAPI, setWeatherAPI] = useState('openweather');
  const [debugMode, setDebugMode] = useState(false);

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
    return localStorage.getItem('gardenWateringWeatherAPI') || 'openweather';
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
      const twentyFourHours = 24 * 60 * 60 * 1000;
      
      // Check if cache is older than 24 hours OR if it's from a different day
      const cacheDate = new Date(data.timestamp).toDateString();
      const todayDate = new Date().toDateString();
      
      if (cacheAge > twentyFourHours || cacheDate !== todayDate) {
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
  
  // Load saved preferences on component mount
  useEffect(() => {
    const savedTempUnit = loadTemperaturePreference();
    const savedWeatherAPI = loadWeatherAPIPreference();
    
    setTemperatureUnit(savedTempUnit);
    setWeatherAPI(savedWeatherAPI);
  }, []);

  // Load saved location and fetch data after weatherAPI is set
  useEffect(() => {
    // Only run after weatherAPI has been initialized (not default value)
    if (weatherAPI === 'openweather' && !localStorage.getItem('gardenWateringWeatherAPI')) {
      return; // Still initializing, default value
    }
    
    const savedZipCode = localStorage.getItem('gardenWateringZipCode');
    
    if (savedZipCode) {
      setZipCode(savedZipCode);
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
      rain: weatherDay.rain > 0 ? `${weatherDay.rain.toFixed(1)}"` : null
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
                sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
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
              bgcolor: 'primary.main',
              fontSize: '2rem',
              boxShadow: 3,
            }}
          >
            🌿
          </Avatar>
          
          <Typography variant="h1" component="h1" gutterBottom>
            Garden Watering Assistant
          </Typography>
          
          <Box display="flex" alignItems="center" justifyContent="center" gap={2} mb={3}>
            <Divider sx={{ flex: 1, maxWidth: 100 }} />
            <Chip 
              icon={<SmartToy />} 
              label="AI POWERED" 
              color="primary" 
              variant="outlined"
              size="small"
            />
            <Divider sx={{ flex: 1, maxWidth: 100 }} />
          </Box>
          
          <Typography variant="body1" color="text.secondary" maxWidth="md" mx="auto">
            Harness the power of artificial intelligence to make informed watering decisions for your vegetable garden, 
            combining weather forecasts with expert gardening knowledge.
          </Typography>
        </Box>

        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={3} alignItems="flex-end">
              <TextField
                fullWidth
                label="Location ZIP Code"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="e.g., 10562"
                InputProps={{
                  startAdornment: <LocationOn color="primary" sx={{ mr: 1 }} />,
                }}
                variant="outlined"
              />
              
              {/* Weather API Selection */}
              <FormControl sx={{ minWidth: 160 }}>
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
              
              {/* Debug Mode Toggle */}
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
              
              <Button
                variant="contained"
                size="large"
                onClick={fetchWeatherAndAdvice}
                disabled={loading || !zipCode}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SmartToy />}
                sx={{ 
                  minWidth: 180,
                  height: 56,
                  whiteSpace: 'nowrap',
                }}
              >
{loading ? 'Fetching...' : debugMode ? 'Get Weather Data' : 'Get AI Advice'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        {todayAdvice && (
          <Card sx={{ 
            mb: 4, 
            border: '2px solid', 
            borderColor: todayAdvice.shouldWater === 'yes' ? 'info.main' : 
                        todayAdvice.shouldWater === 'maybe' ? 'warning.main' : 'success.main',
            background: todayAdvice.shouldWater === 'yes' ? 
              'linear-gradient(135deg, rgba(33, 150, 243, 0.08) 0%, rgba(25, 118, 210, 0.12) 100%)' : 
              todayAdvice.shouldWater === 'maybe' ? 
              'linear-gradient(135deg, rgba(255, 152, 0, 0.08) 0%, rgba(245, 124, 0, 0.12) 100%)' : 
              'linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(56, 142, 60, 0.12) 100%)'
          }}>
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Avatar sx={{ 
                  bgcolor: todayAdvice.shouldWater === 'yes' ? 'info.main' : 
                           todayAdvice.shouldWater === 'maybe' ? 'warning.main' : 'success.main',
                  width: 48, 
                  height: 48 
                }}>
                  <WaterDrop />
                </Avatar>
                <Box>
                  <Typography variant="h5" component="h2" color={
                    todayAdvice.shouldWater === 'yes' ? 'info.main' : 
                    todayAdvice.shouldWater === 'maybe' ? 'warning.main' : 'success.main'
                  }>
                    Should I Water Today?
                  </Typography>
                </Box>
              </Box>
              
              {/* Main watering decision in prominent card */}
              <Paper elevation={3} sx={{
                p: 3,
                mb: 3,
                background: todayAdvice.shouldWater === 'yes' ? 
                  'linear-gradient(135deg, rgba(33, 150, 243, 0.15) 0%, rgba(25, 118, 210, 0.25) 100%)' : 
                  todayAdvice.shouldWater === 'maybe' ? 
                  'linear-gradient(135deg, rgba(255, 152, 0, 0.15) 0%, rgba(245, 124, 0, 0.25) 100%)' : 
                  'linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(56, 142, 60, 0.25) 100%)',
                border: '2px solid',
                borderColor: todayAdvice.shouldWater === 'yes' ? 'info.main' : 
                            todayAdvice.shouldWater === 'maybe' ? 'warning.main' : 'success.main',
                borderRadius: 3,
                textAlign: 'center'
              }}>
                <Typography variant="h2" sx={{ 
                  fontWeight: 700, 
                  fontSize: { xs: '1.75rem', sm: '2.25rem' },
                  mb: 2,
                  color: todayAdvice.shouldWater === 'yes' ? 'info.dark' : 
                         todayAdvice.shouldWater === 'maybe' ? 'warning.dark' : 'success.dark'
                }}>
                  {todayAdvice.shouldWater === 'yes' ? '💧 Yes, Water Today' : 
                   todayAdvice.shouldWater === 'maybe' ? '🤔 Maybe Water Today' : 
                   '🚫 No, Skip Watering Today'}
                </Typography>
                <Typography variant="h6" sx={{ 
                  fontWeight: 500,
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  color: 'text.primary',
                  lineHeight: 1.4
                }}>
                  {todayAdvice.reason}
                </Typography>
              </Paper>
              
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
              
              {/* Confidence level moved to bottom */}
              <Box display="flex" justifyContent="center">
                <Chip
                  label={`${todayAdvice.confidence} confidence`}
                  color={todayAdvice.confidence === 'high' ? 'success' : 
                         todayAdvice.confidence === 'medium' ? 'warning' : 'default'}
                  size="small"
                  variant="outlined"
                  sx={{ opacity: 0.6, fontSize: '0.7rem' }}
                />
              </Box>
            </CardContent>
          </Card>
        )}

        {weatherData && debugMode && (
          <Card sx={{ mb: 4, border: '2px solid', borderColor: 'warning.main' }}>
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
                              {day.rain.toFixed(2)}"
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
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Debug Mode:</strong> Showing raw weather data from {weatherAPI} API without AI analysis. 
                  Turn off debug mode to get watering recommendations.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        )}

        {wateringAdvice && !debugMode && (
          <Card sx={{ mb: 4 }}>
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  <SmartToy fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h2" component="h2">
                    AI Watering Recommendations
                  </Typography>
                  <Chip 
                    label="INTELLIGENT GARDEN CARE" 
                    color="primary" 
                    variant="outlined" 
                    size="small"
                  />
                </Box>
              </Box>
              <Alert severity="info" sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Weekly Overview
                </Typography>
                <Typography variant="body2">
                  {wateringAdvice.weekSummary}
                </Typography>
              </Alert>
              
              {/* Desktop Table View */}
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <TableContainer component={Paper}>
                  <Table size="small">
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
                                      background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                                      color: 'white',
                                    };
                                    break;
                                  case 'maybe':
                                    color = 'warning';
                                    icon = <WaterDrop />;
                                    desktopChipStyles = {
                                      background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                                      color: 'white',
                                    };
                                    break;
                                  case 'no':
                                    color = 'success';
                                    icon = <Block />;
                                    desktopChipStyles = {
                                      background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
                                      color: 'white',
                                    };
                                    break;
                                  default:
                                    color = 'default';
                                    icon = <Block />;
                                    status = 'no';
                                    desktopChipStyles = {
                                      background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
                                      color: 'white',
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
                          background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                          color: 'white',
                        };
                        break;
                      case 'maybe':
                        color = 'warning';
                        icon = <WaterDrop />;
                        mobileChipStyles = {
                          background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                          color: 'white',
                        };
                        break;
                      case 'no':
                        color = 'success';
                        icon = <Block />;
                        mobileChipStyles = {
                          background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
                          color: 'white',
                        };
                        break;
                      default:
                        color = 'default';
                        icon = <Block />;
                        status = 'no';
                        mobileChipStyles = {
                          background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
                          color: 'white',
                        };
                    }
                  }
                  
                  return (
                    <Paper 
                      key={index} 
                      sx={{ 
                        p: 2, 
                        mb: 2, 
                        border: todayCard ? '3px solid' : '2px solid transparent',
                        borderColor: todayCard ? 'primary.main' : 'transparent',
                        backgroundColor: todayCard ? 'primary.light' : pastCard ? 'grey.100' : 'background.paper',
                        boxShadow: todayCard ? 4 : 1,
                        opacity: pastCard ? 0.6 : 1,
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
