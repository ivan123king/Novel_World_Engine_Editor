<script setup lang="ts">
/**
 * 公共弹框组件。
 * 基于 Naive UI 的 NModal 封装，用于详情、新建、编辑等需要覆盖当前页面的交互场景。
 * 提供统一的标题栏、内容区和底部插槽，并内置 Esc 关闭、点击遮罩关闭等标准行为。
 */
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** 控制弹框显示/隐藏。 */
    open: boolean;
    /** 弹框标题文本。 */
    title: string;
    /** 弹框宽度，支持像素值或百分比。 */
    width?: string | number;
    /** 是否显示关闭按钮。 */
    closable?: boolean;
    /** 是否在点击遮罩时关闭弹框。 */
    maskClosable?: boolean;
  }>(),
  {
    width: 560,
    closable: true,
    maskClosable: true,
  },
);

const emit = defineEmits<{
  /** 弹框关闭事件。 */
  close: [];
  /** 弹框显示状态变化事件。 */
  'update:open': [value: boolean];
}>();

/**
 * 计算弹框预设样式，将宽度配置转换为 Naive UI 需要的格式。
 */
const presetStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
}));

/**
 * 关闭当前弹框，同步触发 close 事件和 update:open 事件。
 */
function handleClose(): void {
  emit('close');
  emit('update:open', false);
}
</script>

<template>
  <n-modal
    :show="open"
    :mask-closable="maskClosable"
    :preset="null"
    @update:show="(val: boolean) => { if (!val) handleClose(); }"
  >
    <n-card :title="title" :closable="closable" :style="presetStyle" @close="handleClose">
      <!-- 内容插槽：放置主要表单或详情内容。 -->
      <div style="max-height: calc(80vh - 140px); overflow: auto">
        <slot />
      </div>

      <!-- 底部插槽：放置操作按钮（如取消、保存等）。 -->
      <template #footer v-if="$slots.footer">
        <slot name="footer" />
      </template>
    </n-card>
  </n-modal>
</template>
