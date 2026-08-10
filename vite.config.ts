import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { pagesApiPlugin } from './functions/viteApiPlugin';

export default defineConfig(({ mode }) => ({
  plugins: [
    pagesApiPlugin(loadEnv(mode, process.cwd(), '')),
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon-32x32.png',
        'apple-touch-icon.png',
        'logo.jpg',
      ],
      manifest: {
        id: '/',
        name: '时月东方',
        short_name: '时月东方',
        description: '东方术数与 AI 解读工具',
        lang: 'zh-CN',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f3f2f5',
        theme_color: '#8368ab',
        categories: ['lifestyle', 'utilities'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        globIgnores: [
          'favicon-32x32.png',
          'apple-touch-icon.png',
          'logo.jpg',
          'pwa-*.png',
        ],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) => request.destination === 'image' && url.origin === self.location.origin,
            handler: 'CacheFirst',
            options: {
              cacheName: 'shiyue-images-v1',
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 160,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        navigateFallback: '/index.html',
        type: 'module',
      },
    }),
  ],
}));
