<script setup lang="ts">
/**
 * 时间线选择器组件。
 * 负责多时间线下拉切换和当前时间线的轻量管理入口。
 */
import { computed, ref, watch } from 'vue';
import type { TimelineIndexEntry } from '@/types';

const props = defineProps<{
  /** 时间线下拉选项。 */
  timelines: TimelineIndexEntry[];
  /** 当前选中的时间线 ID。 */
  selectedTimelineId: string | null;
  /** 当前是否处于保存或加载状态。 */
  disabled: boolean;
}>();

const emit = defineEmits<{
  /** 切换时间线。 */
  select: [timelineId: string];
  /** 新建时间线。 */
  create: [];
  /** 重命名当前时间线。 */
  rename: [name: string];
  /** 删除当前时间线。 */
  delete: [];
}>();

/** 当前是否正在内联重命名。 */
const isRenaming = ref(false);

/** 内联重命名输入值。 */
const renameValue = ref('');

/** 当前选中的时间线条目。 */
const selectedTimeline = computed(
  () => props.timelines.find((timeline) => timeline.id === props.selectedTimelineId) ?? null,
);

/** 切换时间线后退出重命名状态，避免误改另一条时间线。 */
watch(
  () => props.selectedTimelineId,
  () => {
    isRenaming.value = false;
    renameValue.value = selectedTimeline.value?.name ?? '';
  },
);

/**
 * 处理时间线下拉变化。
 * @param value Naive UI select 返回值
 */
function handleSelect(value: string | null): void {
  if (value) {
    emit('select', value);
  }
}

/** 开始内联重命名当前时间线。 */
function startRename(): void {
  if (!selectedTimeline.value) {
    return;
  }

  renameValue.value = selectedTimeline.value.name;
  isRenaming.value = true;
}

/** 取消当前内联重命名。 */
function cancelRename(): void {
  isRenaming.value = false;
  renameValue.value = selectedTimeline.value?.name ?? '';
}

/** 提交当前内联重命名。 */
function submitRename(): void {
  const nextName = renameValue.value.trim();

  if (nextName) {
    emit('rename', nextName);
  }

  isRenaming.value = false;
}
</script>

<template>
  <div class="timeline-selector">
    <n-select
      :value="selectedTimelineId"
      :options="timelines.map((timeline) => ({ label: timeline.name, value: timeline.id }))"
      placeholder="选择时间线"
      :disabled="disabled || timelines.length === 0"
      @update:value="handleSelect"
    />

    <div v-if="isRenaming" class="timeline-rename-row">
      <n-input
        v-model:value="renameValue"
        size="small"
        placeholder="时间线名称"
        clearable
        :disabled="disabled"
        @keydown.enter.prevent="submitRename"
        @keydown.esc.prevent="cancelRename"
      />
      <n-button size="small" type="primary" :disabled="disabled || !renameValue.trim()" @click="submitRename">
        保存
      </n-button>
      <n-button size="small" :disabled="disabled" @click="cancelRename">
        取消
      </n-button>
    </div>

    <n-space v-else size="small" :wrap="false">
      <n-button size="small" type="primary" :disabled="disabled" @click="emit('create')">
        新建时间线
      </n-button>
      <n-button size="small" :disabled="disabled || !selectedTimelineId" @click="startRename">
        重命名
      </n-button>
      <n-button size="small" type="error" :disabled="disabled || !selectedTimelineId" @click="emit('delete')">
        删除
      </n-button>
    </n-space>
  </div>
</template>

<style scoped>
/** 时间线选择器横向工具条。 */
.timeline-selector {
  display: grid;
  grid-template-columns: minmax(180px, 320px) auto;
  gap: 10px;
  align-items: center;
}

/** 时间线内联重命名行。 */
.timeline-rename-row {
  display: grid;
  grid-template-columns: minmax(160px, 260px) auto auto;
  gap: 8px;
  align-items: center;
}
</style>
