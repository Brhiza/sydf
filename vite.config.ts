import { randomUUID } from 'node:crypto';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import { pagesApiPlugin } from './functions/viteApiPlugin';
import { themeAssetPackagesPlugin } from './build/themeAssetPackages';

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
    themeAssetPackagesPlugin(mode === 'android'),
  ],
  build: {
    // 保留旧版 Android WebView 的 JavaScript 语法兼容；CSS 不做全局降级改写。
    target: 'chrome79',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app-[hash].js',
        manualChunks(id) {
          const path = id.replace(/\\/g, '/');
          if (path.includes('/node_modules/vue/') || path.includes('/node_modules/@vue/')) return 'vendor-vue';
          if (path.includes('/node_modules/lucide-vue-next/')) return 'vendor-icons';
          if (path.includes('/mingyu-core/dist/location/') || path.includes('/mingyu-core/dist/location.js')) return 'mingyu-location';
          // 日历也依赖基础干支/五行；若与完整八字引擎合包，会让首页被迫预载整套八字代码。
          if (path.includes('/mingyu-core/dist/ganzhi/')) return 'mingyu-ganzhi';
          if (path.includes('/mingyu-core/dist/wuxing/')) return 'mingyu-wuxing';
          if (path.includes('/mingyu-core/dist/bazi/') || path.includes('/mingyu-core/dist/shensha/')) return 'mingyu-bazi';
          if (path.includes('/node_modules/tyme4ts/')) return 'vendor-tyme';
          if (path.includes('/mingyu-core/dist/calendar/')) return 'mingyu-calendar';
          return undefined;
        },
      },
    },
  },
  });
});
