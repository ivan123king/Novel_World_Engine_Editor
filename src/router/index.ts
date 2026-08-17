import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';
import AiAssistant from '@/views/AiAssistant.vue';
import Characters from '@/views/Characters.vue';
import Items from '@/views/Items.vue';
import Locations from '@/views/Locations.vue';
import Plots from '@/views/Plots.vue';
import ProjectHome from '@/views/ProjectHome.vue';
import Relations from '@/views/Relations.vue';
import Settings from '@/views/Settings.vue';
import Timeline from '@/views/Timeline.vue';

// 主工作台路由表只负责模块入口，不在这里定义模块内部页面细节。
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'project-home',
    component: ProjectHome,
    meta: { title: '项目首页' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: Settings,
    meta: { title: '设定' },
  },
  {
    path: '/characters',
    name: 'characters',
    component: Characters,
    meta: { title: '人物' },
  },
  {
    path: '/items',
    name: 'items',
    component: Items,
    meta: { title: '物品' },
  },
  {
    path: '/locations',
    name: 'locations',
    component: Locations,
    meta: { title: '地点' },
  },
  {
    path: '/relations',
    name: 'relations',
    component: Relations,
    meta: { title: '关系' },
  },
  {
    path: '/plots',
    name: 'plots',
    component: Plots,
    meta: { title: '剧情库' },
  },
  {
    path: '/timeline',
    name: 'timeline',
    component: Timeline,
    meta: { title: '时间线' },
  },
  {
    path: '/ai-assistant',
    name: 'ai-assistant',
    component: AiAssistant,
    meta: { title: 'AI小助手' },
  },
  {
    path: '/context-export',
    redirect: '/ai-assistant',
  },
];

// Electron 本地页面使用 hash history，避免生产环境 file 协议刷新路径失效。
export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
