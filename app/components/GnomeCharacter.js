'use client';

import Image from 'next/image';
import { Box } from '@mui/material';

export default function GnomeCharacter({ 
  variant = 'mobile', // 'mobile' or 'desktop'
  sx = {},
  ...props 
}) {
  const baseStyle = {
    maxWidth: '100%',
    height: 'auto',
    filter: 'drop-shadow(0 8px 24px rgba(107, 123, 92, 0.3))',
  };

  const dimensions = {
    mobile: { width: 200, height: 300 },
    desktop: { width: 450, height: 675 }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: variant === 'mobile' ? 'flex-end' : 'center',
        alignItems: variant === 'mobile' ? 'flex-start' : 'flex-start',
        position: 'relative',
        zIndex: 10,
        ...sx
      }}
      {...props}
    >
      <Image
        src="/water-gnome-character.png"
        alt="Wynn the Water Gnome"
        width={dimensions[variant].width}
        height={dimensions[variant].height}
        style={baseStyle}
        priority
      />
    </Box>
  );
}
