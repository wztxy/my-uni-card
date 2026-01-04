import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';
import App from './App.vue';
import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

const i18n = createI18n({
  legacy: false,
  locale: navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US',
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
});

const app = createApp(App);
app.use(i18n);
app.mount('#app');
