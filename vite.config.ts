import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'D&D Companion',
        short_name: 'DnD',
        description: 'D&D 5e companion for players and DMs',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache app shell — JS/CSS/HTML only; data files are too large
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Raise the limit so large JS chunks aren't silently excluded
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        // SPA: serve index.html for any navigation miss when offline
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/data\//],
        runtimeCaching: [
          {
            // Reference JSON data — cache on first access, serve from cache thereafter
            urlPattern: /\/data\/.*\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'reference-data-v1',
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 90, // 90 days
              },
            },
          },
        ],
      },
      devOptions: {
        // Enable SW in dev so you can verify offline behaviour without a build
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
});
