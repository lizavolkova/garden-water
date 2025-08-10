'use client';

import { Box } from '@mui/material';
import GnomeCharacter from './GnomeCharacter';
import IntroText from './IntroText';

export default function MobileLayoutSection({ 
  children,
  showIntro = true,
  gnomeProps = {},
  contentProps = {}
}) {
  return (
    <>
      {showIntro && <IntroText />}

      {/* Gnome Image positioned above content */}
      <GnomeCharacter 
        variant="mobile"
        sx={{ 
          pr: '106px', 
          top: '46px', 
          mb: -1,
          ...gnomeProps 
        }}
      />

      {/* Content with 10px overlap */}
      <Box 
        sx={{ 
          position: 'relative', 
          zIndex: 1, 
          mt: -1.25,
          ...contentProps 
        }}
      >
        {children}
      </Box>
    </>
  );
}
