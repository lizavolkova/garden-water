/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './pages/**/*.{js,ts,jsx,tsx,mdx}',
      './components/**/*.{js,ts,jsx,tsx,mdx}',
      './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    important: '#__next',
    corePlugins: {
      preflight: false,
    },
    theme: {
      extend: {
        colors: {
          linen: {
            50: '#fbf8f4',
            100: '#faf5f0',
            200: '#f5ede1',
            300: '#ede0d0',
            400: '#e4cfb8',
            500: '#d6b895',
            600: '#c19a6b',
            700: '#a67c52',
            800: '#8b6748',
            900: '#72573c',
          },
          nature: {
            50: '#f8fafc',
            100: '#f1f5f9',
            200: '#e2e8f0',
            300: '#cbd5e1',
            400: '#94a3b8',
            500: '#64748b',
            600: '#475569',
            700: '#334155',
            800: '#1e293b',
            900: '#0f172a',
          },
          garden: {
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            400: '#4ade80',
            500: '#22c55e',
            600: '#16a34a',
            700: '#15803d',
            800: '#166534',
            900: '#14532d',
          }
        },
        fontFamily: {
          'sans': ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
          'mono': ['var(--font-geist-mono)', 'monospace'],
        },
        animation: {
          'fade-in': 'fadeIn 0.5s ease-in-out',
          'slide-up': 'slideUp 0.3s ease-out',
          'scale-in': 'scaleIn 0.2s ease-out',
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
          },
          slideUp: {
            '0%': { transform: 'translateY(10px)', opacity: '0' },
            '100%': { transform: 'translateY(0)', opacity: '1' },
          },
          scaleIn: {
            '0%': { transform: 'scale(0.95)', opacity: '0' },
            '100%': { transform: 'scale(1)', opacity: '1' },
          },
        },
        backdropBlur: {
          'xs': '2px',
        }
      },
    },
    plugins: [],
  }
