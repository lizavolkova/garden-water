'use client';

import { Card, CardContent, Box, Typography, Chip } from '@mui/material';
import { useState, useEffect, useMemo } from 'react';

export default function TodayAdviceCard({ todayAdvice, isDebugMode }) {
  const [selectedCopy, setSelectedCopy] = useState(null);
  
  // Memoize copy variations to avoid recreating on every render
  const copyVariations = useMemo(() => ({
    yes: [
      { title: 'The garden is thirsty!' },
      { title: `Let's get watering!` }
    ],
    maybe: [
      { title: `Let's ask the soil.` },
      { title: 'Check soil moisture' }
    ],
    no: [
      { title: 'Let the garden rest today!' },
      { title: 'Skip watering today' }
    ]
  }), []);

  // Select random copy variation when todayAdvice changes
  useEffect(() => {
    if (todayAdvice) {
      const variations = copyVariations[todayAdvice.shouldWater] || copyVariations.no;
      const randomIndex = Math.floor(Math.random() * variations.length);
      setSelectedCopy(variations[randomIndex]);
    } else {
      setSelectedCopy(null);
    }
  }, [todayAdvice, copyVariations]);
  
  if (!todayAdvice || !selectedCopy) return null;

  return (
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
          Wynn&apos;s Water Wisdom for Today
        </Typography>
        
        {/* Responsive Layout - centered on mobile, side-by-side on desktop */}
        <Box 
          sx={{ 
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'center', md: 'flex-start' },
            gap: { xs: 0, md: 4 },
            textAlign: { xs: 'center', md: 'left' }
          }}
        >
          {/* Icon Section - centered on mobile, left side on desktop */}
          <Box 
            sx={{ 
              order: { xs: 2, md: 1 },
              mb: { xs: 3, md: 0 },
              flexShrink: 0
            }}
          >
            <Box 
              sx={{ 
                fontSize: { xs: '4rem', md: '5rem' },
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              {todayAdvice.shouldWater === 'yes' ? '💧' : 
               todayAdvice.shouldWater === 'maybe' ? '🌱' : '🍂'}
            </Box>
          </Box>
          
          {/* Content Section - below icon on mobile, right side on desktop */}
          <Box 
            sx={{ 
              order: { xs: 1, md: 2 },
              flex: 1,
              maxWidth: { xs: '100%', md: 'none' }
            }}
          >
            {/* Status Badge */}
            <Box sx={{ mb: { xs: 3, md: 2 } }}>
              <Chip
                label={todayAdvice.shouldWater === 'yes' ? 'YES' : 
                       todayAdvice.shouldWater === 'maybe' ? 'MAYBE' : 'NO'}
                sx={{
                  bgcolor: todayAdvice.shouldWater === 'yes' ? '#1976D2' : 
                          todayAdvice.shouldWater === 'maybe' ? '#FFA726' : '#2E7D32',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  px: 2,
                  py: 0.5,
                  textTransform: 'uppercase'
                }}
              />
            </Box>
            
            {/* Main advice title */}
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 600,
                fontSize: { xs: '1.3rem', sm: '1.5rem' },
                mb: 2,
                color: '#4A5D3A',
                fontFamily: 'serif'
              }}
            >
              {selectedCopy.title}
            </Typography>
            
            {/* Reason text */}
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#7A8471',
                lineHeight: 1.6,
                fontSize: { xs: '0.95rem', sm: '1rem' },
                mb: 2
              }}
            >
              {todayAdvice.reason}
            </Typography>
            
            {/* Additional advice if available */}
            {todayAdvice.advice && (
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#7A8471',
                  lineHeight: 1.5,
                  fontSize: { xs: '0.9rem', sm: '0.95rem' },
                  fontStyle: 'italic'
                }}
              >
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
  );
}
