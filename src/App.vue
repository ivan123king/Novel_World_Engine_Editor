<script setup lang="ts">
/**
 * 主工作台外壳组件。
 * 使用 Naive UI 的 Layout 系列组件构建整体布局，包括：
 * - 顶部项目栏（NLayoutHeader）
 * - 左侧模块导航（NLayoutSider + NMenu）
 * - 右侧页面容器（NLayoutContent + RouterView）
 */
import { computed, onMounted, ref, h } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProjectStore } from '@/stores/projectStore';

interface AppInfo {
  name: string;
  version: string;
  storage: string;
}

interface NavigationItem {
  label: string;
  key: string;
}

/** 应用基础信息。 */
const appInfo = ref<AppInfo>({
  name: 'Novel World Engine Editor',
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
 * 使用 computed 保证响应式更新，key 与路由 path 保持一致。
 */
const navigationItems: NavigationItem[] = [
  { label: '项目首页', key: '/' },
  { label: '人物', key: '/characters' },
  { label: '物品', key: '/items' },
  { label: '地图', key: '/locations' },
  { label: '关系', key: '/relations' },
  { label: '剧情', key: '/plots' },
  { label: '时间线', key: '/timeline' },
  { label: 'AI 上下文', key: '/context-export' },
];

/** 当前激活的菜单 key，与路由路径同步。 */
const activeMenuKey = computed(() => route.path);

/**
 * 菜单项渲染函数。
 * 将 NavigationItem 转换为 Naive UI Menu 需要的选项格式。
 */
const menuOptions = computed(() =>
  navigationItems.map((item) => ({
    label: () => h('span', item.label),
    key: item.key,
  })),
);

/**
 * 处理菜单选择事件，跳转到对应路由。
 * @param key 被选中的菜单项 key（即路由 path）
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
    // Electron preload 未就绪时使用默认值
  }

  try {
    await projectStore.initializeProjectStore();
  } catch {
    // 项目状态初始化失败时维持未打开项目状态
  }
});
</script>

<template>
  <!-- 主布局容器，使用 Naive UI 的 NLayout 组件 -->
  <n-layout class="app-shell">
    <!-- 顶部项目栏：展示应用名、项目名、项目元信息 -->
    <n-layout-header bordered style="height: 76px; padding: 14px 22px">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 24px; height: 100%">
        <!-- 左侧：应用名 + 项目标题 -->
        <div style="display: grid; gap: 5px; min-width: 0">
          <n-text depth="3" style="font-size: 12px; line-height: 1">
            {{ appInfo.name }}
          </n-text>
          <h1 style="margin: 0; font-size: 24px; font-weight: 700; line-height: 1.2; color: #17212b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
            {{ currentProjectTitle }}
          </h1>
          <n-text depth="3" style="font-size: 12px; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
            {{ currentProjectPath || '通过“小说 > 新建”或“小说 > 打开”选择项目目录' }}
          </n-text>
        </div>
       
      </div>
    </n-layout-header>

    <!-- 下方布局：左侧导航 + 右侧内容 -->
    <n-layout class="app-body" has-sider>
      <!-- 左侧模块导航栏 -->
      <n-layout-sider
        bordered
        collapse-mode="width"
        :width="248"
        :collapsed-width="64"
        show-trigger
      >
        <div style="padding: 18px 14px 10px">
          <n-text strong style="font-size: 15px; color: #273646; margin: 0 8px 14px; display: block">
            世界项目
          </n-text>
        </div>

        <!-- Naive UI 导航菜单 -->
        <n-menu
          :value="activeMenuKey"
          :options="menuOptions"
          :indent="20"
          @update:value="handleMenuSelect"
        />
      </n-layout-sider>

      <!-- 右侧页面内容区 -->
      <n-layout-content class="workbench-content" content-style="height: 100%; padding: 24px; overflow: auto">
        <RouterView />
      </n-layout-content>
    </n-layout>
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
