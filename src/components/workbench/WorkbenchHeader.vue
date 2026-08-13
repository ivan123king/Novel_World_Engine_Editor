<script setup lang="ts">
/**
 * 主工作台顶部项目栏组件。
 * 只负责展示应用名、当前小说项目标题与项目路径提示。
 */

interface WorkbenchHeaderProps {
  appName: string;
  projectTitle: string;
  projectPath: string;
}

defineProps<WorkbenchHeaderProps>();
</script>

<template>
  <n-layout-header bordered class="workbench-header">
    <div class="workbench-header__content">
      <div class="workbench-header__identity">
        <!-- <n-text depth="3" class="workbench-header__app-name">
          {{ appName }}
        </n-text> -->
        <h1 class="workbench-header__title">
          {{ projectTitle }}
        </h1>
        <n-text depth="3" class="workbench-header__path">
          {{ projectPath || '通过“小说 > 新建”或“小说 > 打开”选择项目目录' }}
        </n-text>
      </div>
    </div>
  </n-layout-header>
</template>

<style scoped>
/** 顶部项目栏固定高度，避免主工作区高度计算抖动。 */
.workbench-header {
  height: 76px;
  padding: 14px 22px;
}

/** 项目栏内容横向排布，后续可在右侧扩展保存状态或快捷操作。 */
.workbench-header__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  height: 100%;
}

/** 项目信息区允许长路径截断，避免挤压后续工具入口。 */
.workbench-header__identity {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.workbench-header__app-name {
  font-size: 12px;
  line-height: 1;
}

.workbench-header__title {
  margin: 0;
  color: #17212b;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workbench-header__path {
  font-size: 12px;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
