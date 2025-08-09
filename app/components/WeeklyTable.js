'use client';


import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  CircularProgress
} from '@mui/material';
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
  wateringAdvice, 
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
    return wateringAdvice?.daily || [];
  }, [wateringAdvice?.daily]);

  const todayLocal = useMemo(() => {
    return isClient ? getLocalDateString() : null;
  }, [isClient]);

  // Memoize today index calculation to avoid recalculating on every render
  const todayIndex = useMemo(() => {
    if (!todayLocal || !data.length) return -1;
    return data.findIndex(d => {
      return todayLocal === d.date;
    });
  }, [data, todayLocal]);
  
  // Show loading spinner when loading and no data
  if (loading && (!data || data.length === 0)) {
    return (
      <Card sx={{ mb: 4, p: 6, textAlign: 'center' }}>
        <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
          <CircularProgress 
            size={48} 
            sx={{ color: '#3f2a1e' }}
          />
          <Typography sx={{ color: '#3f2a1e', fontStyle: 'italic' }}>
            Consulting with the gnome wisdom...
          </Typography>
        </Box>
      </Card>  
    );
  }
  
  if (!data || data.length === 0) {
    return (
      <Card sx={{ mb: 4, p: 3, textAlign: 'center' }}>
        <Typography sx={{ color: '#3f2a1e' }}>No weather data available (data length: {data?.length || 0})</Typography>
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
          <Typography 
            variant="h4" 
            component="h2" 
            sx={{
              color: '#3f2a1e',
              fontWeight: 500,
              fontSize: { xs: '12px', sm: '1rem' },
              fontFamily: 'var(--font-heading)'
            }}
          >
            A Peek at the Week Ahead
          </Typography>
        </Box>
        
        {wateringAdvice && (
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
              color: '#3f2a1e',
              fontSize: '0.9rem',
              fontWeight: 500,
              mb: 2
            }}>
              {wateringAdvice.weekSummary}
            </Typography>
            
            <Typography variant="caption" sx={{ 
              color: '#3f2a1e',
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
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          rowGap: 2
        }}>
          {data.map((day, index) => {
            const dayDate = day.date;
            const isTodayRow = todayLocal && todayLocal === dayDate;
            const isPast = todayLocal && dayDate < todayLocal;
            const weather = getWeatherDisplay(day.date);
            const isExpanded = expandedCards.has(dayDate);
            
            // Calculate fade factor based on days from today (using memoized todayIndex)
            const totalDays = data.length;
            const fadeFactor = calculateFadeFactor(index, todayIndex, totalDays, isPast, false);
            const { actionText, actionColor, weatherIcon, decisionBg } = getWateringDecision(day, isPast, false);
            
            // Use white background for all cards
            let cardBg = '#fffcec';
            let cardBorder = '#e5e7eb'; // Light gray border
            
            // Define today border color
            let todayBorder = '#3f2a1e';
            
            return (
              <Card
key={dayDate}
                onClick={handleCardClick(dayDate, isPast)}
                sx={{
                  cursor: { xs: 'pointer', md: isPast ? 'pointer' : 'default' },
                  bgcolor: cardBg,
                  border: isTodayRow ? 
                    `2px solid ${todayBorder}` : 
                    `1px solid ${cardBorder}`,
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
                  borderRadius: { xs: '12px', md: '8px' },
                  opacity: isPast ? 0.6 : 1,
                  transform: 'scale(1)',
                  '&:hover': isPast ? {} : {
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
                    py: isExpanded ? 2.5 : (isPast ? 0.75 : 3), 
                    px: isExpanded ? 2.5 : (isPast ? 0.75 : 2), 
                    display: 'flex',
                    alignItems: isExpanded ? 'flex-start' : 'center',
                    gap: isPast ? 1 : 2
                  }}>
                    {/* Weather Icon as part of flex layout */}
                    <Box sx={{
                      width: isPast ? '32px' : '48px',
                      height: isPast ? '32px' : '48px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {(() => {
                        let iconSrc;
                        if (weather?.icon) {
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
                              const fallbackEmoji = getWeatherIconEmoji(weather?.description || 'clear', day.temp_max || 70);
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
                            fontSize: isPast ? '0.75rem' : '1.125rem',
                            color: '#3f2a14',
                            mb: isPast ? 0 : 0.25
                          }}>
                            {new Date(dayDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}
                          </Typography>
                          {!isPast && (
                          <Typography sx={{
                            fontSize: '0.875rem',
                            color: '#3f2a1e'
                          }}>
                            {new Date(dayDate + 'T12:00:00').toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric'
                            }).toUpperCase()}
                            <Box component="span" sx={{ fontWeight: 600, color: '#3f2a1e', ml: 2 }}>
                              {(() => {
                                return weather?.temp || '--°';
                              })()}
                            </Box>
                          </Typography>
                          )}
                          {isPast && (
                            <Typography sx={{
                              fontSize: '0.625rem',
                              color: '#3f2a1e',
                              opacity: 0.7
                            }}>
                              {new Date(dayDate + 'T12:00:00').toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric'
                              }).toUpperCase()} • {weather?.temp || '--°'}
                            </Typography>
                          )}
                        </Box>
                        {!isPast && (
                          <Box sx={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            px: '0.85rem',
                            py: '0.35rem',
                            borderRadius: '9999px',
                            textTransform: 'uppercase',
                            ...(actionText === 'Water' && {
                              backgroundColor: '#e8eeff',
                              color: '#3f2a1e'
                            }),
                            ...(actionText === 'Check' && {
                              backgroundColor: '#efe2ab',
                              color: '#3f2a1e'
                            }),
                            ...(actionText === 'Skip' && {
                              backgroundColor: '#cad597',
                              color: '#3f2a1e'
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
                              color: '#3f2a1e',
                              mb: 0.25
                            }}>
                              {new Date(dayDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}
                            </Typography>
                            <Typography sx={{
                              fontSize: '0.875rem',
                              color: '#3f2a1e'
                            }}>
                              {new Date(dayDate + 'T12:00:00').toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric'
                              }).toUpperCase()}
                            </Typography>
                          </Box>
                          {!isPast && (
                            <Box sx={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              px: '0.85rem',
                              py: '0.35rem',
                              borderRadius: '9999px',
                              textTransform: 'uppercase',
                              ...(actionText === 'Water' && {
                                backgroundColor: '#e8eeff',
                                color: '#3f2a1e'
                              }),
                              ...(actionText === 'Check' && {
                                backgroundColor: '#efe2ab',
                                color: '#3f2a1e'
                              }),
                              ...(actionText === 'Skip' && {
                                backgroundColor: '#cad597',
                                color: '#3f2a1e'
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
                              color: '#3f2a1e'
                            }}>
                              {(() => {
                                const temp = weather?.temp || '--°';
                                const desc = weather?.description || 'Clear';
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
                                    if (weather?.rain !== undefined) {
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
                      <Box sx={{
                          pr: isPast ? 2 : 3,
                          pb: 1,
                          borderTop: `1px solid ${actionText === 'Water' ? 'rgba(30, 58, 138, 0.2)' :
                                                  actionText === 'Check' ? 'rgba(133, 77, 14, 0.2)' :
                                                  actionText === 'Skip' ? 'rgba(20, 83, 45, 0.2)' : 'rgba(75, 85, 99, 0.2)'}`
                        }}>
                          {day.reason && (
                            <Box>
                              <Typography sx={{
                                color:'#3f2a14',
                                pt:1,
                                fontWeight: 600,
                                mb: 0.25,
                                fontFamily: 'var(--font-heading)'
                              }}>
                                Gnome's Reasoning
                              </Typography>
                              <Typography sx={{
                                color:'#3f2a14',
                                fontSize: { xs: isPast ? '0.8rem' : '0.9rem', md: isPast ? '0.8rem' : '0.95rem' },
                                lineHeight: 1.4,
                              }}>
                                {day.reason}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                    </Box>
                  )}
                  
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
}
