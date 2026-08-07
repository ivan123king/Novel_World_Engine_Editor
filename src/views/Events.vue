<script setup lang="ts">
/**
 * 剧情模块视图。
 * 使用 Naive UI 的 NCard、NEmpty 组件标识模块入口，
 * 剧情事件编辑器后续单独设计开发。
 */
</script>

<template>
  <n-card title="剧情事件" :bordered="true">
    <n-empty description="剧情事件模块开发中，敬请期待">
      <template #description-extra>
        <br />
        <n-text depth="3">
          这里将提供：剧情节点管理、事件因果链、分支剧情等功能
        </n-text>
      </template>
    </n-empty>
  </n-card>
</template>
