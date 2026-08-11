<script setup lang="ts">
/**
 * 关系变化记录表单弹窗。
 * 用于新增和编辑关系历史变化。
 */
import AppModal from '@/components/common/AppModal.vue';
import type { HistoryFormMode, HistoryFormValues } from '@/views/relation/useRelationGraphEditor';

const props = defineProps<{
  /** 控制弹窗显示。 */
  open: boolean;
  /** 表单模式。 */
  mode: HistoryFormMode;
  /** 表单数据对象。 */
  form: HistoryFormValues;
  /** 是否正在保存。 */
  submitting: boolean;
  /** 是否允许提交。 */
  canSubmit: boolean;
}>();

const emit = defineEmits<{
  /** 关闭弹窗。 */
  close: [];
  /** 提交表单。 */
  submit: [];
}>();
</script>

<template>
  <AppModal
    :open="props.open"
    :title="props.mode === 'create' ? '新增变化记录' : '编辑变化记录'"
    :width="620"
    @close="emit('close')"
  >
    <n-form label-placement="top">
      <div class="modal-two-column">
        <n-form-item label="时间标记" required>
          <n-input v-model:value="props.form.label" placeholder="例如：第20章、当前" clearable />
        </n-form-item>

        <n-form-item label="当时关系强度">
          <n-input-number v-model:value="props.form.score" placeholder="可选数字" clearable />
        </n-form-item>
      </div>

      <n-form-item label="当时关系名称" required>
        <n-input v-model:value="props.form.type" placeholder="例如：临时合作" clearable />
      </n-form-item>

      <n-form-item label="变化原因">
        <n-input
          v-model:value="props.form.reason"
          type="textarea"
          placeholder="说明这次关系变化的原因"
          clearable
        />
      </n-form-item>
    </n-form>

    <template #footer>
      <div class="modal-footer">
        <n-button @click="emit('close')">
          取消
        </n-button>
        <n-button
          type="primary"
          :loading="props.submitting"
          :disabled="!props.canSubmit"
          @click="emit('submit')"
        >
          保存
        </n-button>
      </div>
    </template>
  </AppModal>
</template>

<style scoped>
/** 弹窗底部按钮栏。 */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/** 弹窗双列表单布局。 */
.modal-two-column {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}
</style>
