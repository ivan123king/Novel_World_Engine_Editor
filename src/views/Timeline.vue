<script setup lang="ts">
/**
 * 时间线模块主视图。
 * 页面只负责组合时间线选择器、时间轴、事件看板和弹框；
 * 具体数据读写、拖拽排序、表单状态统一放在 useTimelineWorkbench 中。
 */
import { computed, nextTick, onMounted, reactive } from 'vue';
import TimelineAxis from '@/views/timeline/TimelineAxis.vue';
import TimelineEventBoard from '@/views/timeline/TimelineEventBoard.vue';
import TimelineEventDetailDialog from '@/views/timeline/TimelineEventDetailDialog.vue';
import TimelineSelector from '@/views/timeline/TimelineSelector.vue';
import TimelineTimeBlockDialog from '@/views/timeline/TimelineTimeBlockDialog.vue';
import { useTimelineWorkbench } from '@/views/timeline/useTimelineWorkbench';
import type { TimelineEvent, TimelineTimeBlock } from '@/types';

/** 时间线右键菜单目标。 */
type TimelineContextMenuTarget =
  | {
      /** 当前命中时间块。 */
      targetType: 'timeBlock';
      /** 时间块对象。 */
      timeBlock: TimelineTimeBlock;
    }
  | {
      /** 当前命中事件卡片。 */
      targetType: 'event';
      /** 事件对象。 */
      event: TimelineEvent;
    };

/** 时间线右键菜单动作。 */
type TimelineContextMenuAction =
  | 'editTimeBlock'
  | 'detailTimeBlock'
  | 'deleteTimeBlock'
  | 'editEvent'
  | 'detailEvent'
  | 'deleteEvent';

const {
  timelineOptions,
  selectedTimelineId,
  selectedTimeline,
  selectedTimeBlock,
  orderedTimeBlocks,
  selectedTimeBlockEvents,
  selectedEventId,
  isTimeBlockDialogOpen,
  timeBlockDialogMode,
  isEventDetailDialogOpen,
  eventDialogMode,
  timeBlockFormValues,
  eventFormValues,
  editingEventId,
  isLoading,
  isSaving,
  loadError,
  saveError,
  fileErrors,
  dataDirectory,
  draggingTimeBlockId,
  dragOverTimeBlockId,
  timeBlockDropPlacement,
  draggingEventId,
  dragOverEventId,
  eventDropPlacement,
  hasErrorMessage,
  canSubmitTimeBlock,
  canSubmitEvent,
  loadTimelines,
  selectTimeline,
  createTimeline,
  renameSelectedTimeline,
  deleteSelectedTimeline,
  selectTimeBlock,
  openCreateTimeBlock,
  openEditTimeBlock,
  openTimeBlockDetail,
  editCurrentTimeBlock,
  closeTimeBlockDialog,
  submitTimeBlockForm,
  deleteTimeBlock,
  startTimeBlockDrag,
  hoverTimeBlockDropTarget,
  resetTimeBlockDrag,
  dropTimeBlockOn,
  openCreateEvent,
  openEventDetail,
  selectEvent,
  editCurrentEvent,
  closeEventDetailDialog,
  submitEventForm,
  deleteEvent,
  startEventDrag,
  hoverEventDropTarget,
  clearEventDropTarget,
  resetEventDrag,
  dropEventOn,
} = useTimelineWorkbench();

/** 前端模拟右键菜单状态；后续需要时可迁移为 Electron 原生菜单。 */
const contextMenu = reactive<{
  show: boolean;
  x: number;
  y: number;
  target: TimelineContextMenuTarget | null;
}>({
  show: false,
  x: 0,
  y: 0,
  target: null,
});

/** 根据当前右键命中目标生成菜单项。 */
const contextMenuOptions = computed(() => {
  if (contextMenu.target?.targetType === 'timeBlock') {
    return [
      { label: '编辑', key: 'editTimeBlock' },
      { label: '详情', key: 'detailTimeBlock' },
      { label: '删除', key: 'deleteTimeBlock' },
    ];
  }

  if (contextMenu.target?.targetType === 'event') {
    return [
      { label: '编辑', key: 'editEvent' },
      { label: '详情', key: 'detailEvent' },
      { label: '删除', key: 'deleteEvent' },
    ];
  }

  return [];
});

/**
 * 更新时间块表单值。
 * 避免模板中直接给解构出来的 ref 赋值，保证输入框在 Electron 渲染进程中稳定响应。
 */
function updateTimeBlockFormValues(values: typeof timeBlockFormValues.value): void {
  timeBlockFormValues.value = values;
}

/**
 * 更新事件详情表单值。
 * 事件详情弹框和时间块弹框保持同一类显式数据回写方式。
 */
function updateEventFormValues(values: typeof eventFormValues.value): void {
  eventFormValues.value = values;
}

/**
 * 打开时间块右键菜单。
 * @param event 鼠标右键事件
 * @param timeBlock 右键命中的时间块
 */
function openTimeBlockContextMenu(event: MouseEvent, timeBlock: TimelineTimeBlock): void {
  event.preventDefault();

  if (isSaving.value || isLoading.value) {
    return;
  }

  selectTimeBlock(timeBlock.id);
  contextMenu.show = false;
  contextMenu.target = {
    targetType: 'timeBlock',
    timeBlock,
  };
  contextMenu.x = event.clientX;
  contextMenu.y = event.clientY;

  void nextTick(() => {
    contextMenu.show = true;
  });
}

/**
 * 打开事件右键菜单。
 * @param event 鼠标右键事件
 * @param timelineEvent 右键命中的事件
 */
function openEventContextMenu(event: MouseEvent, timelineEvent: TimelineEvent): void {
  event.preventDefault();

  if (isSaving.value || isLoading.value) {
    return;
  }

  if (selectedEventId.value !== timelineEvent.id) {
    selectEvent(timelineEvent.id);
  }

  contextMenu.show = false;
  contextMenu.target = {
    targetType: 'event',
    event: timelineEvent,
  };
  contextMenu.x = event.clientX;
  contextMenu.y = event.clientY;

  void nextTick(() => {
    contextMenu.show = true;
  });
}

/**
 * 执行时间线右键菜单动作。
 * @param key 菜单项 key
 */
function handleContextMenuSelect(key: string | number): void {
  const target = contextMenu.target;

  if (!target) {
    return;
  }

  const action = key as TimelineContextMenuAction;
  contextMenu.show = false;

  if (target.targetType === 'timeBlock') {
    if (action === 'editTimeBlock') {
      openEditTimeBlock(target.timeBlock);
    } else if (action === 'detailTimeBlock') {
      openTimeBlockDetail(target.timeBlock);
    } else if (action === 'deleteTimeBlock') {
      void deleteTimeBlock(target.timeBlock.id);
    }
    return;
  }

  if (action === 'editEvent') {
    openEventDetail(target.event);
    editCurrentEvent();
  } else if (action === 'detailEvent') {
    openEventDetail(target.event);
  } else if (action === 'deleteEvent') {
    void deleteEvent(target.event.id);
  }
}

/** 页面挂载后通过时间线 API 读取当前项目中的时间线数据。 */
onMounted(() => {
  void loadTimelines();
});
</script>

<template>
  <section class="timeline-page">
    <!-- 前端模拟右键菜单：时间块和事件卡片共用同一套操作入口。 -->
    <n-dropdown
      trigger="manual"
      placement="bottom-start"
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :options="contextMenuOptions"
      @select="handleContextMenuSelect"
      @clickoutside="contextMenu.show = false"
    />

    <!-- 顶部工具栏：时间线选择和当前数据状态。 -->
    <header class="timeline-toolbar">
      <div class="timeline-title-group">
        <h2 class="timeline-title">时间线</h2>
        <n-text depth="3" class="timeline-subtitle">
          {{ dataDirectory || '当前使用 mock 数据，后续可替换为 Electron timeline API' }}
        </n-text>
      </div>

      <TimelineSelector
        :timelines="timelineOptions"
        :selected-timeline-id="selectedTimelineId"
        :disabled="isSaving || isLoading"
        @select="void selectTimeline($event)"
        @create="void createTimeline()"
        @rename="void renameSelectedTimeline($event)"
        @delete="void deleteSelectedTimeline()"
      />
    </header>

    <!-- 页面消息区：保留 mock/未来 JSON 读取错误，不吞掉坏文件信息。 -->
    <div v-if="hasErrorMessage" class="timeline-message-panel">
      <p v-if="loadError" class="timeline-error-message">{{ loadError }}</p>
      <p v-if="saveError" class="timeline-error-message">{{ saveError }}</p>
      <p v-for="fileError in fileErrors" :key="fileError" class="timeline-error-message">
        {{ fileError }}
      </p>
    </div>

    <div class="timeline-workspace">
      <TimelineAxis
        :time-blocks="orderedTimeBlocks"
        :selected-time-block-id="selectedTimeBlock?.id ?? null"
        :disabled="isSaving || isLoading || !selectedTimeline"
        :dragging-time-block-id="draggingTimeBlockId"
        :drag-over-time-block-id="dragOverTimeBlockId"
        :drop-placement="timeBlockDropPlacement"
        @create-time-block="openCreateTimeBlock"
        @select-time-block="selectTimeBlock"
        @context-menu-time-block="openTimeBlockContextMenu"
        @edit-time-block="openEditTimeBlock"
        @delete-time-block="void deleteTimeBlock($event)"
        @start-drag="startTimeBlockDrag"
        @hover-drop-target="hoverTimeBlockDropTarget"
        @drop-on="(timeBlockId, placement) => void dropTimeBlockOn(timeBlockId, placement)"
        @reset-drag="resetTimeBlockDrag"
      />

      <TimelineEventBoard
        :time-block="selectedTimeBlock"
        :events="selectedTimeBlockEvents"
        :selected-event-id="selectedEventId"
        :disabled="isSaving || isLoading"
        :dragging-event-id="draggingEventId"
        :drag-over-event-id="dragOverEventId"
        :event-drop-placement="eventDropPlacement"
        @create-event="openCreateEvent"
        @select-event="selectEvent"
        @context-menu-event="openEventContextMenu"
        @detail-event="openEventDetail"
        @delete-event="void deleteEvent($event)"
        @start-drag="startEventDrag"
        @hover-drop-target="hoverEventDropTarget"
        @clear-drop-target="clearEventDropTarget"
        @drop-on="(eventId, placement) => void dropEventOn(eventId, placement)"
        @reset-drag="resetEventDrag"
      />
    </div>

    <TimelineTimeBlockDialog
      :open="isTimeBlockDialogOpen"
      :mode="timeBlockDialogMode"
      :values="timeBlockFormValues"
      :submitting="isSaving"
      :can-submit="canSubmitTimeBlock"
      @close="closeTimeBlockDialog"
      @edit="editCurrentTimeBlock"
      @update-values="updateTimeBlockFormValues"
      @submit="void submitTimeBlockForm()"
    />

    <TimelineEventDetailDialog
      :open="isEventDetailDialogOpen"
      :mode="eventDialogMode"
      :values="eventFormValues"
      :time-blocks="orderedTimeBlocks"
      :submitting="isSaving"
      :can-submit="canSubmitEvent"
      @close="closeEventDetailDialog"
      @edit="editCurrentEvent"
      @update-values="updateEventFormValues"
      @submit="void submitEventForm()"
      @delete="editingEventId && void deleteEvent(editingEventId)"
    />
  </section>
</template>

<style scoped>
/** 时间线页面整体布局，符合桌面编辑器信息密度。 */
.timeline-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  color: #172033;
}

/** 顶部时间线工具栏。 */
.timeline-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

/** 标题组。 */
.timeline-title-group {
  display: grid;
  gap: 4px;
  min-width: 0;
}

/** 页面标题。 */
.timeline-title {
  margin: 0;
  color: #17212b;
  font-size: 22px;
  line-height: 1.25;
}

/** 当前数据来源提示。 */
.timeline-subtitle {
  max-width: 520px;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/** 状态消息区。 */
.timeline-message-panel {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  background: #ffffff;
  border: 1px solid #d9e1ea;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.5;
}

/** 错误消息。 */
.timeline-error-message {
  color: #9f3a2f;
}

/** 时间线主工作区，左轴右事件面板。 */
.timeline-workspace {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  flex: 1;
  min-height: 0;
}
</style>
