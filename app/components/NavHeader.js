'use client';

import { Box, TextField, Button, CircularProgress, Typography, ToggleButtonGroup, ToggleButton, Tooltip } from '@mui/material';
import { WaterDrop, Thermostat } from '@mui/icons-material';

export default function NavHeader({ 
  zipCode, 
  setZipCode, 
  loading, 
  fetchWeatherAndAdvice,
  temperatureUnit,
  setTemperatureUnit
}) {
  return (
    <Box sx={{ 
      display: { xs: 'none', lg: 'block' }, // Only show on desktop
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      bgcolor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(107, 123, 92, 0.1)',
      py: 1,
      px: 2
    }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 3,
        justifyContent: 'space-between',
        width: '100%'
      }}>
        {/* Left side - Location input */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" sx={{ 
            minWidth: 'fit-content'
          }}>
            📍 Location:
          </Typography>
          
          <TextField
            placeholder="ZIP"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            size="small"
            sx={{
              minWidth: 80,
              maxWidth: 100,
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#FEFFFE',
                borderRadius: '6px',
                fontSize: '0.8rem',
                height: 32,
                '& fieldset': {
                  borderColor: '#E8EDE4',
                },
                '&:hover fieldset': {
                  borderColor: '#6B7B5C',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#6B7B5C',
                  borderWidth: '1px',
                },
              },
              '& .MuiOutlinedInput-input': {
                padding: '6px 8px',
                fontSize: '0.8rem',
              }
            }}
          />
          
          <Button
            variant="contained"
            onClick={() => fetchWeatherAndAdvice(true)}
            disabled={loading || !zipCode}
            size="small"
            startIcon={loading ? <CircularProgress size={12} color="inherit" /> : <WaterDrop sx={{ fontSize: '0.8rem' }} />}
            sx={{
              backgroundColor: '#6B7B5C',
              backgroundImage: 'none',
              color: 'white',
              fontWeight: 500,
              borderRadius: '6px',
              textTransform: 'none',
              fontSize: '0.75rem',
              minWidth: 80,
              height: 32,
              px: 1.5,
              '&:hover': {
                backgroundColor: '#5A6B4D',
                backgroundImage: 'none',
              },
              '&:disabled': {
                backgroundColor: '#C4CDB8',
                backgroundImage: 'none',
              }
            }}
          >
            {loading ? 'Asking...' : 'Ask Wynn'}
          </Button>
        </Box>

        {/* Right side - Temperature Toggle */}
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
                fontSize: '0.7rem',
                px: 1,
                py: 0.25,
                minWidth: 32,
                height: 28,
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
              <Thermostat sx={{ fontSize: '0.8rem', mr: 0.3 }} />
              °F
            </ToggleButton>
            <ToggleButton value="celsius" aria-label="celsius">
              <Thermostat sx={{ fontSize: '0.8rem', mr: 0.3 }} />
              °C
            </ToggleButton>
          </ToggleButtonGroup>
        </Tooltip>
      </Box>
    </Box>
  );
}