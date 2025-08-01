'use client';

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#22c55e', // garden-500
      light: '#4ade80', // garden-400
      dark: '#16a34a', // garden-600
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#d6b895', // linen-500
      light: '#e4cfb8', // linen-400
      dark: '#c19a6b', // linen-600
      contrastText: '#ffffff',
    },
    background: {
      default: '#fafaf9', // stone-50
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a', // slate-900
      secondary: '#64748b', // slate-500
    },
    success: {
      main: '#22c55e',
      light: '#4ade80',
      dark: '#16a34a',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    info: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
    },
  },
  typography: {
    fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
    h1: {
      fontSize: '3rem',
      fontWeight: 300,
      letterSpacing: '0.05em',
      color: '#14532d', // garden-900
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 300,
      letterSpacing: '0.025em',
      color: '#166534', // garden-800
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 400,
      color: '#166534', // garden-800
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 500,
      color: '#15803d', // garden-700
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: '#475569', // slate-600
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: '#64748b', // slate-500
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'linear-gradient(135deg, #fbf8f4 0%, #faf5f0 25%, #f0fdf4 100%)',
          minHeight: '100vh',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          padding: '12px 24px',
          fontSize: '1rem',
          fontWeight: 600,
          boxShadow: '0 4px 14px 0 rgba(34, 197, 94, 0.25)',
          '&:hover': {
            boxShadow: '0 6px 20px 0 rgba(34, 197, 94, 0.35)',
            transform: 'translateY(-2px)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
          backdropFilter: 'blur(8px)',
          background: 'rgba(255, 255, 255, 0.85)',
          border: '1px solid rgba(214, 184, 149, 0.2)',
          '&:hover': {
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(8px)',
            '& fieldset': {
              borderColor: 'rgba(214, 184, 149, 0.5)',
              borderWidth: 2,
            },
            '&:hover fieldset': {
              borderColor: 'rgba(34, 197, 94, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#22c55e',
              boxShadow: '0 0 0 4px rgba(34, 197, 94, 0.1)',
            },
          },
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(214, 184, 149, 0.2)',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 50%, #dcfce7 100%)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          color: '#166534', // garden-800
          fontSize: '0.875rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        },
        body: {
          fontSize: '0.875rem',
          color: '#475569', // slate-600
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          fontWeight: 600,
          fontSize: '0.75rem',
          height: 32,
        },
      },
    },
  },
});

export default theme;