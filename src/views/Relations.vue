<script setup lang="ts">
/**
 * 关系模块视图。
 * 使用 Naive UI 的 NCard、NEmpty 组件标识模块入口，
 * 关系图画布后续单独设计开发。
 */
</script>

<template>
  <n-card title="关系图谱" :bordered="true">
    <n-empty description="关系图谱模块开发中，敬请期待">
      <template #description-extra>
        <br />
        <n-text depth="3">
          这里将提供：人物关系可视化、势力组织关系、物品归属关系等功能
        </n-text>
      </template>
    </n-empty>
  </n-card>
</template>
