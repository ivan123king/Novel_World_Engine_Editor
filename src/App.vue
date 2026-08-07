<script setup lang="ts">
import { onMounted, ref } from 'vue';

const appInfo = ref({
  name: 'Novel World Engine Editor',
  version: '',
  storage: '本地 JSON 文件',
});

onMounted(async () => {
  appInfo.value = await window.novelEngine.getAppInfo();
});
</script>

<template>
  <main class="shell">
    <aside class="sidebar">
      <div class="brand">Novel World Engine</div>
      <nav>
        <button class="nav-item active">项目首页</button>
        <button class="nav-item" disabled>人物</button>
        <button class="nav-item" disabled>关系图</button>
        <button class="nav-item" disabled>剧情事件</button>
        <button class="nav-item" disabled>AI 上下文</button>
      </nav>
    </aside>

    <section class="workspace">
      <header class="topbar">
        <div>
          <h1>{{ appInfo.name }}</h1>
          <p>本地优先的小说世界状态编辑器</p>
        </div>
        <span class="badge">存储：{{ appInfo.storage }}</span>
      </header>

      <section class="panel">
        <h2>工程已启动</h2>
        <p>
          当前只建立基础 Electron + Vue3 + TypeScript 工程。后续功能会按文档阶段逐步扩展。
        </p>
        <dl>
          <div>
            <dt>应用版本</dt>
            <dd>{{ appInfo.version || '开发模式' }}</dd>
          </div>
          <div>
            <dt>当前阶段</dt>
            <dd>第 2 阶段：基础工程</dd>
          </div>
          <div>
            <dt>数据方向</dt>
            <dd>用户选择目录中的 JSON 文件</dd>
          </div>
        </dl>
      </section>
    </section>
  </main>
</template>
