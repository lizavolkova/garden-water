'use client';

import { useState } from 'react';
import { 
  Box, 
  IconButton, 
  Drawer, 
  Typography, 
  TextField, 
  Button, 
  CircularProgress, 
  ToggleButtonGroup, 
  ToggleButton, 
  Tooltip,
  Divider
} from '@mui/material';
import { Menu as MenuIcon, Close as CloseIcon, WaterDrop, Thermostat } from '@mui/icons-material';

export default function MobileMenu({ 
  zipCode, 
  setZipCode, 
  loading, 
  fetchWeatherAndAdvice,
  temperatureUnit,
  setTemperatureUnit
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleMenuToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSubmit = () => {
    fetchWeatherAndAdvice(true);
    handleClose(); // Close menu after submitting
  };

  return (
    <>
      {/* Hamburger Menu Button - Fixed position */}
      <Box sx={{ 
        position: 'fixed', 
        top: 16, 
        right: 16, 
        zIndex: 1100,
        display: { xs: 'block', lg: 'none' } // Only show on mobile
      }}>
        <IconButton
          onClick={handleMenuToggle}
          sx={{
            bgcolor: 'transparent',
            borderRadius: '12px',
            width: 48,
            height: 48,
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.1)',
            }
          }}
        >
          <MenuIcon sx={{ color: '#6B7B5C', fontSize: '1.5rem' }} />
        </IconButton>
      </Box>

      {/* Drawer Menu */}
      <Drawer
        anchor="right"
        open={isOpen}
        onClose={handleClose}
        sx={{
          display: { xs: 'block', lg: 'none' }, // Only show on mobile
          '& .MuiDrawer-paper': {
            width: 320,
            bgcolor: '#FEFFFE',
            borderLeft: '1px solid rgba(107, 123, 92, 0.1)',
            boxShadow: '0 0 20px rgba(107, 123, 92, 0.15)',
          },
        }}
      >
        <Box sx={{ p: 3, height: '100%' }}>
          {/* Header */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 3 
          }}>
            <Typography variant="h6" sx={{ 
              color: '#4A5D3A', 
              fontWeight: 500,
              fontFamily: 'var(--font-heading)'
            }}>
              Settings
            </Typography>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon sx={{ color: '#6B7B5C' }} />
            </IconButton>
          </Box>

          {/* Location Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ 
              color: '#6B7B5C', 
              fontWeight: 500, 
              mb: 2,
              fontSize: '1rem'
            }}>
              📍 Location
            </Typography>
            
            <TextField
              label="ZIP Code"
              placeholder="Enter ZIP code"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              fullWidth
              size="medium"
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
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
              }}
            />
            
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading || !zipCode}
              fullWidth
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <WaterDrop />}
              sx={{
                backgroundColor: '#6B7B5C',
                backgroundImage: 'none',
                color: 'white',
                fontWeight: 500,
                borderRadius: '8px',
                textTransform: 'none',
                fontSize: '1rem',
                py: 1.2,
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
              {loading ? 'Asking Wynn...' : 'Ask Wynn'}
            </Button>
          </Box>

          <Divider sx={{ my: 3, borderColor: '#E8EDE4' }} />

          {/* Temperature Unit Section */}
          <Box>
            <Typography variant="subtitle1" sx={{ 
              color: '#6B7B5C', 
              fontWeight: 500, 
              mb: 2,
              fontSize: '1rem'
            }}>
              🌡️ Temperature Unit
            </Typography>
            
            <ToggleButtonGroup
              value={temperatureUnit}
              exclusive
              onChange={(event, newUnit) => {
                if (newUnit !== null) {
                  setTemperatureUnit(newUnit);
                }
              }}
              fullWidth
              sx={{
                '& .MuiToggleButton-root': {
                  color: '#6B7B5C',
                  borderColor: '#E8EDE4',
                  fontSize: '1rem',
                  py: 1.5,
                  fontWeight: 500,
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
                <Thermostat sx={{ fontSize: '1.2rem', mr: 1 }} />
                Fahrenheit (°F)
              </ToggleButton>
              <ToggleButton value="celsius" aria-label="celsius">
                <Thermostat sx={{ fontSize: '1.2rem', mr: 1 }} />
                Celsius (°C)
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}