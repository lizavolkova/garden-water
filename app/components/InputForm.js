'use client';

import { Card, CardContent, Box, TextField, Button, CircularProgress } from '@mui/material';
import { LocationOn, WaterDrop } from '@mui/icons-material';

export default function InputForm({ 
  zipCode, 
  setZipCode, 
  loading, 
  debugMode, 
  fetchWeatherAndAdvice 
}) {
  return (
    <Card 
      sx={{ 
        mb: 4,
        bgcolor: '#4A5D3A',
        borderRadius: '8px',
        boxShadow: '0 2px 12px rgba(107, 123, 92, 0.08)',
        border: '1px solid #5A6B4D'
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box 
          display="flex" 
          flexDirection={{ xs: 'column', sm: 'row' }} 
          gap={3} 
          alignItems="center"
          sx={{ 
            minHeight: { xs: 140, sm: 56 } // Consistent height for mobile (account for column layout + gaps)
          }}
        >
          {loading ? (
            // Loading state - replace input/button with spinner
            <Box 
              sx={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: { xs: 140, sm: 56 }, // Match the minHeight exactly
                gap: 2
              }}
            >
              <CircularProgress 
                size={48} 
                sx={{ color: 'white' }}
              />
              <Box sx={{ color: 'white', fontStyle: 'italic', fontSize: '0.95rem', textAlign: 'center', fontFamily: 'var(--font-literata), "Times New Roman", serif' }}>
                Consulting with Wynn's gnome wisdom...
              </Box>
            </Box>
          ) : (
            // Normal state - show input and button
            <>
              <TextField
                fullWidth
                label="Where do your green friends live?"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="Where is your garden?"
                InputProps={{
                  startAdornment: <LocationOn sx={{ mr: 1, color: '#6B7B5C' }} />,
                }}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '6px',
                    bgcolor: '#FEFFFE',
                    color: '#333333',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.8)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'white',
                      borderWidth: '1px',
                    },
                    '& input': {
                      color: '#333333',
                      '&::placeholder': {
                        color: '#7A8471',
                        opacity: 1
                      }
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: '#7A8471',
                    fontWeight: 400,
                    '&.Mui-focused': {
                      color: '#6B7B5C',
                    },
                  },
                }}
              />
              <Button
                variant="contained"
                size="large"
                onClick={() => fetchWeatherAndAdvice(true)}
                disabled={!zipCode}
                startIcon={<WaterDrop sx={{ fontSize: '1.1rem' }} />}
                sx={{ 
                  minWidth: 180,
                  height: 56,
                  px: 2.5,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  backgroundImage: 'none',
                  color: 'white',
                  fontWeight: 500,
                  fontSize: '0.95rem',
                  borderRadius: '6px',
                  textTransform: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  '&.MuiButton-contained': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    backgroundImage: 'none',
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    backgroundImage: 'none',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
                  },
                  '&:disabled': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    backgroundImage: 'none',
                    boxShadow: 'none',
                    color: 'rgba(255, 255, 255, 0.5)'
                  }
                }}
              >
                {debugMode ? 'Check Weather' : 'Ask Wynn'}
              </Button>
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
