import { randomUUID } from 'node:crypto';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { pagesApiPlugin } from './functions/viteApiPlugin';

function appVersionPlugin(version: string): Plugin {
  return {
    name: 'app-version',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version }),
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const version = process.env.CF_PAGES_COMMIT_SHA || randomUUID();
  return ({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    pagesApiPlugin(loadEnv(mode, process.cwd(), '')),
    vue(),
    appVersionPlugin(version),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'favicon-32x32.png',
        'apple-touch-icon.png',
        'logo.webp',
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
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        globIgnores: [
          'favicon-32x32.png',
          'apple-touch-icon.png',
          'logo.webp',
          'pwa-*.png',
          // 卡牌素材数量多且只会按抽牌结果使用，不加入安装时预缓存，避免首次加载下载全部图片。
          'divination-themes/**/*',
        ],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) => request.destination === 'image'
              && url.origin === self.location.origin
              && url.pathname.startsWith('/divination-themes/'),
            // 后续替换同主题图片时自动在后台刷新，避免用户长期看到旧画面。
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'shiyue-divination-theme-images-v3',
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                // 覆盖常用牌阵与浏览记录，但不让全部牌组长期占满设备空间。
                maxEntries: 96,
                maxAgeSeconds: 60 * 60 * 24 * 60,
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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const path = id.replace(/\\/g, '/');
          if (path.includes('/node_modules/vue/') || path.includes('/node_modules/@vue/')) return 'vendor-vue';
          if (path.includes('/node_modules/lucide-vue-next/')) return 'vendor-icons';
          if (path.includes('/mingyu-core/dist/location/') || path.includes('/mingyu-core/dist/location.js')) return 'mingyu-location';
          if (path.includes('/mingyu-core/dist/bazi/') || path.includes('/mingyu-core/dist/ganzhi/') || path.includes('/mingyu-core/dist/shensha/') || path.includes('/mingyu-core/dist/wuxing/')) return 'mingyu-bazi';
          if (path.includes('/node_modules/tyme4ts/')) return 'vendor-tyme';
          if (path.includes('/mingyu-core/dist/calendar/')) return 'mingyu-calendar';
          return undefined;
        },
      },
    },
  },
  });
});
