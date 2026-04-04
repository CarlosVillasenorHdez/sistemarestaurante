import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../styles/tailwind.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';

// ── Viewport (separate export required by Next.js 15) ─────────────────────────
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  // themeColor here also sets <meta name="theme-color"> for Android Chrome
  themeColor: '#f59e0b',
};

// ── Metadata ──────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: 'Aldente — Gestión Integral para Restaurantes',
  description:
    'Plataforma completa para gestionar órdenes, mesas, inventario y personal de tu restaurante desde un solo lugar.',

  // Manifest — tells Chrome/Android to offer "Add to Home Screen"
  manifest: '/manifest.json',

  // Favicon + Apple touch icon
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    // iOS Safari: used when user taps "Add to Home Screen"
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },

  // apple-mobile-web-app-* meta tags (iOS PWA behaviour)
  appleWebApp: {
    capable: true,                  // <meta name="apple-mobile-web-app-capable">
    statusBarStyle: 'black-translucent', // dark status bar over the amber header
    title: 'Aldente',
    startupImage: [
      // iPhone Pro Max
      {
        url: '/icons/apple-touch-icon.png',
        media:
          '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)',
      },
      // iPhone 14 / 15
      {
        url: '/icons/apple-touch-icon.png',
        media:
          '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)',
      },
      // iPad
      {
        url: '/icons/apple-touch-icon.png',
        media:
          '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)',
      },
    ],
  },

  // Open Graph (bonus: looks good when shared in WhatsApp)
  openGraph: {
    title: 'Aldente — Gestión para Restaurantes',
    description: 'POS, cocina, mesero móvil y reportes. Todo desde el navegador.',
    type: 'website',
  },
};

// ── Root Layout ───────────────────────────────────────────────────────────────
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX">
      <head>
        {/*
          format-detection: prevents iOS from auto-linking phone numbers in POS screens.
          mobile-web-app-capable: Chrome on Android respects this alongside the manifest.
        */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />

        <script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fsistemares5994back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.17" />
        <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.2" /></head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
            },
          }}
        />
      </body>
    </html>
  );
}