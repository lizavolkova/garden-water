'use client';

import { Box, Typography, Chip, Card } from '@mui/material';
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { display } from '@mui/system';

// FOR TESTING: Change this value to 'yes', 'maybe', or 'no' to test different states
const TEST_OVERRIDE = null; // Set to 'yes', 'maybe', 'no', or null to disable

// SEASONAL THEME CONFIGURATION
// Change this to 'spring', 'summer', 'fall', or 'winter' to test different seasonal colors
const CURRENT_SEASON = 'summer';

export default function TodayAdviceCard({ todayAdvice, isDebugMode, locationData }) {
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

  // Seasonal color configuration
  const getSeasonalColors = (season) => {
    const seasonalPalettes = {
      summer: {
        yes: '#e8eeff',    // A soft, light blue
        maybe: '#efe2ab',  // A warm, sandy yellow
        no: '#cad597'      // A gentle, leafy green
      },
      fall: {
        yes: '#d4e4f3',    // A cool, crisp sky blue
        maybe: '#f3d9a2',  // A golden, honey-like yellow
        no: '#c1cd97'      // A muted, olive green
      },
      winter: {
        yes: '#d8e8f0',    // An icy, frosted blue
        maybe: '#f0e6c2',  // A pale, winter sun yellow
        no: '#b8c4a9'      // A dusty, evergreen-like green
      },
      spring: {
        yes: '#e0f0ff',    // A bright, clear sky blue
        maybe: '#f5f5a1',  // A soft, daffodil yellow
        no: '#cde2c3'      // A fresh, new-growth green
      }
    };
    
    // Fallback to summer if season not found
    return seasonalPalettes[season] || seasonalPalettes.summer;
  };

  // Determine background color based on advice and season
  const getBackgroundColor = (shouldWater) => {
    const seasonalColors = getSeasonalColors(CURRENT_SEASON);
    return seasonalColors[shouldWater] || '#fcfdfc';
  };

  // Use test override if set, otherwise use actual advice
  const currentWaterState = TEST_OVERRIDE || todayAdvice.shouldWater;

  return (
    <Card 
      sx={{ 
        mb: 0,
        bgcolor: getBackgroundColor(currentWaterState),
        borderRadius: '0',
        boxShadow: '0 3px 16px rgba(107, 123, 92, 0.12)',
        p: 2,
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
    >
        <Box sx={{
            pb: 2
        }}>
        <Typography  
        variant="h3"
        component="h3" 
        sx={{
          mb: 0,
          textAlign: 'left',
          position: 'relative',
          zIndex: 20
        }}
      >
        Should I water my garden today?
      </Typography>
      
      <Typography  
        variant="caption"
        sx={{
          fontSize: '0.8rem',
          textAlign: 'left',
          position: 'relative',
          zIndex: 20
        }}
      >
        {locationData ? `${locationData.city}, ${locationData.state}` : 'Loading location...'}
      </Typography>
        </Box>
      

      <Box sx={{
        display: 'flex',
        alignItems: 'center'
      }}>
    {/* Background Image - positioned as backdrop on right */}
    <Box 
        sx={{ 
          width: { xs: '150px', md: '150px' },
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
      component="h2"
      variant="h2"
        sx={{ 
          mb: 0,
          pt: 2,
          pl: 0,
          pr: 1,
          textAlign: 'left',
          position: 'relative',
          zIndex: 20
        }}
      >
        {currentWaterState === 'yes' ? 'YES' : currentWaterState === 'maybe' ? 'MAYBE' : 'NO'}
      </Typography>

      <Typography 
      component="h3"
      variant="h3"
        sx={{ 
          mb: 0,
          pl: 0,
          pr: 1,
          textAlign: 'left',
          position: 'relative',
          zIndex: 20
        }}
      >
       {selectedCopy.title} 
      </Typography>


        {/* Reason text */}
        <Typography 
        variant="body1" 
        sx={{ 
            mb: 2,
            opacity: 0.9
        }}
        >
        {todayAdvice.reason}
        </Typography>
      </Box>
      </Box>
      
      {/* Additional advice if available */}
      {todayAdvice.advice && (
            <Typography 
              variant="caption" >
              💡{todayAdvice.advice}
            </Typography>
          )}
    </Card>
  );
}
