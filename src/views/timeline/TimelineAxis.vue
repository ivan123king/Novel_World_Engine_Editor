<script setup lang="ts">
/**
 * 时间轴组件。
 * 负责左侧时间块列表、新建上方/下方时间和时间块拖拽入口。
 */
import TimelineTimeBlock from '@/views/timeline/TimelineTimeBlock.vue';
import type { TimelineTimeBlock as TimelineTimeBlockType } from '@/types';

defineProps<{
  /** 当前时间块列表。 */
  timeBlocks: TimelineTimeBlockType[];
  /** 当前选中时间块 ID。 */
  selectedTimeBlockId: string | null;
  /** 保存或加载时禁用操作。 */
  disabled: boolean;
  /** 正在拖动的时间块 ID。 */
  draggingTimeBlockId: string | null;
  /** 拖拽悬停的时间块 ID。 */
  dragOverTimeBlockId: string | null;
  /** 时间块插入位置。 */
  dropPlacement: 'before' | 'after';
}>();

const emit = defineEmits<{
  /** 新建时间块。 */
  createTimeBlock: [placement: 'before' | 'after'];
  /** 选择时间块。 */
  selectTimeBlock: [timeBlockId: string];
  /** 编辑时间块。 */
  editTimeBlock: [timeBlock: TimelineTimeBlockType];
  /** 删除时间块。 */
  deleteTimeBlock: [timeBlockId: string];
  /** 开始拖拽时间块。 */
  startDrag: [timeBlockId: string];
  /** 悬停时间块拖拽目标。 */
  hoverDropTarget: [timeBlockId: string, placement: 'before' | 'after'];
  /** 完成时间块拖放。 */
  dropOn: [timeBlockId: string, placement: 'before' | 'after'];
  /** 结束拖拽。 */
  resetDrag: [];
}>();
</script>

<template>
  <aside class="timeline-axis" aria-label="时间块列表">
    <!-- 时间块操作区，只保留草图要求的上方/下方新建入口。 -->
    <div class="axis-actions">
      <n-button size="small" block :disabled="disabled" @click="emit('createTimeBlock', 'before')">
        新建上方时间
      </n-button>
      <n-button size="small" block :disabled="disabled" @click="emit('createTimeBlock', 'after')">
        新建下方时间
      </n-button>
    </div>

    <div class="axis-list">
      <TimelineTimeBlock
        v-for="timeBlock in timeBlocks"
        :key="timeBlock.id"
        :time-block="timeBlock"
        :active="selectedTimeBlockId === timeBlock.id"
        :dragging="draggingTimeBlockId === timeBlock.id"
        :drop-target="dragOverTimeBlockId === timeBlock.id"
        :drop-placement="dropPlacement"
        :disabled="disabled"
        @select="emit('selectTimeBlock', $event)"
        @edit="emit('editTimeBlock', $event)"
        @delete="emit('deleteTimeBlock', $event)"
        @dragstart="emit('startDrag', $event)"
        @draghover="(timeBlockId, placement) => emit('hoverDropTarget', timeBlockId, placement)"
        @drop="(timeBlockId, placement) => emit('dropOn', timeBlockId, placement)"
        @dragend="emit('resetDrag')"
      />

      <n-empty v-if="timeBlocks.length === 0" description="暂无时间块，点击上方新建" />
    </div>
  </aside>
</template>

<style scoped>
/** 左侧时间轴面板。 */
.timeline-axis {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  min-height: 0;
  padding: 14px;
  background: #ffffff;
  border: 1px solid #d9e1ea;
  border-radius: 8px;
}

/** 时间块新建按钮区。 */
.axis-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

/** 时间块列表滚动容器。 */
.axis-list {
  display: grid;
  align-content: start;
  gap: 10px;
  min-height: 0;
  overflow: auto;
}
</style>
