import { Geist, Geist_Mono, Literata, Cinzel_Decorative } from "next/font/google";
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
});

const cinzelDecorative = Cinzel_Decorative({
  variable: "--font-cinzel-decorative",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata = {
  title: "Garden Watering Assistant",
  description: "AI-powered garden watering recommendations based on weather forecast",
  icons: {
    icon: '/favicon.svg',
  },
  themeColor: '#dfdbc7',
  other: {
    'theme-color': '#dfdbc7',
    'msapplication-navbutton-color': '#dfdbc7',
    'apple-mobile-web-app-status-bar-style': 'default',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${literata.variable} ${cinzelDecorative.variable} antialiased`}
        id="__next"
        style={{ backgroundColor: '#dfdbc7' }}
      >
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
