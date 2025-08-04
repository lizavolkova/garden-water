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
        bgcolor: '#FEFFFE',
        borderRadius: '8px',
        boxShadow: '0 2px 12px rgba(107, 123, 92, 0.08)',
        border: '1px solid #E8EDE4'
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={3} alignItems="center">
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
            disabled={loading || !zipCode}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <WaterDrop sx={{ fontSize: '1.1rem' }} />}
            sx={{ 
              minWidth: 180,
              height: 56,
              px: 2.5,
              backgroundColor: '#6B7B5C',
              backgroundImage: 'none',
              color: 'white',
              fontWeight: 500,
              fontSize: '0.95rem',
              borderRadius: '6px',
              textTransform: 'none',
              boxShadow: '0 2px 8px rgba(107, 123, 92, 0.2)',
              '&.MuiButton-contained': {
                backgroundColor: '#6B7B5C',
                backgroundImage: 'none',
              },
              '&:hover': {
                backgroundColor: '#5A6B4D',
                backgroundImage: 'none',
                boxShadow: '0 2px 6px rgba(122, 132, 113, 0.2)'
              },
              '&:disabled': {
                backgroundColor: '#C4CDB8',
                backgroundImage: 'none',
                boxShadow: 'none'
              }
            }}
          >
            {loading ? 'Consulting gnome wisdom...' : debugMode ? 'Check Weather' : 'Ask Wynn'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
