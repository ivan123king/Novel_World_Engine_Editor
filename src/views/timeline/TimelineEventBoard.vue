<script setup lang="ts">
/**
 * 时间线事件平铺区。
 * 展示当前时间块下的事件流，新事件靠前，旧事件靠后。
 * 拖拽排序完全委托子组件 TimelineEventCard 中
 * 的原生 HTML5 Drag & Drop API，与左侧时间块实现保持一致，
 * 避免在 Electron 渲染进程中自定义 mousemove 监听带来的时序问题。
 */
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
  /** 当前事件拖放插入位置。 */
  eventDropPlacement: 'before' | 'after';
}>();

const emit = defineEmits<{
  /** 新建事件。 */
  createEvent: [];
  /** 选中事件。 */
  selectEvent: [eventId: string];
  /** 打开事件右键菜单。 */
  contextMenuEvent: [event: MouseEvent, timelineEvent: TimelineEvent];
  /** 打开事件详情。 */
  detailEvent: [event: TimelineEvent];
  /** 删除事件。 */
  deleteEvent: [eventId: string];
  /** 开始事件拖拽会话（原生 dragstart）。 */
  startDrag: [eventId: string];
  /** 悬停到事件拖放目标，判断前后插入位置。 */
  hoverDropTarget: [eventId: string, placement: 'before' | 'after'];
  /** 清空拖放目标高亮，但保持拖拽会话。 */
  clearDropTarget: [];
  /** 完成拖放，将事件放到目标前后。 */
  dropOn: [eventId: string, placement: 'before' | 'after'];
  /** 结束拖拽会话（dragend 触发）。 */
  resetDrag: [];
}>();
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
      <!-- 事件卡片列表：直接转发原生 dnd 事件到 workbench -->
      <TimelineEventCard
        v-for="event in events"
        :key="event.id"
        :event="event"
        :time-name="timeBlock.name"
        :active="selectedEventId === event.id"
        :disabled="disabled"
        :dragging="draggingEventId === event.id"
        :drop-target="dragOverEventId === event.id"
        :drop-placement="dragOverEventId === event.id ? eventDropPlacement : 'before'"
        @select="emit('selectEvent', $event)"
        @context-menu="(event, timelineEvent) => emit('contextMenuEvent', event, timelineEvent)"
        @detail="emit('detailEvent', $event)"
        @delete="emit('deleteEvent', $event)"
        @dragstart="emit('startDrag', $event)"
        @draghover="(eventId, placement) => emit('hoverDropTarget', eventId, placement)"
        @drop="(eventId, placement) => emit('dropOn', eventId, placement)"
        @dragend="emit('resetDrag')"
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
