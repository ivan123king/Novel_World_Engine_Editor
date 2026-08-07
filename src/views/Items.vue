<script setup lang="ts">
/**
 * 物品模块视图。
 * 使用 Naive UI 的 NCard、NEmpty 组件标识模块入口，
 * 具体物品页面后续单独设计开发。
 */
</script>

<template>
  <n-card title="物品道具" :bordered="true">
    <n-empty description="物品道具模块开发中，敬请期待">
      <template #description-extra>
        <br />
        <n-text depth="3">
          这里将提供：武器装备、消耗道具、重要物品、物品与角色关联等功能
        </n-text>
      </template>
    </n-empty>
  </n-card>
</template>
