<script setup lang="ts">
/**
 * 时间线事件详情弹框。
 * 事件卡片只显示标题和时间，完整内容和自定义字段在这里查看和编辑。
 */
import AppModal from '@/components/common/AppModal.vue';
import { computed } from 'vue';
import type { TimelineTimeBlock } from '@/types';
import type {
  TimelineEventDialogMode,
  TimelineEventFormValues,
  TimelineCustomFieldRow,
} from '@/views/timeline/useTimelineWorkbench';

const props = defineProps<{
  /** 是否显示弹框。 */
  open: boolean;
  /** 弹框模式。 */
  mode: TimelineEventDialogMode;
  /** 事件详情表单。 */
  values: TimelineEventFormValues;
  /** 可选择的时间块列表。 */
  timeBlocks: TimelineTimeBlock[];
  /** 是否正在保存。 */
  submitting: boolean;
  /** 是否允许提交。 */
  canSubmit: boolean;
}>();

const emit = defineEmits<{
  /** 关闭弹框。 */
  close: [];
  /** 进入编辑模式。 */
  edit: [];
  /** 提交表单。 */
  submit: [];
  /** 更新表单值。 */
  updateValues: [values: TimelineEventFormValues];
  /** 删除当前事件。 */
  delete: [];
}>();

/** 当前是否是只读查看模式。 */
const isReadonly = computed(() => props.mode === 'view');

/** 当前时间块名称。 */
const currentTimeName = computed(
  () => props.timeBlocks.find((timeBlock) => timeBlock.id === props.values.timeBlockId)?.name ?? '未选择时间',
);

/** 更新局部表单字段。 */
function patchValues(patch: Partial<TimelineEventFormValues>): void {
  emit('updateValues', {
    ...props.values,
    ...patch,
  });
}

/** 新增自定义字段。 */
function addCustomField(): void {
  patchValues({
    customFields: [
      ...props.values.customFields,
      {
        id: `timeline_custom_field_local_${Date.now()}_${props.values.customFields.length}`,
        key: '',
        value: '',
      },
    ],
  });
}

/** 更新自定义字段。 */
function updateCustomField(index: number, patch: Partial<TimelineCustomFieldRow>): void {
  patchValues({
    customFields: props.values.customFields.map((field, fieldIndex) =>
      fieldIndex === index ? { ...field, ...patch } : field,
    ),
  });
}

/** 删除自定义字段。 */
function removeCustomField(index: number): void {
  patchValues({
    customFields: props.values.customFields.filter((_, fieldIndex) => fieldIndex !== index),
  });
}
</script>

<template>
  <AppModal
    :open="open"
    :title="mode === 'create' ? '新建事件' : '事件详情'"
    :width="760"
    @close="emit('close')"
  >
    <div v-if="isReadonly" class="event-detail-readonly">
      <n-descriptions :column="1" bordered label-placement="left">
        <n-descriptions-item label="时间" label-style="width: 88px">
          {{ currentTimeName }}
        </n-descriptions-item>
        <n-descriptions-item label="具体时间" label-style="width: 88px">
          {{ values.specificTime || '未填写' }}
        </n-descriptions-item>
        <n-descriptions-item label="事件标题" label-style="width: 88px">
          {{ values.title || '未命名事件' }}
        </n-descriptions-item>
        <n-descriptions-item label="事件内容" label-style="width: 88px">
          <p class="event-content">{{ values.content || '未填写' }}</p>
        </n-descriptions-item>
      </n-descriptions>

      <div class="custom-fields-readonly">
        <div class="section-heading">
          <n-text strong>自定义字段</n-text>
          <n-text depth="3">{{ values.customFields.filter((field) => field.key.trim()).length }} 项</n-text>
        </div>

        <div v-if="values.customFields.some((field) => field.key.trim())" class="custom-field-table">
          <div
            v-for="field in values.customFields.filter((item) => item.key.trim())"
            :key="field.id"
            class="custom-field-item"
          >
            <div class="custom-field-key">{{ field.key }}</div>
            <pre class="custom-field-value">{{ field.value || '未填写' }}</pre>
          </div>
        </div>

        <n-empty v-else description="未填写自定义字段" />
      </div>
    </div>

    <n-form v-else label-placement="top">
      <n-form-item label="时间点" required>
        <n-input :value="currentTimeName" disabled />
      </n-form-item>

      <n-form-item label="具体时间">
        <n-input
          :value="values.specificTime"
          placeholder="例如：3月、初七、午后"
          clearable
          @update:value="patchValues({ specificTime: $event })"
        />
      </n-form-item>

      <n-form-item label="事件标题" required>
        <n-input
          :value="values.title"
          placeholder="例如：边境军变"
          clearable
          @update:value="patchValues({ title: $event })"
        />
      </n-form-item>

      <n-form-item label="事件内容">
        <n-input
          :value="values.content"
          type="textarea"
          placeholder="填写这个时间内发生的完整事件内容"
          :autosize="{ minRows: 8, maxRows: 16 }"
          @update:value="patchValues({ content: $event })"
        />
      </n-form-item>

      <n-divider />

      <div class="custom-fields-header">
        <n-text strong>自定义 key/value</n-text>
        <n-button type="primary" text @click="addCustomField">+ 添加字段</n-button>
      </div>

      <div class="custom-field-editor">
        <div v-for="(field, index) in values.customFields" :key="field.id" class="custom-field-row">
          <n-input
            :value="field.key"
            placeholder="请填写自定义字段名"
            clearable
            @update:value="updateCustomField(index, { key: $event })"
          />
          <span class="custom-field-equals">=</span>
          <n-input
            :value="field.value"
            placeholder="请填写自定义内容"
            clearable
            @update:value="updateCustomField(index, { value: $event })"
          />
          <n-button quaternary circle type="error" aria-label="删除自定义字段" @click="removeCustomField(index)">
            ×
          </n-button>
        </div>
      </div>
    </n-form>

    <template #footer>
      <div class="modal-footer">
        <n-button @click="emit('close')">关闭</n-button>
        <n-button v-if="mode === 'view'" type="error" secondary :disabled="submitting" @click="emit('delete')">
          删除
        </n-button>
        <n-button v-if="mode === 'view'" type="primary" @click="emit('edit')">编辑</n-button>
        <n-button
          v-if="mode !== 'view'"
          type="primary"
          :loading="submitting"
          :disabled="!canSubmit"
          @click="emit('submit')"
        >
          保存
        </n-button>
      </div>
    </template>
  </AppModal>
</template>

<style scoped>
/** 只读详情布局。 */
.event-detail-readonly {
  display: grid;
  gap: 16px;
}

/** 长事件内容展示。 */
.event-content {
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

/** 自定义字段只读区域。 */
.custom-fields-readonly {
  display: grid;
  gap: 12px;
}

/** 区块标题栏。 */
.section-heading,
.custom-fields-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/** 自定义字段表格。 */
.custom-field-table {
  display: grid;
  border: 1px solid #dce4ee;
  border-radius: 6px;
  overflow: hidden;
}

/** 自定义字段展示行。 */
.custom-field-item {
  display: grid;
  grid-template-columns: minmax(120px, 220px) minmax(0, 1fr);
  border-bottom: 1px solid #e6edf5;
}

.custom-field-item:last-child {
  border-bottom: 0;
}

/** 自定义字段 key。 */
.custom-field-key {
  padding: 10px 12px;
  color: #465260;
  background: #f8fafc;
  border-right: 1px solid #e6edf5;
  font-weight: 600;
  line-height: 1.5;
  word-break: break-word;
}

/** 自定义字段 value。 */
.custom-field-value {
  min-width: 0;
  margin: 0;
  padding: 10px 12px;
  color: #24313d;
  font-family: inherit;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

/** 自定义字段编辑列表。 */
.custom-field-editor {
  display: grid;
  gap: 10px;
}

/** 单条自定义字段编辑行。 */
.custom-field-row {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) 18px minmax(160px, 1.4fr) 34px;
  gap: 8px;
  align-items: center;
}

/** key/value 分隔符。 */
.custom-field-equals {
  color: #8a929b;
  font-size: 18px;
  font-weight: 600;
  text-align: center;
}

/** 弹框底部按钮。 */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
