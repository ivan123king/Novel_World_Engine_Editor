<script setup lang="ts">
/**
 * 主工作台左侧导航组件。
 * 将业务模块导航项转换为 Naive UI 菜单配置，并向外抛出选择事件。
 */
import { computed, h } from 'vue';
import type { WorkbenchNavigationItem } from '@/types/workbench';

interface WorkbenchSidebarProps {
  activeMenuKey: string;
  items: WorkbenchNavigationItem[];
}

interface WorkbenchSidebarEmits {
  (event: 'select', key: string): void;
}

const props = defineProps<WorkbenchSidebarProps>();
const emit = defineEmits<WorkbenchSidebarEmits>();

/** 将工作台导航数据转换为 Naive UI 菜单需要的选项结构。 */
const menuOptions = computed(() =>
  props.items.map((item) => ({
    label: () => h('span', item.label),
    key: item.key,
  })),
);

/** 统一收口菜单选择事件，避免父组件依赖 Naive UI 的事件命名。 */
function handleMenuSelect(key: string): void {
  emit('select', key);
}
</script>

<template>
  <n-layout-sider
    bordered
    collapse-mode="width"
    :width="248"
    :collapsed-width="64"
    show-trigger
  >
    <n-menu
      :value="activeMenuKey"
      :options="menuOptions"
      :indent="20"
      @update:value="handleMenuSelect"
    />
  </n-layout-sider>
</template>
