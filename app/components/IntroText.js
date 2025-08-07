'use client';

import { Box, Typography } from '@mui/material';

export default function IntroText() {
  return (
    <Box sx={{ textAlign: 'center', mb: { xs: 3, lg: 4 } }}>
      <Typography 
        variant="h1" 
        component="h1" 
        sx={{
          fontWeight: 200,
          fontSize: { xs: '2.5rem', sm: '3rem', md: '3.2rem' },
          lineHeight: 1.1,
          letterSpacing: '0.01em',
          mb: 2,
          fontFamily: 'var(--font-literata), "Times New Roman", serif',
          color: '#3f2a14',
          maxWidth: 'sm',
          mx: 'auto'
        }}
      >
        Water Gnome AI
      </Typography>
      
      <Typography 
        variant="body1" 
        sx={{
          fontWeight: 200,
          lineHeight: 1.6,
          fontSize: { xs: '1rem', sm: '1.1rem', lg: '1rem' },
          fontFamily: 'var(--font-literata), "Times New Roman", serif',
          color: '#3f2a14',
          fontStyle: { xs: 'normal', lg: 'italic' },
          maxWidth: 'sm',
          mx: 'auto'
        }}
      >
        Hee-hee-hoo! I&apos;m <strong>Wynn the Water Gnome</strong>. With a little help from some modern magic (and a peek at the forecast!), I&apos;ll tell you when it&apos;s time to water, so your garden is always happy.
      </Typography>
    </Box>
  );
}