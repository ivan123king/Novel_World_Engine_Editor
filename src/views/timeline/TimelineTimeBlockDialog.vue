<script setup lang="ts">
/**
 * 时间块详情和编辑弹框。
 * 只展示或编辑时间名和别名列表，不包含备注或说明字段。
 */
import AppModal from '@/components/common/AppModal.vue';
import { computed } from 'vue';
import type {
  TimelineTimeBlockDialogMode,
  TimelineTimeBlockFormValues,
} from '@/views/timeline/useTimelineWorkbench';

const props = defineProps<{
  /** 是否显示弹框。 */
  open: boolean;
  /** 弹框模式。 */
  mode: TimelineTimeBlockDialogMode;
  /** 表单值，由页面 composable 统一维护。 */
  values: TimelineTimeBlockFormValues;
  /** 是否正在保存。 */
  submitting: boolean;
  /** 是否允许提交。 */
  canSubmit: boolean;
}>();

const emit = defineEmits<{
  /** 关闭弹框。 */
  close: [];
  /** 从查看模式进入编辑模式。 */
  edit: [];
  /** 提交表单。 */
  submit: [];
  /** 更新表单值。 */
  updateValues: [values: TimelineTimeBlockFormValues];
}>();

/** 当前是否是只读查看模式。 */
const isReadonly = computed(() => props.mode === 'view');

/** 弹框标题。 */
const dialogTitle = computed(() => {
  if (props.mode === 'create') {
    return '新建时间';
  }

  return props.mode === 'view' ? '时间详情' : '编辑时间';
});

/** 更新局部表单字段。 */
function patchValues(patch: Partial<TimelineTimeBlockFormValues>): void {
  emit('updateValues', {
    ...props.values,
    ...patch,
  });
}

/** 更新指定别名。 */
function updateAlias(index: number, value: string): void {
  const aliases = [...props.values.aliases];
  aliases[index] = value;
  patchValues({ aliases });
}

/** 新增空别名。 */
function addAlias(): void {
  patchValues({ aliases: [...props.values.aliases, ''] });
}

/** 删除指定别名。 */
function removeAlias(index: number): void {
  patchValues({ aliases: props.values.aliases.filter((_, aliasIndex) => aliasIndex !== index) });
}
</script>

<template>
  <AppModal
    :open="open"
    :title="dialogTitle"
    :width="560"
    @close="emit('close')"
  >
    <!-- 查看模式只展示当前时间块内容，避免“详情”入口打开后误以为可直接保存。 -->
    <div v-if="isReadonly" class="time-block-readonly">
      <n-descriptions :column="1" bordered label-placement="left">
        <n-descriptions-item label="时间名" label-style="width: 88px">
          {{ values.name || '未命名时间' }}
        </n-descriptions-item>
        <n-descriptions-item label="别名" label-style="width: 88px">
          <div v-if="values.aliases.length > 0" class="alias-readonly-list">
            <n-tag v-for="alias in values.aliases" :key="alias" size="small">
              {{ alias }}
            </n-tag>
          </div>
          <span v-else>无别名</span>
        </n-descriptions-item>
      </n-descriptions>
    </div>

    <n-form v-else label-placement="top">
      <n-form-item label="时间名" required>
        <n-input
          :value="values.name"
          placeholder="例如：公元202年"
          clearable
          @update:value="patchValues({ name: $event })"
        />
      </n-form-item>

      <n-divider />

      <div class="alias-header">
        <n-text strong>别名列表</n-text>
        <n-button type="primary" text @click="addAlias">+ 添加别名</n-button>
      </div>

      <div class="alias-list">
        <div v-for="(alias, index) in values.aliases" :key="index" class="alias-row">
          <n-input
            :value="alias"
            placeholder="例如：大周历46年"
            clearable
            @update:value="updateAlias(index, $event)"
          />
          <n-button quaternary circle type="error" aria-label="删除别名" @click="removeAlias(index)">
            ×
          </n-button>
        </div>

        <n-empty v-if="values.aliases.length === 0" description="暂无别名" />
      </div>
    </n-form>

    <template #footer>
      <div class="modal-footer">
        <n-button @click="emit('close')">{{ isReadonly ? '关闭' : '取消' }}</n-button>
        <n-button v-if="isReadonly" type="primary" @click="emit('edit')">编辑</n-button>
        <n-button v-else type="primary" :loading="submitting" :disabled="!canSubmit" @click="emit('submit')">
          保存
        </n-button>
      </div>
    </template>
  </AppModal>
</template>

<style scoped>
/** 时间块只读详情布局。 */
.time-block-readonly {
  display: grid;
  gap: 12px;
}

/** 只读别名标签列表。 */
.alias-readonly-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/** 别名标题栏。 */
.alias-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

/** 别名编辑列表。 */
.alias-list {
  display: grid;
  gap: 10px;
}

/** 单条别名编辑行。 */
.alias-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 34px;
  gap: 8px;
  align-items: center;
}

/** 弹框底部按钮。 */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
