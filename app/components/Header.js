'use client';

import { Box, ToggleButtonGroup, ToggleButton, Tooltip } from '@mui/material';
import { Thermostat } from '@mui/icons-material';
import IntroText from './IntroText';

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
      
      <IntroText />
    </Box>
  );
}
