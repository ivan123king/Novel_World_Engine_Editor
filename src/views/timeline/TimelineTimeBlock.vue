<script setup lang="ts">
/**
 * 时间块展示组件。
 * 只展示时间名和别名摘要，并提供选中、编辑、删除和拖拽状态样式。
 */
import type { TimelineTimeBlock } from '@/types';

const props = defineProps<{
  /** 当前时间块。 */
  timeBlock: TimelineTimeBlock;
  /** 是否为选中时间块。 */
  active: boolean;
  /** 是否正在拖动该时间块。 */
  dragging: boolean;
  /** 是否是拖拽悬停目标。 */
  dropTarget: boolean;
  /** 悬停插入位置。 */
  dropPlacement: 'before' | 'after';
  /** 是否禁用操作。 */
  disabled: boolean;
}>();

const emit = defineEmits<{
  /** 选择时间块。 */
  select: [timeBlockId: string];
  /** 编辑时间块。 */
  edit: [timeBlock: TimelineTimeBlock];
  /** 删除时间块。 */
  delete: [timeBlockId: string];
  /** 开始拖拽。 */
  dragstart: [timeBlockId: string];
  /** 悬停拖拽目标。 */
  draghover: [timeBlockId: string, placement: 'before' | 'after', event: DragEvent];
  /** 完成拖放。 */
  drop: [timeBlockId: string, placement: 'before' | 'after'];
  /** 结束拖拽。 */
  dragend: [];
}>();

/**
 * 处理时间块拖拽开始。
 * 写入 dataTransfer，确保 Electron/Chromium 生成有效拖拽会话。
 */
function handleDragStart(event: DragEvent, timeBlockId: string): void {
  if (!event.dataTransfer) {
    return;
  }

  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', timeBlockId);
  emit('dragstart', timeBlockId);
}

/**
 * 根据鼠标位于时间块上半区或下半区判断插入位置。
 * @param event 拖拽事件
 */
function resolveDropPlacement(event: DragEvent): 'before' | 'after' {
  const target = event.currentTarget;

  if (!(target instanceof HTMLElement)) {
    return 'before';
  }

  const targetRect = target.getBoundingClientRect();
  return event.clientY > targetRect.top + targetRect.height / 2 ? 'after' : 'before';
}

/**
 * 处理时间块拖拽悬停，明确允许 move 放置。
 * @param dragEvent 原生拖拽事件
 */
function handleDragOver(dragEvent: DragEvent): void {
  if (dragEvent.dataTransfer) {
    dragEvent.dataTransfer.dropEffect = 'move';
  }

  emit('draghover', props.timeBlock.id, resolveDropPlacement(dragEvent), dragEvent);
}
</script>

<template>
  <button
    class="time-block"
    :class="{
      'is-active': active,
      'is-dragging': dragging,
      'is-drop-target': dropTarget,
      'is-drop-before': dropTarget && dropPlacement === 'before',
      'is-drop-after': dropTarget && dropPlacement === 'after',
    }"
    type="button"
    :disabled="disabled"
    :draggable="!disabled"
    @click="emit('select', timeBlock.id)"
    @dblclick="emit('edit', timeBlock)"
    @dragstart="handleDragStart($event, timeBlock.id)"
    @dragenter.prevent="handleDragOver($event)"
    @dragover.prevent="handleDragOver($event)"
    @drop.prevent="emit('drop', timeBlock.id, resolveDropPlacement($event))"
    @dragend="emit('dragend')"
  >
    <span class="drag-handle" aria-hidden="true">::</span>
    <span class="time-block-content">
      <span class="time-block-name">{{ timeBlock.name }}</span>
      <span class="time-block-aliases">
        {{ timeBlock.aliases.length > 0 ? `别名：${timeBlock.aliases.join('、')}` : '无别名' }}
      </span>
    </span>
    <span class="time-block-actions">
      <n-button size="tiny" secondary @click.stop="emit('edit', timeBlock)">编辑</n-button>
      <n-button size="tiny" secondary type="error" @click.stop="emit('delete', timeBlock.id)">删除</n-button>
    </span>
  </button>
</template>

<style scoped>
/** 时间块节点按钮。 */
.time-block {
  position: relative;
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  gap: 8px;
  width: 100%;
  padding: 10px;
  color: #24313d;
  text-align: left;
  background: #f8fafc;
  border: 1px solid #dce4ee;
  border-radius: 6px;
  cursor: grab;
}

.time-block:hover,
.time-block.is-active {
  background: #eef6ff;
  border-color: #7aa7d9;
}

.time-block.is-dragging {
  opacity: 0.52;
}

.time-block.is-drop-target {
  background: #e5f1ff;
  border-color: #2f80ed;
}

.time-block.is-drop-before {
  box-shadow: inset 0 3px 0 #2f80ed;
}

.time-block.is-drop-after {
  box-shadow: inset 0 -3px 0 #2f80ed;
}

/** 拖拽把手。 */
.drag-handle {
  color: #8a98a8;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  text-align: center;
}

/** 时间块文本内容。 */
.time-block-content {
  display: grid;
  gap: 4px;
  min-width: 0;
}

/** 时间块名称。 */
.time-block-name {
  overflow: hidden;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/** 时间块别名摘要。 */
.time-block-aliases {
  overflow: hidden;
  color: #687684;
  font-size: 12px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/** 时间块快捷操作。 */
.time-block-actions {
  grid-column: 2;
  display: none;
  gap: 6px;
  align-items: center;
}

.time-block:hover .time-block-actions,
.time-block.is-active .time-block-actions {
  display: flex;
}
</style>
