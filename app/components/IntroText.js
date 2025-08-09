'use client';

import { Box, Typography } from '@mui/material';

export default function IntroText() {
  return (
    <Box sx={{ textAlign: 'center', mb: { xs: '-50px', lg: 4 }, px: 3 }}>
      <Typography 
        variant="h2" 
        component="h2" 
        sx={{
          fontWeight: 400,
          fontSize: { xs: '24px', md: '3.2rem' },
          lineHeight: 1.1,
          letterSpacing: '0.01em',
          mb: 2,
          fontFamily: 'var(--font-heading)',
          color: '#3f2a14',
          maxWidth: 'sm',
          mx: 'auto'
        }}
      >
        water gnome ai
      </Typography>

      <Typography 
        variant="h1" 
        component="h1" 
        sx={{
          fontWeight: 400,
          fontSize: { xs: '2.2rem', sm: '3rem', md: '3.2rem' },
          lineHeight: 1.1,
          letterSpacing: '0.01em',
          mb: 2,
          fontFamily: 'var(--font-cinzel-decorative)',
          color: '#3f2a14',
          maxWidth: 'sm',
          mx: 'auto'
        }}
      >
        Wynn the Water Gnome
      </Typography>
      
      <Typography 
        variant="body1" 
        sx={{
          fontWeight: 200,
          lineHeight: 1.6,
          fontSize: { xs: '.8rem', sm: '1.1rem', lg: '1rem' },
          fontFamily: 'var(--font-body)',
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
