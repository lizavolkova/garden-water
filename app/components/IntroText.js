'use client';

import { Box, Typography } from '@mui/material';

export default function IntroText() {
  return (
    <Box sx={{ 
      textAlign: 'center', 
      mb: { xs: '-50px', lg: 4 }, 
      px: 3,
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none'
    }}>
      <Typography 
        variant="h2" 
        component="h2" 
        sx={{
          mb: 2,
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
          fontFamily: 'var(--font-cinzel-decorative)',
          mb: 2,
          maxWidth: 'sm',
          mx: 'auto'
        }}
      >
        Wynn the Water Gnome
      </Typography>
      
      <Typography 
        variant="body1" 
        sx={{
          maxWidth: 'sm',
          mx: 'auto'
        }}
      >
        Hee-hee-hoo! I&apos;m <strong>Wynn the Water Gnome</strong>. With a little help from some modern magic (and a peek at the forecast!), I&apos;ll tell you when it&apos;s time to water, so your garden is always happy.
      </Typography>
    </Box>
  );
}
