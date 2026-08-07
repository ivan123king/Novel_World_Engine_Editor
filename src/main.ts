import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import './style.css';

// renderer 入口负责挂载 Vue 应用和页面路由。
createApp(App).use(router).mount('#app');
