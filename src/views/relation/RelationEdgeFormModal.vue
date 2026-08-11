<script setup lang="ts">
/**
 * 关系当前状态表单弹窗。
 * 用于添加和编辑关系，重复关系提示由父级状态计算后传入。
 */
import AppModal from '@/components/common/AppModal.vue';
import type { RelationGraphFile, RelationGraphNode } from '@/types';
import type { EdgeFormMode, EdgeFormValues } from '@/views/relation/useRelationGraphEditor';

const props = defineProps<{
  /** 控制弹窗显示。 */
  open: boolean;
  /** 表单模式。 */
  mode: EdgeFormMode;
  /** 当前图谱对象。 */
  currentGraph: RelationGraphFile | null;
  /** 可选终点块列表。 */
  edgeTargetNodes: RelationGraphNode[];
  /** 表单数据对象。 */
  form: EdgeFormValues;
  /** 重复关系提示。 */
  duplicateMessage: string;
  /** 是否正在保存。 */
  submitting: boolean;
  /** 基础字段是否允许提交。 */
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
    :title="props.mode === 'create' ? '添加关系' : '编辑关系'"
    :width="680"
    @close="emit('close')"
  >
    <n-form label-placement="top">
      <div class="modal-two-column">
        <n-form-item label="起点块" required>
          <select v-model="props.form.from" class="form-select">
            <option v-for="node in props.currentGraph?.nodes ?? []" :key="node.id" :value="node.id">
              {{ node.label }}
            </option>
          </select>
        </n-form-item>

        <n-form-item label="终点块" required>
          <select v-model="props.form.to" class="form-select">
            <option v-for="node in props.edgeTargetNodes" :key="node.id" :value="node.id">
              {{ node.label }}
            </option>
          </select>
        </n-form-item>
      </div>

      <p v-if="props.duplicateMessage" class="form-warning">
        {{ props.duplicateMessage }}
      </p>

      <div class="modal-two-column">
        <n-form-item label="关系名称" required>
          <n-input v-model:value="props.form.type" placeholder="例如：敌对、旧识、持有者" clearable />
        </n-form-item>

        <n-form-item label="关系强度">
          <n-input-number v-model:value="props.form.score" placeholder="可选数字" clearable />
        </n-form-item>
      </div>

      <n-form-item label="当前原因">
        <n-input
          v-model:value="props.form.reason"
          type="textarea"
          placeholder="说明为什么当前关系成立"
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

/** 弹窗中的原生下拉框，视觉上贴近 Naive UI 输入框。 */
.form-select {
  width: 100%;
  height: 34px;
  padding: 0 10px;
  color: #24313d;
  background: #ffffff;
  border: 1px solid #d9e1ea;
  border-radius: 6px;
  outline: none;
}

.form-select:focus {
  border-color: #2f80ed;
  box-shadow: 0 0 0 2px rgba(47, 128, 237, 0.12);
}

/** 表单内阻止保存的业务规则提示。 */
.form-warning {
  margin-bottom: 14px;
  padding: 9px 11px;
  color: #9a5a00;
  background: #fff8e7;
  border: 1px solid #ead29a;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.55;
}
</style>
