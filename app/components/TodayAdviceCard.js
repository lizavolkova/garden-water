'use client';

import { Card, CardContent, Box, Typography, Chip } from '@mui/material';

export default function TodayAdviceCard({ todayAdvice, isDebugMode }) {
  if (!todayAdvice) return null;

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
  );
}