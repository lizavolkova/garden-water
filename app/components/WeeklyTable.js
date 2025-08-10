'use client';

import { Global, css } from '@emotion/react';

import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  CircularProgress
} from '@mui/material';
import { useMemo, memo, useState } from 'react';
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

  const data = useMemo(() => {
    return wateringAdvice?.daily || [];
  }, [wateringAdvice?.daily]);

  const [expandedCards, setExpandedCards] = useState(new Set());

  const toggleCardExpansion = (date) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

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
    <>
      <Global
        styles={css`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      />
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
            component="h3"
            variant="h3"
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
              mb: 2,
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none'
            }}>
              {wateringAdvice.weekSummary}
            </Typography>
            
            <Box sx={{display: 'flex'}}>
            <Typography sx={{ 
                fontSize: '2rem',
                lineHeight: '2rem',
                ml: '-8px',
              display: 'block',
              textAlign: 'left',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none'
            }}>🔮</Typography>
            <Typography variant="caption" sx={{ 
              display: 'block',
              textAlign: 'left',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none'
            }}>
            My gnome magic gets a bit hazy looking at the far-off days. Pop back tomorrow for a clearer story!
            </Typography>
            </Box>
            
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
                onClick={() => toggleCardExpansion(dayDate)}
                sx={{
                  bgcolor: cardBg,
                  border: isTodayRow ? 
                    `2px solid ${todayBorder}` : 
                    `1px solid ${cardBorder}`,
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
                  borderRadius: { xs: '12px', md: '8px' },
                  opacity: isPast ? 0.6 : 1,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease-in-out',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  outline: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  '&:focus': {
                    outline: 'none'
                  },
                  '&:hover': {
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.12)',
                    transform: 'translateY(-2px)'
                  }
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
                    py: isPast ? 0.75 : 3, 
                    px: isPast ? 0.75 : 2, 
                    pb: isPast ? 0.75 : isExpanded ? 0 : 3,
                    display: 'flex',
                    alignItems: 'center',
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
                      <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <Box>
                          <Typography variant="h3" component="h3" sx={{
                            fontSize: isPast ? '0.75rem' : '1.125rem',
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
                        <Box sx={{
                          ml: 1,
                          color: '#3f2a1e',
                          opacity: 0.4,
                          fontSize: '0.8rem',
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s ease-in-out'
                        }}>
                          ❯
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                  {/* Weather description - only in expanded state */}
                  {isExpanded && weather?.description && (
                    <Box sx={{
                        pl: isPast ? 6 : 10, 
                        pb: 2
                        }}>
                        <Typography sx={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            fontStyle: 'italic',
                            mt: 0.5
                        }}>
                            {weather.description}
                        </Typography>
                    </Box>
                    )}
                  
                  {/* Expanded content */}
                  {isExpanded && day.reason && (
                    <Box sx={{
                      px: 2,
                      pb: isPast ? 1 :3,
                      pt: 1,
                      borderTop: '1px solid #cad597',
                      bgcolor: '#f0f9c8',
                      animation: 'fadeIn 0.3s ease-in-out'
                    }}>
                      {/* Info row with icons and progress bar */}
                      <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2
                      }}>
                        {/* Left side - 3 icons with numbers */}
                        <Box sx={{
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          gap: 1
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>🌡️  <span>{weather?.humidity || 0}%</span></Box>
                          <span>|</span>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>💧 <span>{weather?.precip_prob || 0}%</span></Box>
                          <span>|</span>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>💨 <span>{weather?.wind_speed || 0}mph</span></Box>
                        </Box>
                        
                        {/* Right side - rainfall progress bar */}
                        <Box sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          fontSize: '0.75rem',
                          color: '#6b7280'
                        }}>
                          <span>Rain:</span>
                          <Box sx={{
                            width: '60px',
                            height: '8px',
                            bgcolor: '#e5e7eb',
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}>
                            <Box sx={{
                              width: `${Math.min((weather?.rain || 0) * 10, 100)}%`,
                              height: '100%',
                              bgcolor: '#3b82f6',
                              borderRadius: '4px',
                              transition: 'width 0.3s ease-in-out'
                            }} />
                          </Box>
                          <span>{weather?.rain || 0}mm</span>
                        </Box>
                      </Box>
                      
                    {!isPast &&
                    <>
                    <Typography variant="h3" sx={{
                        color: '#3f2a1e',
                        lineHeight: 1.5
                      }}>
                        Wynn&apos;s Reasoning:
                      </Typography>
                      <Typography variant="caption" sx={{
                        color: '#3f2a1e',
                        lineHeight: 1.5,
                        fontSize: '0.9rem'
                      }}>
                        {day.reason}
                      </Typography>

                    </>
                    }
                      

                    </Box>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </CardContent>
    </Card>
    </>
  );
}
