<script setup lang="ts">
/**
 * 关系图谱新建和重命名弹窗。
 * 只处理图谱名称、说明的表单展示，保存逻辑由父级 composable 执行。
 */
import AppModal from '@/components/common/AppModal.vue';
import type { GraphFormMode, GraphFormValues } from '@/views/relation/useRelationGraphEditor';

const props = defineProps<{
  /** 控制弹窗显示。 */
  open: boolean;
  /** 表单模式。 */
  mode: GraphFormMode;
  /** 表单数据对象。 */
  form: GraphFormValues;
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
    :title="props.mode === 'create' ? '新建图谱' : '重命名图谱'"
    :width="560"
    @close="emit('close')"
  >
    <n-form label-placement="top">
      <n-form-item label="图谱名称" required>
        <n-input v-model:value="props.form.name" placeholder="例如：青城山关系" clearable />
      </n-form-item>
      <n-form-item label="图谱说明">
        <n-input
          v-model:value="props.form.description"
          type="textarea"
          placeholder="描述这张图谱维护的关系范围"
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
</style>
