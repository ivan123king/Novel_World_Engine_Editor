<script setup lang="ts">
/**
 * 人物表单弹框。
 * 复用于新建和编辑，第一版只处理基础字段。
 */
import { reactive, watch } from 'vue';
import AppModal from '@/components/common/AppModal.vue';
import type { CharacterFile } from '@/types';
import { createCharacterFormValues, type CharacterFormValues } from './useCharacterList';

const props = defineProps<{
  open: boolean;
  mode: 'create' | 'edit';
  character?: CharacterFile | null;
}>();

const emit = defineEmits<{
  close: [];
  submit: [values: CharacterFormValues];
}>();

const formValues = reactive<CharacterFormValues>(createCharacterFormValues());

/** 根据当前模式和人物数据重置表单。 */
function resetForm(): void {
  const nextValues = createCharacterFormValues(props.mode === 'edit' ? props.character ?? undefined : undefined);
  formValues.name = nextValues.name;
  formValues.age = nextValues.age;
  formValues.traits = nextValues.traits;
  formValues.appearance = nextValues.appearance;
}

/** 提交表单数据。 */
function submitForm(): void {
  emit('submit', { ...formValues });
}

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
    width="560px"
    @close="emit('close')"
  >
    <form class="character-form" @submit.prevent="submitForm">
      <label>
        <span>姓名</span>
        <input v-model="formValues.name" type="text" placeholder="未命名人物" />
      </label>

      <label>
        <span>年龄</span>
        <input v-model="formValues.age" type="text" placeholder="未知" />
      </label>

      <label>
        <span>性格</span>
        <input v-model="formValues.traits" type="text" placeholder="谨慎，重情" />
      </label>

      <label>
        <span>外貌</span>
        <textarea v-model="formValues.appearance" rows="4" placeholder="外貌描述" />
      </label>
    </form>

    <template #footer>
      <button class="secondary-button" type="button" @click="emit('close')">取消</button>
      <button class="primary-button" type="button" @click="submitForm">保存</button>
    </template>
  </AppModal>
</template>

<style scoped>
.character-form {
  display: grid;
  gap: 14px;
}

label {
  display: grid;
  gap: 7px;
  color: #27313c;
  font-size: 14px;
}

input,
textarea {
  width: 100%;
  border: 1px solid #bfccd8;
  border-radius: 6px;
  background: #ffffff;
  color: #17212b;
  font: inherit;
  padding: 9px 10px;
}

textarea {
  resize: vertical;
}

input:focus,
textarea:focus {
  border-color: #6f9cc8;
  outline: none;
  box-shadow: 0 0 0 3px rgba(111, 156, 200, 0.18);
}

.primary-button,
.secondary-button {
  border: 1px solid #aab8c6;
  border-radius: 6px;
  cursor: pointer;
  padding: 8px 14px;
}

.primary-button {
  background: #273646;
  color: #ffffff;
}

.primary-button:hover {
  background: #17212b;
}

.secondary-button {
  background: #ffffff;
  color: #27313c;
}

.secondary-button:hover {
  background: #f2f5f8;
}
</style>
