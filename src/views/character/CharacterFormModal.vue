<script setup lang="ts">
/**
 * 人物表单弹框。
 * 使用 Naive UI 的 NForm、NFormItem、NInput 组件构建表单，
 * 复用于新建和编辑场景，第一版处理基础字段。
 */
import { reactive, watch } from 'vue';
import AppModal from '@/components/common/AppModal.vue';
import type { CharacterFile } from '@/types';
import { createCharacterFormValues, type CharacterFormValues } from './useCharacterList';

const props = defineProps<{
  /** 控制弹框显示/隐藏。 */
  open: boolean;
  /** 表单模式：新建或编辑。 */
  mode: 'create' | 'edit';
  /** 编辑模式下的人物数据，新建模式下为 undefined。 */
  character?: CharacterFile | null;
}>();

const emit = defineEmits<{
  /** 关闭弹框事件。 */
  close: [];
  /** 提交表单数据事件。 */
  submit: [values: CharacterFormValues];
}>();

/** 表单响应式数据对象。 */
const formValues = reactive<CharacterFormValues>(createCharacterFormValues());

/**
 * 根据当前模式和人物数据重置表单到初始状态。
 * - 新建模式：使用空表单
 * - 编辑模式：使用传入的人物数据填充表单
 */
function resetForm(): void {
  const nextValues = createCharacterFormValues(props.mode === 'edit' ? props.character ?? undefined : undefined);
  formValues.name = nextValues.name;
  formValues.age = nextValues.age;
  formValues.traits = nextValues.traits;
  formValues.appearance = nextValues.appearance;
}

/**
 * 提交表单数据。
 * 触发 submit 事件，将当前表单值的副本传递给父组件处理。
 */
function submitForm(): void {
  emit('submit', { ...formValues });
}

/**
 * 监听弹框打开状态、人物数据和模式变化。
 * 当弹框打开时自动重置表单内容，确保数据一致性。
 */
watch(
  () => [props.open, props.character, props.mode] as const,
  () => {
    if (props.open) {
      resetForm();
    }
  },
  { immediate: true },
);
</script>

<template>
  <AppModal
    :open="open"
    :title="mode === 'create' ? '新建人物' : '编辑人物'"
    :width="560"
    @close="emit('close')"
  >
    <!-- 人物信息表单 -->
    <n-form label-placement="top" label-align="text">
      <n-form-item label="姓名" required>
        <n-input
          v-model:value="formValues.name"
          placeholder="请输入人物姓名（如：张三）"
          clearable
        />
      </n-form-item>

      <n-form-item label="年龄">
        <n-input
          v-model:value="formValues.age"
          placeholder="请输入年龄，留空表示未知"
          clearable
        />
      </n-form-item>

      <n-form-item label="性格标签">
        <n-input
          v-model:value="formValues.traits"
          placeholder="用中文逗号分隔，例如：谨慎，重情，冷静"
          clearable
        />
      </n-form-item>

      <n-form-item label="外貌描述">
        <n-input
          v-model:value="formValues.appearance"
          type="textarea"
          :autosize="{ minRows: 4, maxRows: 8 }"
          placeholder="请输入人物的外貌特征描述"
          clearable
        />
      </n-form-item>
    </n-form>

    <!-- 底部操作按钮 -->
    <template #footer>
      <div style="display: flex; justify-content: flex-end; gap: 10px">
        <n-button @click="emit('close')">
          取消
        </n-button>
        <n-button type="primary" @click="submitForm">
          保存
        </n-button>
      </div>
    </template>
  </AppModal>
</template>
