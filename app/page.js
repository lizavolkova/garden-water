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
} from '@mui/icons-material';

export default function Home() {
  const [zipCode, setZipCode] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [wateringAdvice, setWateringAdvice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [temperatureUnit, setTemperatureUnit] = useState('fahrenheit');
  const [weatherAPI, setWeatherAPI] = useState('openweather');

  // Temperature utility functions
  const convertFahrenheitToCelsius = (fahrenheit) => {
    return (fahrenheit - 32) * 5 / 9;
  };
  
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
  
  const setCachedData = useCallback((zipCode, weather, advice) => {
    try {
      const cacheKey = getCacheKey(zipCode);
      const data = {
        weather,
        advice,
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
          setWateringAdvice(cachedData.advice);
          localStorage.setItem('gardenWateringZipCode', zip);
          setLoading(false);
          setInitialLoad(false);
          return;
        }
      }
      
      // Fetch fresh data
      const response = await fetch(`/api/weather-advice?zipCode=${zip}&weatherAPI=${weatherAPI}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch weather data');
      }
      
      setWeatherData(data.weather);
      setWateringAdvice(data.advice);
      
      // Save to cache and localStorage
      setCachedData(zip, data.weather, data.advice);
      localStorage.setItem('gardenWateringZipCode', zip);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [weatherAPI, getCachedData, setCachedData]);
  
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

  const handleWeatherAPIChange = (event, newAPI) => {
    if (newAPI !== null) {
      setWeatherAPI(newAPI);
      saveWeatherAPIPreference(newAPI);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };

  const isToday = (dateString) => {
    const today = new Date();
    const checkDate = new Date(dateString);
    return today.toDateString() === checkDate.toDateString();
  };

  const getTodaysRecommendation = () => {
    if (!wateringAdvice?.dailyRecommendations) return null;
    
    return wateringAdvice.dailyRecommendations.find(day => isToday(day.date));
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
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Weather Source
                </Typography>
                <ToggleButtonGroup
                  value={weatherAPI}
                  exclusive
                  onChange={handleWeatherAPIChange}
                  size="small"
                  sx={{ bgcolor: 'background.paper', borderRadius: 1, flexWrap: 'wrap' }}
                >
                  <ToggleButton value="openweather" sx={{ px: 1.5, minWidth: 'auto' }}>
                    <CloudQueue sx={{ mr: 0.5, fontSize: '0.9rem' }} />
                    <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>OpenWeather</Typography>
                  </ToggleButton>
                  <ToggleButton value="nws" sx={{ px: 1.5, minWidth: 'auto' }}>
                    <Public sx={{ mr: 0.5, fontSize: '0.9rem' }} />
                    <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>NWS</Typography>
                  </ToggleButton>
                  <ToggleButton value="openmeteo" sx={{ px: 1.5, minWidth: 'auto' }}>
                    <WbSunny sx={{ mr: 0.5, fontSize: '0.9rem' }} />
                    <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>Open-Meteo</Typography>
                  </ToggleButton>
                  <ToggleButton value="visualcrossing" sx={{ px: 1.5, minWidth: 'auto' }}>
                    <Cloud sx={{ mr: 0.5, fontSize: '0.9rem' }} />
                    <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>Visual Crossing</Typography>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
              
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
                {loading ? 'Analyzing...' : 'Get AI Advice'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        {wateringAdvice && (
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
              
              {/* Today's Action Card */}
              {(() => {
                const todaysRec = getTodaysRecommendation();
                if (!todaysRec) return null;
                
                const todaysWeather = getWeatherDisplay(todaysRec.date);
                
                // Get watering status
                let status, color, icon;
                if (todaysRec.wateringStatus) {
                  status = todaysRec.wateringStatus;
                } else {
                  // Backward compatibility
                  if (todaysRec.shouldWater) {
                    if (todaysRec.priority === 'high' || todaysRec.wateringAmount === 'heavy') {
                      status = 'yes';
                    } else if (todaysRec.priority === 'medium' || todaysRec.wateringAmount === 'moderate') {
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
                    color = 'info'; // We'll override this with custom styles
                    icon = <WaterDrop />;
                    chipStyles = {
                      background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                      color: 'white',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)',
                      }
                    };
                    break;
                  case 'maybe':
                    color = 'warning'; // We'll override this with custom styles
                    icon = <WaterDrop />;
                    chipStyles = {
                      background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                      color: 'white',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)',
                      }
                    };
                    break;
                  case 'no':
                    color = 'success'; // We'll override this with custom styles
                    icon = <Block />;
                    chipStyles = {
                      background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
                      color: 'white',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #388E3C 0%, #2E7D32 100%)',
                      }
                    };
                    break;
                  default:
                    color = 'default';
                    icon = <Block />;
                    status = 'no';
                    chipStyles = {
                      background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
                      color: 'white',
                    };
                }

                return (
                  <Card sx={{ mb: 4, border: '3px solid', borderColor: 'primary.main', backgroundColor: 'primary.light' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 700, color: 'primary.dark' }}>
                        🌱 Today's Garden Action
                      </Typography>
                      
                      <Box display="flex" alignItems="center" gap={3} sx={{ mb: 2 }}>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Typography variant="h6" fontWeight={600}>
                            {formatDate(todaysRec.date)}
                          </Typography>
                          {todaysWeather && (
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="h6" sx={{ fontSize: '1.5rem' }}>
                                {todaysWeather.icon}
                              </Typography>
                              <Typography variant="body1" fontWeight={600}>
                                {todaysWeather.temp}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        
                        <Box sx={{ flex: 1 }} />
                        
                        <Chip
                          icon={icon}
                          label={`${status.charAt(0).toUpperCase() + status.slice(1)} Water`}
                          size="large"
                          sx={{ 
                            fontWeight: 700, 
                            fontSize: '1.1rem',
                            height: 40,
                            transform: 'scale(1.1)',
                            boxShadow: 3,
                            ...chipStyles
                          }}
                        />
                      </Box>
                      
                      <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        {todaysRec.reason}
                      </Typography>
                    </CardContent>
                  </Card>
                );
              })()}
              
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
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>📅 Date</TableCell>
                        <TableCell align="center">🌤️ Weather</TableCell>
                        <TableCell align="center">💧 Water?</TableCell>
                        <TableCell>💭 Reasoning</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {wateringAdvice.dailyRecommendations?.map((day, index) => {
                        const weather = getWeatherDisplay(day.date);
                        const todayRow = isToday(day.date);
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
                            } : {}}
                          >
                            <TableCell>
                              <Typography component="div" variant="body2" fontWeight={600}>
                                {formatDate(day.date)}
                                {todayRow && (
                                  <Chip 
                                    label="TODAY" 
                                    size="small" 
                                    color="secondary"
                                    sx={{ ml: 1, fontSize: '0.6rem', height: 20 }}
                                  />
                                )}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              {weather && (
                                <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
                                  <Typography variant="h6" sx={{ fontSize: '1.2rem' }}>
                                    {weather.icon}
                                  </Typography>
                                  <Typography variant="caption" fontWeight={600}>
                                    {weather.temp}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" textTransform="capitalize" sx={{ fontSize: '0.65rem', lineHeight: 1.1 }}>
                                    {weather.description}
                                  </Typography>
                                  {weather.rain && (
                                    <Typography variant="caption" color="info.main" sx={{ fontSize: '0.65rem' }}>
                                      {weather.rain} rain
                                    </Typography>
                                  )}
                                </Box>
                              )}
                            </TableCell>
                            <TableCell align="center">
                              {(() => {
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
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
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
                {wateringAdvice.dailyRecommendations?.map((day, index) => {
                  const weather = getWeatherDisplay(day.date);
                  
                  // Get watering status for mobile display
                  let status, color, icon;
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
                  
                  let mobileChipStyles = {};
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

                  const todayCard = isToday(day.date);
                  
                  return (
                    <Paper 
                      key={index} 
                      sx={{ 
                        p: 2, 
                        mb: 2, 
                        border: todayCard ? '3px solid' : '2px solid transparent',
                        borderColor: todayCard ? 'primary.main' : 'transparent',
                        backgroundColor: todayCard ? 'primary.light' : 'background.paper',
                        boxShadow: todayCard ? 4 : 1,
                      }}
                    >
                      {/* Header Row: Date and Watering Status */}
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography component="div" variant="body2" fontWeight={600} color="text.secondary" sx={{ fontSize: '16px' }}>
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
                        <Typography variant="body2" color="text.secondary" sx={{ flex: 1, fontSize: '0.8rem', lineHeight: 1.3 }}>
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

        {weatherData && (
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" alignItems="center" gap={2} mb={4}>
                <Avatar sx={{ bgcolor: 'secondary.main', width: 56, height: 56 }}>
                  <WbSunny fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h2" component="h2">
                    Weather Forecast
                  </Typography>
                  <Chip 
                    label="7-DAY OUTLOOK" 
                    color="secondary" 
                    variant="outlined" 
                    size="small"
                  />
                </Box>
              </Box>
              
              {/* Desktop: Horizontal scroll, Mobile: Grid layout */}
              <Box 
                sx={{ 
                  // Desktop layout (horizontal scroll)
                  display: { xs: 'none', sm: 'flex' },
                  gap: 2, 
                  overflowX: 'auto',
                  pb: 1,
                  '&::-webkit-scrollbar': {
                    height: 8,
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    borderRadius: 4,
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'primary.main',
                    borderRadius: 4,
                  }
                }}
              >
                {weatherData.map((day, index) => {
                  const getWeatherIcon = () => {
                    if (day.description.includes('rain')) return <Umbrella />;
                    if (day.description.includes('cloud')) return <Cloud />;
                    if (day.description.includes('clear')) return <WbSunny />;
                    return <WbSunny />;
                  };

                  return (
                    <Paper 
                      key={index}
                      elevation={1} 
                      sx={{ 
                        minWidth: 160,
                        width: 160,
                        height: 200,
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textAlign: 'center',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          elevation: 4,
                        }
                      }}
                    >
                      <Typography variant="body2" fontWeight={600} color="text.secondary">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </Typography>
                      
                      <Avatar sx={{ bgcolor: 'primary.light', width: 48, height: 48, mb: 1 }}>
                        {getWeatherIcon()}
                      </Avatar>
                      
                      <Typography variant="body2" color="text.secondary" textTransform="capitalize" sx={{ fontSize: '0.75rem', lineHeight: 1.2, mb: 1 }}>
                        {day.description}
                      </Typography>
                      
                      <Box>
                        <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1rem' }}>
                          {formatTemperature(day.temp_max)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {formatTemperature(day.temp_min)}
                        </Typography>
                      </Box>
                      
                      <Box display="flex" flexDirection="column" gap={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          {day.humidity}% humidity
                        </Typography>
                        {day.rain > 0 && (
                          <Typography variant="caption" color="info.main">
                            {day.rain.toFixed(1)} rain
                          </Typography>
                        )}
                      </Box>
                    </Paper>
                  );
                })}
              </Box>

              {/* Mobile: Vertical stack layout */}
              <Box 
                sx={{ 
                  display: { xs: 'block', sm: 'none' },
                  gap: 2
                }}
              >
                {weatherData.map((day, index) => {
                  const getWeatherIcon = () => {
                    if (day.description.includes('rain')) return <Umbrella />;
                    if (day.description.includes('cloud')) return <Cloud />;
                    if (day.description.includes('clear')) return <WbSunny />;
                    return <WbSunny />;
                  };

                  return (
                    <Paper 
                      key={`mobile-${index}`}
                      elevation={1} 
                      sx={{ 
                        p: 2,
                        mb: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          elevation: 2,
                        }
                      }}
                    >
                      {/* Date */}
                      <Box sx={{ minWidth: 80 }}>
                        <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </Typography>
                      </Box>
                      
                      {/* Weather Icon */}
                      <Avatar sx={{ bgcolor: 'primary.light', width: 36, height: 36 }}>
                        {getWeatherIcon()}
                      </Avatar>
                      
                      {/* Temperature */}
                      <Box sx={{ minWidth: 60 }}>
                        <Typography variant="body1" fontWeight={600} sx={{ fontSize: '0.9rem' }}>
                          {formatTemperature(day.temp_max)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          {formatTemperature(day.temp_min)}
                        </Typography>
                      </Box>
                      
                      {/* Description and Details */}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.primary" textTransform="capitalize" sx={{ fontSize: '0.8rem', lineHeight: 1.2, mb: 0.5 }}>
                          {day.description}
                        </Typography>
                        <Box display="flex" gap={2}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {day.humidity}% humidity
                          </Typography>
                          {day.rain > 0 && (
                            <Typography variant="caption" color="info.main" sx={{ fontSize: '0.7rem' }}>
                              {day.rain.toFixed(1)} rain
                            </Typography>
                          )}
                        </Box>
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
