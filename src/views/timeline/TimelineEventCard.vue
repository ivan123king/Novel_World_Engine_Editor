<script setup lang="ts">
/**
 * 时间线事件卡片。
 * 卡片只展示事件标题和所属时间，长内容由详情弹框承载。
 */
import { ref } from 'vue';
import type { TimelineEvent } from '@/types';

const props = defineProps<{
  /** 当前事件。 */
  event: TimelineEvent;
  /** 所属时间名称。 */
  timeName: string;
  /** 是否为当前选中事件。 */
  active: boolean;
  /** 是否禁用拖拽和操作。 */
  disabled: boolean;
  /** 是否正在拖动该事件。 */
  dragging: boolean;
  /** 是否为拖放目标。 */
  dropTarget: boolean;
}>();

const emit = defineEmits<{
  /** 选中事件卡片。 */
  select: [eventId: string];
  /** 打开详情弹框。 */
  detail: [event: TimelineEvent];
  /** 删除事件。 */
  delete: [eventId: string];
  /** 开始拖拽。 */
  dragstart: [eventId: string];
  /** 悬停拖放目标。 */
  draghover: [eventId: string, placement: 'before' | 'after'];
  /** 完成拖放。 */
  drop: [eventId: string, placement: 'before' | 'after'];
  /** 结束拖拽。 */
  dragend: [];
  /** 开始指针拖拽。 */
  pointerDragStart: [eventId: string, event: PointerEvent];
}>();

/** 拖拽后的点击抑制标记，避免排序完成后触发 click 反向取消选中。 */
const suppressNextClick = ref(false);

/**
 * 处理事件卡片拖拽开始。
 * Chromium 原生拖拽需要写入 dataTransfer 数据，避免只有 draggable 但不产生有效拖拽会话。
 */
function handleDragStart(event: DragEvent, eventId: string): void {
  if (!event.dataTransfer) {
    return;
  }

  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', eventId);
  emit('dragstart', eventId);
}

/**
 * 根据鼠标命中事件卡片位置判断拖放到目标前面或后面。
 * 平铺网格中优先按横向位置判断，窄卡片或换行场景再兼容纵向判断。
 * @param event 拖拽事件
 */
function resolveEventDropPlacement(event: DragEvent): 'before' | 'after' {
  const target = event.currentTarget;

  if (!(target instanceof HTMLElement)) {
    return 'before';
  }

  const rect = target.getBoundingClientRect();
  const horizontalPlacement = event.clientX > rect.left + rect.width / 2 ? 'after' : 'before';
  const verticalPlacement = event.clientY > rect.top + rect.height / 2 ? 'after' : 'before';

  return rect.width >= rect.height ? horizontalPlacement : verticalPlacement;
}

/**
 * 处理拖拽悬停，明确告诉浏览器当前目标允许移动放置。
 * @param dragEvent 原生拖拽事件
 * @param eventId 目标事件 ID
 */
function handleDragOver(dragEvent: DragEvent, eventId: string): void {
  if (dragEvent.dataTransfer) {
    dragEvent.dataTransfer.dropEffect = 'move';
  }

  emit('draghover', eventId, resolveEventDropPlacement(dragEvent));
}

/**
 * 判断指针是否从按钮等交互控件开始，避免拖拽吞掉详情、删除操作。
 * @param target 事件目标
 */
function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest('button, input, textarea, select, [role="button"]'));
}

/**
 * 处理指针拖拽开始。
 * 事件排序优先使用 pointer 事件，避免 Electron 中原生 HTML5 drag/drop 失效。
 */
function handlePointerDown(event: PointerEvent, eventId: string): void {
  if (props.disabled || event.button !== 0 || isInteractiveTarget(event.target)) {
    return;
  }

  suppressNextClick.value = false;
  emit('pointerDragStart', eventId, event);
}

/**
 * 处理卡片点击。
 * 指针拖拽结束后浏览器仍可能派发 click，需要忽略这一次点击。
 */
function handleClick(eventId: string): void {
  if (suppressNextClick.value) {
    suppressNextClick.value = false;
    return;
  }

  emit('select', eventId);
}

/** 标记下一次 click 来自拖拽结束，应被忽略。 */
function suppressClickAfterDrag(): void {
  suppressNextClick.value = true;
}

defineExpose({
  suppressClickAfterDrag,
});
</script>

<template>
  <article
    class="event-card"
    :data-event-card-id="event.id"
    :class="{ 'is-active': active, 'is-dragging': dragging, 'is-drop-target': dropTarget }"
    :draggable="false"
    @click="handleClick(event.id)"
    @pointerdown="handlePointerDown($event, event.id)"
    @dragstart="handleDragStart($event, event.id)"
    @dragenter.prevent="handleDragOver($event, event.id)"
    @dragover.prevent="handleDragOver($event, event.id)"
    @drop.prevent="emit('drop', event.id, resolveEventDropPlacement($event))"
    @dragend="emit('dragend')"
  >
    <div class="event-main">
      <h4 class="event-title">{{ event.title || '未命名事件' }}</h4>
      <span class="event-time">
        {{ event.specificTime ? `${timeName} / ${event.specificTime}` : timeName }}
      </span>
    </div>

    <div class="event-actions">
      <n-button size="tiny" secondary @click.stop="emit('detail', event)">详情</n-button>
      <n-button size="tiny" secondary type="error" @click.stop="emit('delete', event.id)">删除</n-button>
    </div>
  </article>
</template>

<style scoped>
/** 事件卡片，保持短内容展示。 */
.event-card {
  display: grid;
  gap: 10px;
  min-height: 88px;
  padding: 12px;
  color: #24313d;
  background: #f8fafc;
  border: 1px solid #dce4ee;
  border-radius: 6px;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.event-card:hover,
.event-card.is-active,
.event-card.is-drop-target {
  background: #eef6ff;
  border-color: #7aa7d9;
}

.event-card.is-active {
  box-shadow: inset 0 0 0 2px #2f80ed;
}

.event-card.is-dragging {
  opacity: 0.52;
}

/** 事件卡片主要信息。 */
.event-main {
  display: grid;
  gap: 6px;
  min-width: 0;
}

/** 事件标题。 */
.event-title {
  overflow: hidden;
  color: #17212b;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/** 所属时间。 */
.event-time {
  overflow: hidden;
  color: #687684;
  font-size: 12px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/** 事件卡片操作。 */
.event-actions {
  display: none;
  gap: 6px;
  align-items: center;
}

.event-card:hover .event-actions {
  display: flex;
}
</style>
