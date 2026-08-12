<script setup lang="ts">
/**
 * 时间线事件卡片。
 * 卡片只展示事件标题和所属时间，长内容由详情弹框承载。
 * 拖拽排序使用原生 HTML5 Drag & Drop API，与左侧时间块实现保持一致，
 * 避免在 Electron 渲染进程中自定义 mousemove 监听导致的时序问题。
 */
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
  /** 拖放到目标事件前面或后面。 */
  dropPlacement: 'before' | 'after';
}>();

const emit = defineEmits<{
  /** 选中事件卡片。 */
  select: [eventId: string];
  /** 打开详情弹框。 */
  detail: [event: TimelineEvent];
  /** 删除事件。 */
  delete: [eventId: string];
  /** 开始拖拽事件（原生 dragstart 触发）。 */
  dragstart: [eventId: string];
  /** 拖拽悬停在当前事件上，用于判断前后插入位置。 */
  draghover: [eventId: string, placement: 'before' | 'after'];
  /** 完成拖放，将当前正在拖的事件放到此事件前后。 */
  drop: [eventId: string, placement: 'before' | 'after'];
  /** 结束整个拖拽会话（无论是否成功放置）。 */
  dragend: [];
}>();

/**
 * 判断指针是否从按钮等交互控件开始，避免拖拽吞掉详情、删除操作。
 * @param target 事件目标
 */
function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest('button, input, textarea, select, [role="button"]'));
}

/**
 * 处理事件卡片拖拽开始。
 * 写入 dataTransfer，确保 Electron/Chromium 生成有效的原生拖拽会话，
 * 并在点击到按钮等可交互元素时提前返回，不触发拖拽。
 * ★ 关键修复：effectAllowed 和 setData 必须写入后再 emit，
 *   且必须在同一个同步宏任务中完成，Chromium 才会绑定有效拖拽会话。
 */
function handleDragStart(event: DragEvent, eventId: string): void {
  if (props.disabled || isInteractiveTarget(event.target)) {
    event.preventDefault();
    return;
  }

  const dt = event.dataTransfer;
  if (!dt) {
    event.preventDefault();
    return;
  }

  try {
    dt.effectAllowed = 'move';
    dt.setData('text/plain', eventId);
    dt.setData('application/x-novel-engine-event-id', eventId);
  } catch {
    event.preventDefault();
    return;
  }

  emit('dragstart', eventId);
}

/**
 * 根据鼠标位于卡片左半区还是右半区（事件卡片横向网格排列），判断插入位置。
 * @param event 原生拖拽事件
 */
function resolveDropPlacement(event: DragEvent): 'before' | 'after' {
  const target = event.currentTarget;

  if (!(target instanceof HTMLElement)) {
    return 'before';
  }

  const targetRect = target.getBoundingClientRect();
  return event.clientX > targetRect.left + targetRect.width / 2 ? 'after' : 'before';
}

/**
 * 处理拖拽悬停，明确允许 move 放置，并向父级上报悬停位置。
 * ★ 关键修复：
 *   1. 函数第一行显式调用 preventDefault() + stopPropagation()，
 *      不依赖 Vue 的 .prevent 修饰符（在 Electron 冒泡场景下修饰符时序不稳定）。
 *   2. 先 preventDefault，再设置 dropEffect = 'move'，
 *      Chromium 才会认为此元素是合法 drop 目标，进而在松开鼠标时触发 drop 事件。
 */
function handleDragOver(dragEvent: DragEvent): void {
  if (props.disabled) {
    return;
  }

  dragEvent.preventDefault();
  dragEvent.stopPropagation();

  if (dragEvent.dataTransfer) {
    dragEvent.dataTransfer.dropEffect = 'move';
  }

  emit('draghover', props.event.id, resolveDropPlacement(dragEvent));
}

/**
 * 处理 drop 放置事件。
 * ★ 关键修复：drop 事件也必须显式调用 preventDefault() + stopPropagation()，
 *   否则 Chromium 可能把它当作"无效 drop"，跳转到浏览器默认的文件拖放页面行为。
 *   另外在此读取 dataTransfer.getData()，用于双重校验与日志。
 */
function handleDrop(dragEvent: DragEvent): void {
  if (props.disabled) {
    return;
  }

  dragEvent.preventDefault();
  dragEvent.stopPropagation();

  const placement = resolveDropPlacement(dragEvent);
  emit('drop', props.event.id, placement);
}
</script>

<template>
  <article
    class="event-card"
    :data-event-card-id="event.id"
    :class="{
      'is-active': active,
      'is-dragging': dragging,
      'is-drop-target': dropTarget,
      'is-drop-before': dropTarget && dropPlacement === 'before',
      'is-drop-after': dropTarget && dropPlacement === 'after',
    }"
    :draggable="!disabled"
    @click="emit('select', event.id)"
    @dragstart="handleDragStart($event, event.id)"
    @dragenter="handleDragOver"
    @dragover="handleDragOver"
    @drop="handleDrop"
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
  position: relative;
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

.event-card.is-drop-before::before,
.event-card.is-drop-after::after {
  position: absolute;
  top: 10px;
  bottom: 10px;
  width: 4px;
  background: #2f80ed;
  border-radius: 999px;
  content: '';
}

.event-card.is-drop-before::before {
  left: -8px;
}

.event-card.is-drop-after::after {
  right: -8px;
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
