"use client";

import { useState } from 'react';
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
} from '@mui/icons-material';

export default function Home() {
  const [zipCode, setZipCode] = useState('10562');
  const [weatherData, setWeatherData] = useState(null);
  const [wateringAdvice, setWateringAdvice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWeatherAndAdvice = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/weather-advice?zipCode=${zipCode}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch weather data');
      }
      
      setWeatherData(data.weather);
      setWateringAdvice(data.advice);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };

  const getWateringIcon = (shouldWater) => {
    return shouldWater ? '💧' : '🚫';
  };

  return (
    <>
      <Head>
        <title>Garden Watering Assistant</title>
        <meta name="description" content="AI-powered garden watering recommendations based on weather forecast" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box textAlign="center" mb={6}>
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
              
              <Alert severity="info" sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Weekly Overview
                </Typography>
                <Typography variant="body2">
                  {wateringAdvice.weekSummary}
                </Typography>
              </Alert>
              
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>📅 Date</TableCell>
                      <TableCell align="center">💧 Water?</TableCell>
                      <TableCell align="center">🌊 Amount</TableCell>
                      <TableCell align="center">⚡ Priority</TableCell>
                      <TableCell>💭 Reasoning</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {wateringAdvice.dailyRecommendations?.map((day, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {formatDate(day.date)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={day.shouldWater ? <WaterDrop /> : <Block />}
                            label={day.shouldWater ? 'Yes' : 'No'}
                            color={day.shouldWater ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={day.wateringAmount || 'N/A'}
                            color={
                              day.wateringAmount === 'heavy' ? 'info' :
                              day.wateringAmount === 'moderate' ? 'success' :
                              'default'
                            }
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={day.priority || 'low'}
                            color={
                              day.priority === 'high' ? 'error' :
                              day.priority === 'medium' ? 'warning' :
                              'info'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {day.reason}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
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
                    label="5-DAY OUTLOOK" 
                    color="secondary" 
                    variant="outlined" 
                    size="small"
                  />
                </Box>
              </Box>
              
              <Grid container spacing={2}>
                {weatherData.map((day, index) => {
                  const getWeatherIcon = () => {
                    if (day.description.includes('rain')) return <Umbrella />;
                    if (day.description.includes('cloud')) return <Cloud />;
                    if (day.description.includes('clear')) return <WbSunny />;
                    return <WbSunny />;
                  };

                  return (
                    <Grid item xs={12} key={index}>
                      <Paper 
                        elevation={1} 
                        sx={{ 
                          p: 3, 
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            elevation: 4,
                            transform: 'translateY(-2px)'
                          }
                        }}
                      >
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box display="flex" alignItems="center" gap={2}>
                            <Avatar sx={{ bgcolor: 'primary.light' }}>
                              {getWeatherIcon()}
                            </Avatar>
                            <Box>
                              <Typography variant="h6" fontWeight={600}>
                                {formatDate(day.date)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" textTransform="capitalize">
                                {day.description}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Box textAlign="right">
                            <Typography variant="h5" fontWeight={700} gutterBottom>
                              {Math.round(day.temp_max)}°F / {Math.round(day.temp_min)}°F
                            </Typography>
                            <Box display="flex" gap={2} justifyContent="flex-end">
                              <Chip
                                icon={<Air />}
                                label={`${day.humidity}% humidity`}
                                size="small"
                                variant="outlined"
                              />
                              {day.rain > 0 && (
                                <Chip
                                  icon={<Umbrella />}
                                  label={`${day.rain.toFixed(2)}" rain`}
                                  size="small"
                                  color="info"
                                />
                              )}
                            </Box>
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </CardContent>
          </Card>
        )}
      </Container>
    </>
  );
}
