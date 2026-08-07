<script setup lang="ts">
/**
 * 主工作台外壳。
 * 负责展示项目栏、模块导航和右侧页面容器，不承载具体模块页面细节。
 */
import { onMounted, ref } from 'vue';
import mockNovel from '../mock_data/novel.json';

interface AppInfo {
  name: string;
  version: string;
  storage: string;
}

interface NavigationItem {
  label: string;
  to: string;
}

const appInfo = ref<AppInfo>({
  name: 'Novel World Engine Editor',
  version: '',
  storage: '本地 JSON 文件',
});

// 主导航只表达模块入口，具体模块页面由各 view 文件独立承载。
const navigationItems: NavigationItem[] = [
  { label: '项目首页', to: '/' },
  { label: '人物', to: '/characters' },
  { label: '物品', to: '/items' },
  { label: '地点', to: '/locations' },
  { label: '关系', to: '/relations' },
  { label: '剧情', to: '/events' },
  { label: '时间线', to: '/timeline' },
  { label: 'AI 上下文', to: '/context-export' },
];

onMounted(async () => {
  appInfo.value = await window.novelEngine.getAppInfo();
});
</script>

<template>
  <main class="workbench-shell">
    <header class="project-bar">
      <div class="project-title-block">
        <span class="app-name">{{ appInfo.name }}</span>
        <h1>{{ mockNovel.title }}</h1>
      </div>
      <div class="project-meta" aria-label="当前项目状态">
        <span>{{ mockNovel.projectPath }}</span>
        <span>第 {{ mockNovel.currentChapter }} 章</span>
        <span>{{ mockNovel.saveState }}</span>
      </div>
    </header>

    <div class="workbench-body">
      <aside class="module-sidebar" aria-label="小说世界模块导航">
        <div class="sidebar-title">世界项目</div>
        <nav class="module-nav">
          <RouterLink
            v-for="item in navigationItems"
            :key="item.to"
            class="nav-item"
            :to="item.to"
          >
            {{ item.label }}
          </RouterLink>
        </nav>
      </aside>

      <section class="page-host" aria-label="当前模块页面">
        <RouterView />
      </section>
    </div>
  </main>
</template>
