'use client';

// SEASONAL THEME CONFIGURATION
// Change this to 'spring', 'summer', 'fall', or 'winter' to test different seasons
const CURRENT_SEASON = 'summer';

// Seasonal color configuration for cards
const getSeasonalColors = (season) => {
  const seasonalPalettes = {
    spring: {
      yes: '#e8eeff',
      maybe: '#efe2ab', 
      no: '#cad597'
    },
    summer: {
      yes: '#ddf4ff',
      maybe: '#fff2cc',
      no: '#e1f5d0'
    },
    fall: {
      yes: '#f9e8d4',
      maybe: '#f4d4a7',
      no: '#d9c7a3'
    },
    winter: {
      yes: '#e8f4fd',
      maybe: '#f0f4f8',
      no: '#dde7f0'
    }
  };
  
  // Fallback to summer colors if season not found
  return seasonalPalettes[season] || seasonalPalettes.summer;
};

import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Avatar, 
  Chip, 
  Grid,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import { 
  ChevronRight as ChevronRightIcon, 
  ExpandMore as ExpandMoreIcon,
  BugReport 
} from '@mui/icons-material';
import { useState, useMemo, useCallback, memo } from 'react';
import { 
  getWateringDecision, 
  getFadedColor, 
  calculateFadeFactor,
  getWeatherIcon,
  getWeatherIconEmoji
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

  const toggleCardExpansion = useCallback((dayDate) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dayDate)) {
        newSet.delete(dayDate);
      } else {
        newSet.add(dayDate);
      }
      return newSet;
    });
  }, []);

  const handleCardClick = useCallback((dayDate, isPast) => (e) => {
    // Allow expansion: mobile for all cards, desktop only for past cards
    if (window.innerWidth < 900 || (window.innerWidth >= 900 && isPast)) {
      toggleCardExpansion(dayDate);
    }
  }, [toggleCardExpansion]);

  const data = useMemo(() => {
    return debugMode ? weatherData : wateringAdvice?.daily || [];
  }, [debugMode, weatherData, wateringAdvice?.daily]);

  const todayLocal = useMemo(() => {
    return isClient ? getLocalDateString() : null;
  }, [isClient]);

  // Memoize today index calculation to avoid recalculating on every render
  const todayIndex = useMemo(() => {
    if (!todayLocal || !data.length) return -1;
    return data.findIndex(d => {
      const checkDate = debugMode ? d.date : d.date;
      return todayLocal === checkDate;
    });
  }, [data, todayLocal, debugMode]);
  
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
        bgcolor: '#dfdbc7',
        borderRadius: '0',
        boxShadow: 'none',
        border: 'none'
      }}
    >
      <CardContent sx={{ p: 2 }}>
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
                    fontFamily: 'var(--font-heading)'
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
                color: '#4d5239',
                fontWeight: 500,
                fontSize: { xs: '12px', sm: '1rem' },
                fontFamily: 'var(--font-heading)'
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
              bgcolor: '#fffcec',
              border: '1px solid #f5f1e8',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}
          >
            <Typography variant="body1" sx={{ 
              lineHeight: 1.6, 
              color: '#4d5239',
              fontSize: '0.9rem',
              fontWeight: 500,
              mb: 2
            }}>
              {wateringAdvice.weekSummary}
            </Typography>
            
            <Typography variant="caption" sx={{ 
              color: '#7A8471',
              fontSize: '0.8rem',
              fontStyle: 'italic',
              lineHeight: 1.4,
              display: 'block',
              textAlign: 'left'
            }}>
            🔮 My gnome magic gets a bit hazy looking at the far-off days. Pop back tomorrow for a clearer story!
            </Typography>
          </Box>
        )}
        
        {/* Unified Responsive View */}
        <Box>
          {data.map((day, index) => {
            const dayDate = debugMode ? day.date : day.date;
            const isTodayRow = todayLocal && todayLocal === dayDate;
            const isPast = todayLocal && dayDate < todayLocal;
            const weather = debugMode ? null : getWeatherDisplay(day.date);
            const isExpanded = expandedCards.has(dayDate);
            
            // Calculate fade factor based on days from today (using memoized todayIndex)
            const totalDays = data.length;
            const fadeFactor = calculateFadeFactor(index, todayIndex, totalDays, isPast, debugMode);
            const { actionText, actionColor, weatherIcon, decisionBg } = getWateringDecision(day, isPast, debugMode);
            
            // Get seasonal colors
            const seasonalColors = getSeasonalColors(CURRENT_SEASON);
            
            // Use white background for all cards
            let cardBg = '#ffffff';
            let cardBorder = '#e5e7eb'; // Light gray border
            
            // Get seasonal text color that matches the card background
            let seasonalTextColor = actionColor; // Default fallback
            if (!isPast && !debugMode) {
              // Create darker versions of seasonal colors for text
              if (actionText === 'Yes') {
                // Blue tones for "Yes" (water plants)
                seasonalTextColor = CURRENT_SEASON === 'spring' ? '#4A6B9F' :
                                  CURRENT_SEASON === 'summer' ? '#2E7DB8' :
                                  CURRENT_SEASON === 'fall' ? '#B5733A' :
                                  '#4A7BA7'; // winter
              } else if (actionText === 'Maybe') {
                // Beige/amber tones for "Maybe" (check soil)
                seasonalTextColor = CURRENT_SEASON === 'spring' ? '#A67C00' :
                                  CURRENT_SEASON === 'summer' ? '#B8860B' :
                                  CURRENT_SEASON === 'fall' ? '#A67C00' :
                                  '#8B7A66'; // winter beige
              } else if (actionText === 'No') {
                // Green tones for "No" (no need to water)
                seasonalTextColor = CURRENT_SEASON === 'spring' ? '#5A7C47' :
                                  CURRENT_SEASON === 'summer' ? '#4A7C59' :
                                  CURRENT_SEASON === 'fall' ? '#6B7A45' :
                                  '#4A6B52'; // winter green
              }
            }
            
            // Define today border color (more prominent)
            let todayBorder;
            if (isPast) {
              todayBorder = '#d4c5a9'; // Darker beige for past today
            } else if (debugMode) {
              todayBorder = '#2196F3';
            } else {
              todayBorder = seasonalTextColor; // Use the seasonal text color for prominence
            }
            
            return (
              <Card
                key={`${dayDate}-${debugMode}`}
                onClick={handleCardClick(dayDate, isPast)}
                sx={{
                  mb: index === data.length - 1 ? 0 : 1,
                  cursor: { xs: 'pointer', md: isPast ? 'pointer' : 'default' },
                  bgcolor: cardBg,
                  border: isTodayRow ? 
                    `2px solid ${todayBorder}` : 
                    `1px solid ${cardBorder}`,
                  boxShadow: isPast ? '0 2px 8px rgba(0, 0, 0, 0.04)' : 'none',
                  borderRadius: { xs: '12px', md: '8px' },
                  opacity: 1,
                  transform: 'scale(1)',
                  '&:hover': isPast ? {} : {
                    bgcolor: '#ffffff',
                    transform: { xs: 'scale(1.01)', md: 'scale(1.001)' },
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <CardContent sx={{ 
                  p: 0,
                  position: 'relative',
                  '&:last-child': {
                    paddingBottom: 0
                  }
                }}>
                  {/* Card Content with Weather Icon in flex layout */}
                  <Box sx={{ 
                    p: isExpanded ? 2.5 : 2, 
                    display: 'flex',
                    alignItems: isExpanded ? 'flex-start' : 'center',
                    gap: 2
                  }}>
                    {/* Weather Icon as part of flex layout */}
                    <Box sx={{
                      width: '48px',
                      height: '48px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {(() => {
                        let iconSrc;
                        if (debugMode) {
                          iconSrc = getWeatherIcon(day.description || 'clear', day.temp_max || 70);
                        } else if (weather?.icon) {
                          // Check if it's already a custom icon path or emoji
                          if (typeof weather.icon === 'string' && weather.icon.startsWith('/weather-icons/')) {
                            iconSrc = weather.icon;
                          } else if (typeof weather.icon === 'string' && weather.icon.includes('png')) {
                            iconSrc = weather.icon;
                          } else {
                            // Map from weather description to custom icon
                            iconSrc = getWeatherIcon(weather.description || 'clear', day.temp_max || weather.temp || 70);
                          }
                        } else {
                          iconSrc = getWeatherIcon('clear', day.temp_max || 70);
                        }

                        return (
                          <img 
                            src={iconSrc}
                            alt="Weather icon"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain'
                            }}
                            onError={(e) => {
                              // Fallback to emoji if image fails to load
                              const fallbackEmoji = debugMode ? 
                                getWeatherIconEmoji(day.description || 'clear', day.temp_max || 70) :
                                getWeatherIconEmoji(weather?.description || 'clear', day.temp_max || 70);
                              e.target.style.display = 'none';
                              e.target.parentNode.innerHTML = `<span style="font-size: ${isPast ? '2rem' : '3rem'}; opacity: 0.15;">${fallbackEmoji}</span>`;
                            }}
                          />
                        );
                      })()}
                    </Box>

                    {/* Content section */}
                    <Box sx={{ flex: 1 }}>
                      {!isExpanded ? (
                      // Collapsed card layout - single row
                      <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <Box>
                          <Typography sx={{
                            fontWeight: 700,
                            fontSize: '1.125rem',
                            color: '#1f2937',
                            mb: 0.25
                          }}>
                            {new Date(dayDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}
                          </Typography>
                          <Typography sx={{
                            fontSize: '0.875rem',
                            color: '#6b7280'
                          }}>
                            {new Date(dayDate + 'T12:00:00').toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric'
                            }).toUpperCase()}
                            <Box component="span" sx={{ fontWeight: 600, color: '#374151', ml: 2 }}>
                              {(() => {
                                return debugMode && day.temp_max ? 
                                  `${Math.round(day.temp_max)}°/${Math.round(day.temp_min)}°F` :
                                  weather?.temp || '--°';
                              })()}
                            </Box>
                          </Typography>
                        </Box>
                        {!isPast && !debugMode && (
                          <Box sx={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            px: '0.85rem',
                            py: '0.35rem',
                            borderRadius: '9999px',
                            textTransform: 'uppercase',
                            ...(actionText === 'Yes' && {
                              backgroundColor: '#e8eeff',
                              color: '#3b5998'
                            }),
                            ...(actionText === 'Maybe' && {
                              backgroundColor: '#efe2ab',
                              color: '#7a6824'
                            }),
                            ...(actionText === 'No' && {
                              backgroundColor: '#cad597',
                              color: '#4a5522'
                            })
                          }}>
                            {actionText}
                          </Box>
                        )}
                        </Box>
                      ) : (
                        // Expanded card layout
                        <>
                          {/* Top section */}
                          <Box sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                          <Box>
                            <Typography sx={{
                              fontWeight: 700,
                              fontSize: '1.25rem',
                              color: '#1f2937',
                              mb: 0.25
                            }}>
                              {new Date(dayDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}
                            </Typography>
                            <Typography sx={{
                              fontSize: '0.875rem',
                              color: '#6b7280'
                            }}>
                              {new Date(dayDate + 'T12:00:00').toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric'
                              }).toUpperCase()}
                            </Typography>
                          </Box>
                          {!isPast && !debugMode && (
                            <Box sx={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              px: '0.85rem',
                              py: '0.35rem',
                              borderRadius: '9999px',
                              textTransform: 'uppercase',
                              ...(actionText === 'Yes' && {
                                backgroundColor: '#e8eeff',
                                color: '#3b5998'
                              }),
                              ...(actionText === 'Maybe' && {
                                backgroundColor: '#efe2ab',
                                color: '#7a6824'
                              }),
                              ...(actionText === 'No' && {
                                backgroundColor: '#cad597',
                                color: '#4a5522'
                              })
                            }}>
                              {actionText}
                            </Box>
                          )}
                        </Box>

                        {/* Details section - only shown when expanded */}
                        <Box>
                          {/* Weather info row */}
                          <Box sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.875rem'                        
                          }}>
                            <Typography sx={{
                              fontWeight: 600,
                              color: '#4b5563'
                            }}>
                              {(() => {
                                const temp = debugMode && day.temp_max ? 
                                  `${Math.round(day.temp_max)}°/${Math.round(day.temp_min)}°F` :
                                  weather?.temp || '--°';
                                const desc = debugMode && day.description ? 
                                  day.description :
                                  weather?.description || 'Clear';
                                return `${temp} - ${desc.charAt(0).toUpperCase() + desc.slice(1)}`;
                              })()}
                            </Typography>                            
                            {/* Rain gauge */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{
                                width: '80px',
                                height: '8px',
                                borderRadius: '9999px',
                                overflow: 'hidden',
                                backgroundColor: '#e5e7eb'
                              }}>
                                <Box sx={{
                                  height: '100%',
                                  backgroundColor: '#93c5fd',
                                  width: (() => {
                                    let rainAmount = 0;
                                    if (debugMode && day.rain !== undefined) {
                                      rainAmount = day.rain;
                                    } else if (weather?.rain !== undefined) {
                                      rainAmount = typeof weather.rain === 'number' ? weather.rain : parseFloat(weather.rain) || 0;
                                    } else if (day.rain !== undefined) {
                                      rainAmount = day.rain;
                                    }
                                    return `${Math.min(100, (rainAmount / 1) * 100)}%`;
                                  })()
                                }} />
                              </Box>
                            </Box>
                          </Box>
                          </Box>
                        </>
                      )}
                    </Box>
                  </Box>
                  

                  
                  {/* Mobile + Past Desktop: Expanded View */}
                  {isExpanded && (
                    <Box mt={0} pt={0.5} pl={2} sx={{ display: { xs: 'block', md: isPast ? 'block' : 'none' } }}>
                      {debugMode ? (
                        // Debug mode expanded content
                        <Grid container spacing={2}>
                          <Grid size={6}>
                            <Typography variant="caption" color="text.secondary">Temperature</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {Math.round(day.temp_max)}°/{Math.round(day.temp_min)}°
                            </Typography>
                          </Grid>
                          <Grid size={6}>
                            <Typography variant="caption" color="text.secondary">Humidity</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {day.humidity}%
                            </Typography>
                          </Grid>
                          <Grid size={6}>
                            <Typography variant="caption" color="text.secondary">Rain</Typography>
                            <Typography variant="body2" fontWeight={600} color={day.rain > 0.1 ? 'info.main' : 'text.secondary'}>
                              {day.rain.toFixed(2)}&quot;
                            </Typography>
                          </Grid>
                          <Grid size={6}>
                            <Typography variant="caption" color="text.secondary">Conditions</Typography>
                            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                              {day.description}
                            </Typography>
                          </Grid>
                        </Grid>
                      ) : (
                        // AI mode expanded content
                        <Box sx={{
                          pr: isPast ? 2 : 3,
                          pb: 1,
                          borderTop: `1px solid ${actionText === 'Yes' ? 'rgba(30, 58, 138, 0.2)' :
                                                  actionText === 'Maybe' ? 'rgba(133, 77, 14, 0.2)' :
                                                  actionText === 'No' ? 'rgba(20, 83, 45, 0.2)' : 'rgba(75, 85, 99, 0.2)'}`
                        }}>
                          {/* Weather description for past cards in expanded view */}
                          {isPast && (
                            <Box sx={{ mb: day.reason ? 0.5 : 0 }}>
                              <Typography sx={{
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                color: '#6b7280',
                                textTransform: 'capitalize',
                                mb: 0.5
                              }}>
                                Weather: {debugMode && day.description ? 
                                  day.description :
                                  weather?.description || 'Clear'
                                }
                              </Typography>
                            </Box>
                          )}
                          {day.reason && (
                            <Box>
                              <Typography sx={{
                                pt:1,
                                fontWeight: 600,
                                mb: 1,
                                fontFamily: 'var(--font-heading)'
                              }}>
                                Gnome's Reasoning
                              </Typography>
                              <Typography sx={{
                                fontSize: { xs: isPast ? '0.8rem' : '0.9rem', md: isPast ? '0.8rem' : '0.95rem' },
                                lineHeight: 1.4,
                              }}>
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
                        <Grid size={3}>
                          <Typography variant="caption" color="text.secondary">Humidity</Typography>
                          <Typography variant="body2" fontWeight={600}>{day.humidity}%</Typography>
                        </Grid>
                        <Grid size={3}>
                          <Typography variant="caption" color="text.secondary">Rain</Typography>
                          <Typography variant="body2" fontWeight={600} color={day.rain > 0.1 ? 'info.main' : 'text.secondary'}>
                            {day.rain.toFixed(2)}&quot;
                          </Typography>
                        </Grid>
                        <Grid size={6}>
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
