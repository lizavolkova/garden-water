'use client';

import { Box, Typography, Chip, Card } from '@mui/material';
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { display } from '@mui/system';

// FOR TESTING: Change this value to 'yes', 'maybe', or 'no' to test different states
const TEST_OVERRIDE = 'yes'; // Set to 'yes', 'maybe', 'no', or null to disable

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
      const waterState = TEST_OVERRIDE || todayAdvice.shouldWater;
      const variations = copyVariations[waterState] || copyVariations.no;
      const randomIndex = Math.floor(Math.random() * variations.length);
      setSelectedCopy(variations[randomIndex]);
    } else {
      setSelectedCopy(null);
    }
  }, [todayAdvice, copyVariations]);
  
  if (!todayAdvice || !selectedCopy) return null;

  // Determine background color based on advice
  const getBackgroundColor = (shouldWater) => {
    switch(shouldWater) {
      case 'yes': return '#e8eeff';
      case 'maybe': return '#efe2ab';
      case 'no': return '#cad597';
      default: return '#fcfdfc';
    }
  };

  // Use test override if set, otherwise use actual advice
  const currentWaterState = TEST_OVERRIDE || todayAdvice.shouldWater;

  return (
    <Card 
      sx={{ 
        mb: 0,
        bgcolor: getBackgroundColor(currentWaterState),
        borderRadius: '12px',
        boxShadow: '0 3px 16px rgba(107, 123, 92, 0.12)',
        p: 0,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Typography 
        variant="h4" 
        component="h2" 
        sx={{
          color: '#3f2a14',
          fontWeight: 500,
          fontSize: { xs: '12px', sm: '12px' },
          fontFamily: 'var(--font-heading)',
          mb: 0,
          pl: 2,
          pt: 2,
          textAlign: 'left',
          position: 'relative',
          zIndex: 20
        }}
      >
        Should I water my garden today?
      </Typography>
      
      <Box sx={{
        display: 'flex'
      }}>
    {/* Background Image - positioned as backdrop on right */}
    <Box 
        sx={{ 
          width: { xs: '100px', md: '150px' },
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'end'
        }}
      >
        <Image
          src={`/icons/water-${currentWaterState}.png`}
          alt={`Water ${currentWaterState}`}
          width={150}
          height={150}
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: '100%',
            objectFit: 'contain'
          }}
        />
      </Box>
      
      {/* Content Section - positioned above background */}
      <Box 
        sx={{ 
          position: 'relative',
          zIndex: 20
        }}
      >
        {/* Main advice title with status */}
      <Typography 
        variant="h5" 
        sx={{ 
          fontWeight: 600,
          fontSize: { xs: '1.0rem', md: '1.5rem' },
          mb: 0,
          pt: 2,
          pl: 0,
          pr: 2,
          color: '#3f2a14',
          textAlign: 'left',
          position: 'relative',
          zIndex: 20
        }}
      >
        {currentWaterState === 'yes' ? 'YES' : 
         currentWaterState === 'maybe' ? 'MAYBE' : 'NO'}: {selectedCopy.title}
      </Typography>
        {/* Reason text */}
        <Typography 
        variant="body1" 
        sx={{ 
            color: '#3f2a14',
            lineHeight: 1.6,
            fontSize: { xs: '0.9rem', sm: '0.95rem', md: '1rem' },
            mb: 2,
            opacity: 0.9
        }}
        >
        {todayAdvice.reason}
        </Typography>
        
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
      </Box>
      </Box>
      
      {/* Additional advice if available */}
      {todayAdvice.advice && (
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#3f2a14',
                lineHeight: 1.5,
                fontSize: { xs: '0.85rem', sm: '0.9rem', md: '0.95rem' },
                fontStyle: 'italic',
                opacity: 0.8,
                px: 3,
                pb: 3
              }}
            >
              {todayAdvice.advice}
            </Typography>
          )}
    </Card>
  );
}
