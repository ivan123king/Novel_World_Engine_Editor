/**
 * Vue 应用入口文件。
 * 负责挂载 Vue 应用、配置路由和全局引入 Naive UI 组件库。
 */
import { createApp } from 'vue';
import VueKonva from 'vue-konva';
import {
  create,
  NButton,
  NCard,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NText,
  NTag,
  NSpace,
  NDescriptions,
  NDescriptionsItem,
  NGrid,
  NGridItem,
  NLayout,
  NLayoutHeader,
  NLayoutSider,
  NLayoutContent,
  NMenu,
  NBadge,
  NEmpty,
  NDivider,
  NScrollbar,
  NCode,
} from 'naive-ui';
import App from './App.vue';
import { router } from './router';
import './style.css';

/**
 * 创建 Naive UI 组件实例，按需注册常用组件。
 * 采用按需引入方式，减小打包体积，同时保持开发便捷性。
 */
const naive = create({
  components: [
    NButton,
    NCard,
    NModal,
    NForm,
    NFormItem,
    NInput,
    NInputNumber,
    NText,
    NTag,
    NSpace,
    NDescriptions,
    NDescriptionsItem,
    NGrid,
    NGridItem,
    NLayout,
    NLayoutHeader,
    NLayoutSider,
    NLayoutContent,
    NMenu,
    NBadge,
    NEmpty,
    NDivider,
    NScrollbar,
    NCode,
  ],
});

/**
 * 应用主入口。
 * 挂载顺序：路由 -> Naive UI -> Konva 画布组件 -> 挂载到 #app
 */
createApp(App).use(router).use(naive).use(VueKonva).mount('#app');
