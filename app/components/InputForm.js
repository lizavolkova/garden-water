'use client';

import { Card, CardContent, Box, TextField, Button, Typography } from '@mui/material';
import { LocationOn, WaterDrop } from '@mui/icons-material';
import Image from 'next/image';

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
        bgcolor: '#dfdbc7',
        borderRadius: '0',
        boxShadow: 'none'
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
            <Typography 
        variant="h4" 
        component="h2" 
        sx={{
          color: '#4d5239',
          fontWeight: 500,
          fontSize: { xs: '16px', sm: '12px' },
          mb: 0,
          textAlign: 'center',
          position: 'relative',
          zIndex: 20,
          width: '100%'
        }}
      >
        Where do your green friends live?
      </Typography>
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
              <Image
                src="/loading-spinner.gif"
                alt="Loading..."
                width={48}
                height={48}
                unoptimized
              />
              <Box sx={{ color: '#5A6B4D', fontStyle: 'italic', fontSize: '0.95rem', textAlign: 'center', fontFamily: 'var(--font-body)' }}>
                Consulting with Wynn's gnome wisdom...
              </Box>
            </Box>
          ) : (
            // Normal state - show input and button
            <>
              <TextField
                fullWidth
                // label="Where do your green friends live?"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="Enter your zip code"
                variant="standard"
                sx={{
                  '& .MuiInput-root': {
                    color: '#333333',
                    fontSize: '16px',
                    backgroundColor: 'transparent',
                    '&:before': {
                      borderBottom: '1px solid #5A6B4D',
                    },
                    '&:hover:before': {
                      borderBottom: '2px solid #5A6B4D',
                    },
                    '&:after': {
                      borderBottom: '2px solid #5A6B4D',
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
                    color: '#5A6B4D',
                    fontWeight: 400,
                    '&.Mui-focused': {
                      color: '#5A6B4D',
                    },
                  },
                }}
              />
              <Button
                variant="contained"
                size="large"
                onClick={() => fetchWeatherAndAdvice(true)}
                disabled={!zipCode}
                sx={{ 
                  width: '100%',
                  px: 2,
                  backgroundColor: '#4A5D3A',
                  backgroundImage: 'none',
                  color: 'white',
                  fontWeight: 500,
                  fontSize: '0.95rem',
                  borderRadius: '25px',
                  textTransform: 'none',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  '&.MuiButton-contained': {
                    backgroundColor: '#4A5D3A', 
                    backgroundImage: 'none',
                  },
                  '&:hover': {
                    backgroundColor: '#3F4F2F',
                    backgroundImage: 'none',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
                  },
                  '&:disabled': {
                    backgroundImage: 'none',
                    boxShadow: 'none',
                    color: 'rgba(255, 255, 255, 0.7)'
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
