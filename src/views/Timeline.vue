<script setup lang="ts">
/**
 * 时间线模块视图。
 * 使用 Naive UI 的 NCard、NEmpty 组件标识模块入口，
 * 时间线编辑器后续单独设计开发。
 */
</script>

<template>
  <n-card title="时间线" :bordered="true">
    <n-empty description="时间线模块开发中，敬请期待">
      <template #description-extra>
        <br />
        <n-text depth="3">
          这里将提供：历史时间线、事件时间轴、年代纪元管理等功能
        </n-text>
      </template>
    </n-empty>
  </n-card>
</template>
