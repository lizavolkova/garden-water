'use client';

import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Avatar, 
  Chip, 
  Grid,
  CircularProgress
} from '@mui/material';
import { 
  ChevronRight as ChevronRightIcon, 
  ExpandMore as ExpandMoreIcon,
  BugReport 
} from '@mui/icons-material';
import { useState } from 'react';
import { 
  getWateringDecision, 
  getFadedColor, 
  calculateFadeFactor 
} from '../utils/wateringUtils';
import { getLocalDateString } from '../utils/dateUtils';

export default function WeeklyTable({ 
  weatherData, 
  wateringAdvice, 
  debugMode, 
  weatherAPI, 
  getWeatherDisplay,
  isClient,
  loading 
}) {
  const [expandedCards, setExpandedCards] = useState(new Set());

  const toggleCardExpansion = (dayDate) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dayDate)) {
        newSet.delete(dayDate);
      } else {
        newSet.add(dayDate);
      }
      return newSet;
    });
  };

  const data = debugMode ? weatherData : wateringAdvice?.daily || [];
  
  // Show loading spinner when loading and no data
  if (loading && (!data || data.length === 0)) {
    return (
      <Card sx={{ mb: 4, p: 6, textAlign: 'center' }}>
        <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
          <CircularProgress 
            size={48} 
            sx={{ color: '#6B7B5C' }}
          />
          <Typography sx={{ color: '#7A8471', fontStyle: 'italic' }}>
            Consulting with the gnome wisdom...
          </Typography>
        </Box>
      </Card>  
    );
  }
  
  if (!data || data.length === 0) {
    return (
      <Card sx={{ mb: 4, p: 3, textAlign: 'center' }}>
        <Typography>No weather data available (data length: {data?.length || 0})</Typography>
      </Card>  
    );
  }

  return (
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
              fontWeight: 500,
              mb: 2
            }}>
              {wateringAdvice.weekSummary}
            </Typography>
            
            <Typography variant="caption" sx={{ 
              color: '#7A8471',
              fontSize: '0.75rem',
              fontStyle: 'italic',
              lineHeight: 1.4,
              display: 'block',
              textAlign: 'center',
              px: 1
            }}>
              💡 My gnome magic gets a bit hazy looking at the far-off days. Pop back tomorrow for a clearer story!
            </Typography>
          </Box>
        )}
        
        {/* Unified Responsive View */}
        <Box>
          {data.map((day, index) => {
            const todayLocal = isClient ? getLocalDateString() : null;
            const dayDate = debugMode ? day.date : day.date;
            const isTodayRow = todayLocal && todayLocal === dayDate;
            const isPast = todayLocal && dayDate < todayLocal;
            const weather = debugMode ? null : getWeatherDisplay(day.date);
            const isExpanded = expandedCards.has(dayDate);
            
            // Calculate fade factor based on days from today
            const totalDays = data.length;
            const todayIndex = data.findIndex(d => {
              const checkDate = debugMode ? d.date : d.date;
              return todayLocal && todayLocal === checkDate;
            });
            
            const fadeFactor = calculateFadeFactor(index, todayIndex, totalDays, isPast, debugMode);
            const { actionText, actionColor, weatherIcon, decisionBg } = getWateringDecision(day, isPast, debugMode);
            
            const fadedBg = debugMode || isPast ? '#FEFFFE' : getFadedColor(decisionBg, fadeFactor);
            const fadedBorderColor = debugMode || isPast ? '#E8EDE4' : getFadedColor(actionColor, Math.max(0.3, fadeFactor));
            
            return (
              <Card
                key={index}
                onClick={(e) => {
                  // Only allow expansion on mobile
                  if (window.innerWidth < 900) {
                    toggleCardExpansion(dayDate);
                  }
                }}
                sx={{
                  mb: 1,
                  cursor: { xs: 'pointer', md: 'default' },
                  bgcolor: isTodayRow ? 
                    (debugMode ? '#F3F9FF' : fadedBg) : 
                    fadedBg,
                  border: isTodayRow ? 
                    `2px solid ${debugMode ? '#2196F3' : fadedBorderColor}` : 
                    `1px solid ${fadedBorderColor}`,
                  borderRadius: { xs: '12px', md: '8px' },
                  opacity: isPast ? { xs: 0.7, md: 0.6 } : 1,
                  transform: isPast ? { xs: 'scale(0.95)', md: 'scale(0.98)' } : 'scale(1)',
                  '&:hover': {
                    bgcolor: debugMode ? '#F9FBF7' : getFadedColor(decisionBg, Math.min(1, fadeFactor + 0.1)),
                    transform: isPast ? { xs: 'scale(0.96)', md: 'scale(0.99)' } : { xs: 'scale(1.01)', md: 'scale(1.001)' },
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <CardContent sx={{ p: { xs: isPast ? 1.5 : 2, md: 3 } }}>
                  {/* Main Content Row */}
                  <Box 
                    display="flex" 
                    alignItems="center" 
                    justifyContent="space-between"
                    mb={{ xs: 0, md: 1 }}
                  >
                    {/* Date Section */}
                    <Box 
                      display="flex" 
                      alignItems="center" 
                      gap={{ xs: isPast ? 1.5 : 2, md: 0 }}
                      minWidth={{ xs: 'auto', md: 120 }}
                      flexDirection={{ xs: 'row', md: 'column' }}
                    >
                      <Box textAlign={{ xs: 'center', md: 'left' }} minWidth={{ xs: isPast ? 35 : 40, md: 'auto' }}>
                        <Typography variant="h6" sx={{ 
                          fontSize: { xs: isPast ? '0.75rem' : '0.9rem', md: '1rem' },
                          fontWeight: { xs: isPast ? 500 : 600, md: 600 },
                          color: '#4A5D3A',
                          mb: { xs: 0, md: 0.5 }
                        }}>
                          <Box component="span" sx={{ display: { xs: 'inline', md: 'none' } }}>
                            {new Date(dayDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                          </Box>
                          <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
                            {new Date(dayDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
                          </Box>
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ 
                          fontSize: { xs: isPast ? '0.6rem' : '0.7rem', md: '0.85rem' }
                        }}>
                          <Box component="span" sx={{ display: { xs: 'inline', md: 'none' } }}>
                            {new Date(dayDate + 'T12:00:00').getDate()}
                          </Box>
                          <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
                            {new Date(dayDate + 'T12:00:00').toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </Box>
                        </Typography>
                        {isTodayRow && (
                          <Chip 
                            label="TODAY" 
                            size="small" 
                            sx={{ 
                              mt: 0.5,
                              bgcolor: '#2196F3',
                              color: 'white',
                              fontSize: '0.65rem',
                              height: { xs: 16, md: 20 },
                              display: { xs: 'none', md: 'inline-flex' }
                            }} 
                          />
                        )}
                      </Box>
                      
                      {/* Mobile: Weather Icon */}
                      <Box sx={{ fontSize: { xs: isPast ? '1.2rem' : '1.5rem', md: 0 }, display: { xs: 'block', md: 'none' } }}>
                        {weatherIcon}
                      </Box>
                      
                      {/* Mobile: Action Text */}
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: actionColor,
                          fontWeight: { xs: isPast ? 400 : 500, md: 0 },
                          fontSize: { xs: isPast ? '0.8rem' : '0.9rem', md: 0 },
                          display: { xs: 'block', md: 'none' }
                        }}
                      >
                        {actionText}
                      </Typography>
                    </Box>
                    
                    {/* Desktop: Weather Section */}
                    <Box flex={1} mx={3} sx={{ display: { xs: 'none', md: 'block' } }}>
                      {debugMode ? (
                        <Box display="flex" alignItems="center" gap={2}>
                          <Box sx={{ fontSize: '1.5rem' }}>
                            {weatherIcon}
                          </Box>
                          <Box>
                            <Typography variant="body1" fontWeight={600}>
                              {Math.round(day.temp_max)}°/{Math.round(day.temp_min)}°
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                              {day.description}
                            </Typography>
                          </Box>
                        </Box>
                      ) : (
                        weather && (
                          <Box display="flex" alignItems="center" gap={2}>
                            <Box sx={{ fontSize: '1.5rem' }}>
                              {weather.icon}
                            </Box>
                            <Box>
                              <Typography variant="body1" fontWeight={600}>
                                {weather.temp}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                                {weather.description}
                              </Typography>
                              {weather.rain && (
                                <Typography variant="caption" color="info.main" display="block">
                                  Rain: {weather.rain}&quot;
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        )
                      )}
                    </Box>
                    
                    {/* Desktop: Decision Section & Mobile: Expand Icon */}
                    <Box sx={{ minWidth: { xs: 'auto', md: 200 }, textAlign: { xs: 'center', md: 'right' } }}>
                      {/* Desktop Decision Badge */}
                      <Box 
                        display={{ xs: 'none', md: !debugMode ? 'inline-flex' : 'none' }}
                        alignItems="center" 
                        gap={1}
                        sx={{
                          px: 2,
                          py: 0.5,
                          borderRadius: '16px',
                          bgcolor: fadedBg,
                          border: `1px solid ${actionColor}20`
                        }}
                      >
                        <Box sx={{ fontSize: '0.8rem', color: actionColor }}>
                          {weatherIcon}
                        </Box>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: actionColor,
                            fontWeight: 600,
                            fontSize: '0.85rem'
                          }}
                        >
                          {actionText}
                        </Typography>
                      </Box>
                      
                      {/* Desktop Reasoning Text */}
                      {!debugMode && day.reason && (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: '#7A8471',
                            fontSize: '0.8rem',
                            lineHeight: 1.3,
                            mt: 0.5,
                            fontStyle: 'italic',
                            textAlign: 'right',
                            display: { xs: 'none', md: 'block' }
                          }}
                        >
                          {day.reason}
                        </Typography>
                      )}
                      
                      {/* Mobile Expand Icon */}
                      <Box sx={{ 
                        color: '#9E9E9E', 
                        fontSize: { xs: isPast ? '1.2rem' : '1.5rem', md: 0 },
                        display: { xs: 'block', md: 'none' }
                      }}>
                        {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                      </Box>
                    </Box>
                  </Box>
                  
                  {/* Mobile: Expanded View */}
                  {isExpanded && (
                    <Box mt={2} pt={2} borderTop="1px solid #F0F3EC" sx={{ display: { xs: 'block', md: 'none' } }}>
                      {debugMode ? (
                        // Debug mode expanded content
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Temperature</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {Math.round(day.temp_max)}°/{Math.round(day.temp_min)}°
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Humidity</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {day.humidity}%
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Rain</Typography>
                            <Typography variant="body2" fontWeight={600} color={day.rain > 0.1 ? 'info.main' : 'text.secondary'}>
                              {day.rain.toFixed(2)}&quot;
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Conditions</Typography>
                            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                              {day.description}
                            </Typography>
                          </Grid>
                        </Grid>
                      ) : (
                        // AI mode expanded content
                        <Box>
                          {weather && (
                            <Box mb={2}>
                              <Typography variant="caption" color="text.secondary">Weather</Typography>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="h6" sx={{ fontSize: '1.2rem' }}>
                                  {weather.icon}
                                </Typography>
                                <Typography variant="body2" fontWeight={600}>
                                  {weather.temp}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                                  {weather.description}
                                </Typography>
                              </Box>
                              {weather.rain && (
                                <Typography variant="caption" color="info.main">
                                  {weather.rain}&quot; rain expected
                                </Typography>
                              )}
                            </Box>
                          )}
                          
                          {day.reason && (
                            <Box>
                              <Typography variant="caption" color="text.secondary">Gnome&apos;s Reasoning</Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.85rem', lineHeight: 1.4, color: '#7A8471' }}>
                                {day.reason}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                  )}
                  
                  {/* Desktop: Debug Mode Additional Info */}
                  {debugMode && (
                    <Box mt={2} sx={{ display: { xs: 'none', md: 'block' } }}>
                      <Grid container spacing={2}>
                        <Grid item xs={3}>
                          <Typography variant="caption" color="text.secondary">Humidity</Typography>
                          <Typography variant="body2" fontWeight={600}>{day.humidity}%</Typography>
                        </Grid>
                        <Grid item xs={3}>
                          <Typography variant="caption" color="text.secondary">Rain</Typography>
                          <Typography variant="body2" fontWeight={600} color={day.rain > 0.1 ? 'info.main' : 'text.secondary'}>
                            {day.rain.toFixed(2)}&quot;
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Full Description</Typography>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {day.description}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Box>
        
        {debugMode && (
          <Box 
            sx={{ 
              mt: 2,
              p: 3,
              borderRadius: '6px',
              border: '1px solid #E0E8D6',
              bgcolor: '#F9FBF7',
              boxShadow: '0 1px 4px rgba(107, 123, 92, 0.04)'
            }}
          >
            <Typography variant="body2" sx={{ lineHeight: 1.6, color: '#6B7B5C' }}>
              <strong>Gnome Weather Notes:</strong> Raw weather data from {weatherAPI} API. 
              {wateringAdvice ? 'Gnome advice is also available.' : 'Turn off debug mode to get gnome watering wisdom.'}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}