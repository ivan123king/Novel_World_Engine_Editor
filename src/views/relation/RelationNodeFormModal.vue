<script setup lang="ts">
/**
 * 自定义关系图谱块表单弹窗。
 * 用于新建和重命名自定义图谱块。
 */
import AppModal from '@/components/common/AppModal.vue';
import type { NodeFormMode, NodeFormValues } from '@/views/relation/useRelationGraphEditor';

const props = defineProps<{
  /** 控制弹窗显示。 */
  open: boolean;
  /** 表单模式。 */
  mode: NodeFormMode;
  /** 表单数据对象。 */
  form: NodeFormValues;
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
    :title="props.mode === 'create' ? '新建块' : '重命名块'"
    :width="480"
    @close="emit('close')"
  >
    <n-form label-placement="top">
      <n-form-item label="块名称" required>
        <n-input v-model:value="props.form.label" placeholder="例如：华山派" clearable />
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
</style>
