import { createApp } from 'vue';
import { registerSW } from 'virtual:pwa-register';
import App from './App.vue';
import './design-system/tokens.css';
import './styles.css';
import './design-system/primitives.css';

createApp(App).mount('#app');

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('shiyue:pwa-update', { detail: { updateSW } }));
  },
  onRegisterError(error) {
    console.error('PWA 注册失败', error);
  },
});
