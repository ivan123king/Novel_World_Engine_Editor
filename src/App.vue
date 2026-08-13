<script setup lang="ts">
/**
 * 主工作台外壳组件。
 * 只负责装配顶部栏、左侧导航、右侧路由容器和全局系统弹框。
 */
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AboutDialog from '@/components/system/AboutDialog.vue';
import SystemConfigEditorModal from '@/components/system/SystemConfigEditorModal.vue';
import WorkbenchHeader from '@/components/workbench/WorkbenchHeader.vue';
import WorkbenchSidebar from '@/components/workbench/WorkbenchSidebar.vue';
import { useProjectStore } from '@/stores/projectStore';
import type { WorkbenchNavigationItem } from '@/types/workbench';

interface AppInfo {
  name: string;
  version: string;
  storage: string;
}

/** 应用基础信息。 */
const appInfo = ref<AppInfo>({
  name: '佳依创式',
  version: '',
  storage: '本地 JSON 文件',
});

/** Vue Router 实例。 */
const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();
const { currentProjectTitle, currentProjectPath } = projectStore;

/**
 * 主导航菜单配置。
 * 后续新增模块入口时只需要扩展此数组，渲染细节由 WorkbenchSidebar 负责。
 */
const navigationItems: WorkbenchNavigationItem[] = [
  { label: '项目首页', key: '/' },
  { label: '人物', key: '/characters' },
  { label: '物品', key: '/items' },
  { label: '地图', key: '/locations' },
  { label: '关系', key: '/relations' },
  { label: '剧情', key: '/plots' },
  { label: '时间线', key: '/timeline' },
  { label: 'AI小助手', key: '/ai-assistant' },
];

/**
 * 处理工作台导航选择事件，跳转到对应模块路由。
 * @param key 被选中的导航项 key，即路由 path
 */
function handleMenuSelect(key: string): void {
  if (key !== route.path) {
    router.push(key);
  }
}

onMounted(async () => {
  try {
    appInfo.value = await window.novelEngine.getAppInfo();
  } catch {
    // Electron preload 未就绪时使用默认值。
  }

  try {
    await projectStore.initializeProjectStore();
  } catch {
    // 项目状态初始化失败时维持未打开项目状态。
  }
});
</script>

<template>
  <!-- 主布局容器，工作台区域由拆分组件装配。 -->
  <n-layout class="app-shell">
    <WorkbenchHeader
      :app-name="appInfo.name"
      :project-title="currentProjectTitle"
      :project-path="currentProjectPath"
    />

    <n-layout class="app-body" has-sider>
      <WorkbenchSidebar
        :active-menu-key="route.path"
        :items="navigationItems"
        @select="handleMenuSelect"
      />

      <n-layout-content class="workbench-content" content-style="height: 100%; padding: 24px; overflow: auto">
        <RouterView />
      </n-layout-content>
    </n-layout>

    <SystemConfigEditorModal />
    <AboutDialog />
  </n-layout>
</template>

<style scoped>
/** 应用外壳固定在 Electron 可视区内，避免模块内容触发 body 级滚动。 */
.app-shell {
  height: 100vh;
  min-height: 640px;
  overflow: hidden;
}

/** 顶部项目栏下方的主工作区，高度扣除固定项目栏。 */
.app-body {
  height: calc(100vh - 76px);
  min-height: 0;
}

/** 右侧路由承载区，滚动边界由各模块内部进一步控制。 */
.workbench-content {
  height: 100%;
  min-height: 0;
}
</style>
