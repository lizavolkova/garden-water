'use client';

import { Box, Avatar, Typography, ToggleButtonGroup, ToggleButton, Tooltip } from '@mui/material';
import { Thermostat } from '@mui/icons-material';
import Image from 'next/image';

export default function Header({ temperatureUnit, setTemperatureUnit }) {
  return (
    <Box textAlign="center" mb={4}>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Tooltip title="Temperature unit">
          <ToggleButtonGroup
            value={temperatureUnit}
            exclusive
            onChange={(event, newUnit) => {
              if (newUnit !== null) {
                setTemperatureUnit(newUnit);
              }
            }}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                color: '#6B7B5C',
                borderColor: '#E8EDE4',
                fontSize: '0.75rem',
                px: 1.5,
                py: 0.5,
                '&.Mui-selected': {
                  bgcolor: '#6B7B5C',
                  color: 'white',
                  '&:hover': {
                    bgcolor: '#5A6B4D',
                  },
                },
                '&:hover': {
                  bgcolor: '#F9FBF7',
                },
              },
            }}
          >
            <ToggleButton value="fahrenheit" aria-label="fahrenheit">
              <Thermostat sx={{ fontSize: '0.9rem', mr: 0.5 }} />
              °F
            </ToggleButton>
            <ToggleButton value="celsius" aria-label="celsius">
              <Thermostat sx={{ fontSize: '0.9rem', mr: 0.5 }} />
              °C
            </ToggleButton>
          </ToggleButtonGroup>
        </Tooltip>
      </Box>

      <Box
        sx={{
          width: { xs: 140, sm: 160, md: 180 },
          height: { xs: 140, sm: 160, md: 180 },
          margin: '0 auto 32px',
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'transparent'
        }}
      >
        <Image 
          src="/water-gnome-logo.png" 
          alt="Water Gnome Logo"
          width={180}
          height={180}
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'contain'
          }}
          priority
        />
      </Box>
      
      <Typography 
        variant="h1" 
        component="h1" 
        color="#4A5D3A" 
        maxWidth="sm" 
        mx="auto"
        sx={{
          fontWeight: 500,
          fontSize: { xs: '2.2rem', sm: '2.8rem', md: '3.2rem' },
          lineHeight: 1.1,
          letterSpacing: '0.01em',
          mb: 2,
          fontFamily: 'serif'
        }}
      >
        Water Gnome AI
      </Typography>
      
      <Typography 
        variant="body1" 
        color="#7A8471" 
        maxWidth="sm" 
        mx="auto"
        sx={{
          fontWeight: 400,
          lineHeight: 1.6,
          fontSize: '1rem',
          fontStyle: 'italic'
        }}
      >
        Hee-hee-hoo!  I&apos;m Wynn the Water Gnome. With a little help from some modern magic (and a peek at the forecast!), I&apos;ll tell you when it&apos;s time to water, so your garden is always happy.
      </Typography>
    </Box>
  );
}
