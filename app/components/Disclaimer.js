'use client';

import { Box, Typography } from '@mui/material';

export default function Disclaimer() {
  return (
    <Box 
      sx={{ 
        mt: 4,
        p: 3,
        borderRadius: '8px',
        bgcolor: '#FDF8F6',
        border: '1px solid #E8D4CC',
        textAlign: 'center'
      }}
    >
      <Typography variant="body2">
        <strong>Gnome&apos;s Note:</strong> This friendly garden helper uses AI magic to provide watering advice. 
        While I&apos;ve learned much in my centuries of garden watching, I can still make mistakes! 
        Always check your soil, consider your plants&apos; specific needs, and trust your own gardening instincts too. 🌱
      </Typography>
    </Box>
  );
}