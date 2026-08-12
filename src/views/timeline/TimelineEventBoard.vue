<script setup lang="ts">
/**
 * 时间线事件平铺区。
 * 展示当前时间块下的事件流，新事件靠前，旧事件靠后。
 */
import { onBeforeUnmount, ref } from 'vue';
import TimelineEventCard from '@/views/timeline/TimelineEventCard.vue';
import type { TimelineEvent, TimelineTimeBlock } from '@/types';

const props = defineProps<{
  /** 当前选中时间块。 */
  timeBlock: TimelineTimeBlock | null;
  /** 当前时间块下按顺序排列的事件。 */
  events: TimelineEvent[];
  /** 当前选中事件 ID。 */
  selectedEventId: string | null;
  /** 保存或加载时禁用操作。 */
  disabled: boolean;
  /** 正在拖动的事件 ID。 */
  draggingEventId: string | null;
  /** 悬停目标事件 ID。 */
  dragOverEventId: string | null;
}>();

const emit = defineEmits<{
  /** 新建事件。 */
  createEvent: [];
  /** 选中事件。 */
  selectEvent: [eventId: string];
  /** 打开事件详情。 */
  detailEvent: [event: TimelineEvent];
  /** 删除事件。 */
  deleteEvent: [eventId: string];
  /** 开始事件拖拽。 */
  startDrag: [eventId: string];
  /** 悬停事件拖放目标。 */
  hoverDropTarget: [eventId: string, placement: 'before' | 'after'];
  /** 拖放到事件。 */
  dropOn: [eventId: string, placement: 'before' | 'after'];
  /** 结束拖拽。 */
  resetDrag: [];
}>();

/** 指针拖拽起点，移动距离超过阈值后才视为排序拖拽。 */
const pointerDragStartPoint = ref<{ x: number; y: number } | null>(null);

/** 当前指针拖拽的事件 ID。 */
const pointerDraggingEventId = ref<string | null>(null);

/** 当前是否已经进入有效排序拖拽状态。 */
const isPointerSorting = ref(false);

/** 指针拖拽启动阈值，避免普通点击被误判成拖拽。 */
const POINTER_DRAG_THRESHOLD = 6;

/**
 * 根据指针所在位置解析目标事件和前后插入位置。
 * @param pointerEvent 指针事件
 */
function resolvePointerDropTarget(pointerEvent: PointerEvent): {
  eventId: string;
  placement: 'before' | 'after';
} | null {
  const element = document.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY);
  const cardElement = element?.closest('[data-event-card-id]');

  if (!(cardElement instanceof HTMLElement)) {
    return null;
  }

  const eventId = cardElement.dataset.eventCardId;

  if (!eventId || eventId === pointerDraggingEventId.value) {
    return null;
  }

  const rect = cardElement.getBoundingClientRect();
  const horizontalPlacement = pointerEvent.clientX > rect.left + rect.width / 2 ? 'after' : 'before';
  const verticalPlacement = pointerEvent.clientY > rect.top + rect.height / 2 ? 'after' : 'before';

  return {
    eventId,
    placement: rect.width >= rect.height ? horizontalPlacement : verticalPlacement,
  };
}

/**
 * 重置指针拖拽状态，并同步清理 workbench 中的拖拽状态。
 */
function resetPointerDrag(): void {
  pointerDragStartPoint.value = null;
  pointerDraggingEventId.value = null;
  isPointerSorting.value = false;
  emit('resetDrag');
  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('pointerup', handlePointerUp);
  window.removeEventListener('pointercancel', handlePointerCancel);
}

/**
 * 抑制排序结束后浏览器补发的 click。
 * @param mouseEvent 鼠标事件
 */
function suppressNextWindowClick(mouseEvent: MouseEvent): void {
  mouseEvent.preventDefault();
  mouseEvent.stopPropagation();
}

/**
 * 处理指针移动，实时更新拖放目标。
 * @param pointerEvent 指针事件
 */
function handlePointerMove(pointerEvent: PointerEvent): void {
  const startPoint = pointerDragStartPoint.value;
  const eventId = pointerDraggingEventId.value;

  if (!startPoint || !eventId) {
    return;
  }

  const movedDistance = Math.hypot(
    pointerEvent.clientX - startPoint.x,
    pointerEvent.clientY - startPoint.y,
  );

  if (!isPointerSorting.value && movedDistance < POINTER_DRAG_THRESHOLD) {
    return;
  }

  pointerEvent.preventDefault();

  if (!isPointerSorting.value) {
    isPointerSorting.value = true;
    emit('startDrag', eventId);
  }

  const target = resolvePointerDropTarget(pointerEvent);

  if (!target) {
    emit('resetDrag');
    emit('startDrag', eventId);
    return;
  }

  emit('hoverDropTarget', target.eventId, target.placement);
}

/**
 * 处理指针释放，提交最终排序。
 * @param pointerEvent 指针事件
 */
function handlePointerUp(pointerEvent: PointerEvent): void {
  if (!isPointerSorting.value) {
    resetPointerDrag();
    return;
  }

  const target = resolvePointerDropTarget(pointerEvent);

  if (target) {
    window.addEventListener('click', suppressNextWindowClick, {
      capture: true,
      once: true,
    });
    emit('dropOn', target.eventId, target.placement);
    resetPointerDrag();
  } else {
    resetPointerDrag();
  }

  pointerEvent.preventDefault();
}

/**
 * 处理指针取消。
 */
function handlePointerCancel(): void {
  resetPointerDrag();
}

/**
 * 开始指针拖拽监听。
 * @param eventId 被拖动事件 ID
 * @param pointerEvent 指针事件
 */
function startPointerDrag(eventId: string, pointerEvent: PointerEvent): void {
  if (props.disabled) {
    return;
  }

  pointerDragStartPoint.value = {
    x: pointerEvent.clientX,
    y: pointerEvent.clientY,
  };
  pointerDraggingEventId.value = eventId;
  isPointerSorting.value = false;

  window.addEventListener('pointermove', handlePointerMove, { passive: false });
  window.addEventListener('pointerup', handlePointerUp, { passive: false });
  window.addEventListener('pointercancel', handlePointerCancel);
}

/** 组件卸载时清理全局指针监听。 */
onBeforeUnmount(() => {
  resetPointerDrag();
});
</script>

<template>
  <section class="event-board" aria-label="时间块事件区">
    <header class="event-board-header">
      <div class="event-board-title-group">
        <h3 class="event-board-title">{{ timeBlock?.name ?? '未选择时间' }}</h3>
        <n-text depth="3" class="event-board-meta">
          {{ timeBlock ? `${events.length} 个事件` : '先选择时间块' }}
        </n-text>
      </div>

      <n-button type="primary" size="small" :disabled="disabled || !timeBlock" @click="emit('createEvent')">
        新建事件
      </n-button>
    </header>

    <div v-if="timeBlock" class="event-grid">
      <TimelineEventCard
        v-for="event in events"
        :key="event.id"
        :event="event"
        :time-name="timeBlock.name"
        :active="selectedEventId === event.id"
        :disabled="disabled"
        :dragging="draggingEventId === event.id"
        :drop-target="dragOverEventId === event.id"
        @select="emit('selectEvent', $event)"
        @detail="emit('detailEvent', $event)"
        @delete="emit('deleteEvent', $event)"
        @dragstart="emit('startDrag', $event)"
        @draghover="(eventId, placement) => emit('hoverDropTarget', eventId, placement)"
        @drop="(eventId, placement) => emit('dropOn', eventId, placement)"
        @dragend="emit('resetDrag')"
        @pointer-drag-start="startPointerDrag"
      />

      <n-empty
        v-if="events.length === 0"
        class="event-empty"
        description="当前时间暂无事件，点击右上角新建事件"
      />
    </div>

    <n-empty v-else description="从左侧选择时间块，或新建一个时间块" />
  </section>
</template>

<style scoped>
/** 右侧事件工作区。 */
.event-board {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  min-width: 0;
  min-height: 0;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #d9e1ea;
  border-radius: 8px;
}

/** 事件区标题栏。 */
.event-board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

/** 标题组。 */
.event-board-title-group {
  display: grid;
  gap: 4px;
  min-width: 0;
}

/** 当前时间块标题。 */
.event-board-title {
  overflow: hidden;
  margin: 0;
  color: #17212b;
  font-size: 20px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/** 事件数量摘要。 */
.event-board-meta {
  font-size: 12px;
  line-height: 1.3;
}

/** 事件平铺网格，从左到右、从上到下依次由新到旧。 */
.event-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  align-content: start;
  gap: 12px;
  min-height: 0;
  overflow: auto;
}

/** 空状态位置。 */
.event-empty {
  grid-column: 1 / -1;
  align-self: center;
}
</style>
