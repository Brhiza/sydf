import { createApp } from 'vue';
import { registerSW } from 'virtual:pwa-register';
import App from './App.vue';
import './design-system/tokens.css';
import './styles.css';
import './design-system/primitives.css';

registerSW({ immediate: true });

createApp(App).mount('#app');
