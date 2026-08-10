<script setup lang="ts">
/**
 * 人物表单弹框。
 * 使用 Naive UI 的 NForm、NFormItem、NInput 组件构建表单，
 * 复用于新建和编辑场景，处理基础字段和自定义 key/value 属性。
 */
import { reactive, watch } from 'vue';
import AppModal from '@/components/common/AppModal.vue';
import type { CharacterFile } from '@/types';
import {
  createCharacterFormValues,
  createCustomFieldRow,
  type CharacterFormValues,
} from '@/views/character/useCharacterList';

const props = defineProps<{
  /** 控制弹框显示/隐藏。 */
  open: boolean;
  /** 表单模式：新建或编辑。 */
  mode: 'create' | 'edit';
  /** 表单是否正在保存，用于禁用重复提交。 */
  submitting?: boolean;
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
  formValues.customFields = nextValues.customFields;
}

/** 增加一行空的自定义属性输入。 */
function addCustomField(): void {
  formValues.customFields.push(createCustomFieldRow());
}

/**
 * 删除指定位置的自定义属性输入行。
 * @param index 待删除的行索引
 */
function removeCustomField(index: number): void {
  formValues.customFields.splice(index, 1);
}

/**
 * 提交表单数据。
 * 触发 submit 事件，将当前表单值的副本传递给父组件处理。
 */
function submitForm(): void {
  emit('submit', {
    ...formValues,
    customFields: formValues.customFields.map((row) => ({ ...row })),
  });
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

      <n-divider />

      <!-- 自定义属性编辑区：以 key = value 的动态行保存作者开放设定。 -->
      <div class="custom-fields-header">
        <n-text strong>
          自定义属性
        </n-text>
        <n-button type="primary" text @click="addCustomField">
          + 添加属性
        </n-button>
      </div>

      <div class="custom-field-list">
        <div
          v-for="(field, index) in formValues.customFields"
          :key="field.id"
          class="custom-field-row"
        >
          <n-input
            v-model:value="field.key"
            placeholder="key"
            clearable
          />
          <span class="custom-field-equals">=</span>
          <n-input
            v-model:value="field.value"
            placeholder="Value"
            clearable
          />
          <n-button
            class="custom-field-remove"
            quaternary
            circle
            type="error"
            aria-label="删除自定义属性"
            @click="removeCustomField(index)"
          >
            ×
          </n-button>
        </div>
      </div>
    </n-form>

    <!-- 底部操作按钮 -->
    <template #footer>
      <div style="display: flex; justify-content: flex-end; gap: 10px">
        <n-button @click="emit('close')">
          取消
        </n-button>
        <n-button type="primary" :loading="props.submitting" @click="submitForm">
          保存
        </n-button>
      </div>
    </template>
  </AppModal>
</template>

<style scoped>
/**
 * 自定义属性标题栏。
 * 左侧标识编辑区域，右侧提供动态新增入口。
 */
.custom-fields-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

/**
 * 自定义属性行列表。
 * 使用固定网格列保证 key、等号、value、删除按钮在增删时不跳动。
 */
.custom-field-list {
  display: grid;
  gap: 12px;
}

/**
 * 单条自定义属性输入行。
 * 移动端自动压缩输入框宽度，避免按钮和文本互相遮挡。
 */
.custom-field-row {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) 18px minmax(120px, 1fr) 34px;
  gap: 10px;
  align-items: center;
}

/** 自定义属性 key/value 之间的等号。 */
.custom-field-equals {
  color: #8a929b;
  font-size: 18px;
  font-weight: 600;
  text-align: center;
}

/** 自定义属性删除按钮，固定尺寸避免行高变化。 */
.custom-field-remove {
  width: 32px;
  height: 32px;
  font-size: 22px;
}

@media (max-width: 640px) {
  .custom-field-row {
    grid-template-columns: minmax(0, 1fr) 18px minmax(0, 1fr) 34px;
    gap: 8px;
  }
}
</style>
