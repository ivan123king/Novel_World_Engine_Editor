<script setup lang="ts">
/**
 * 系统配置 JSON 编辑弹框组件。
 * 监听 Electron 菜单事件，按需读取和保存 data/system/app-settings.json。
 */
import { onMounted, onUnmounted, ref } from 'vue';
import {
  loadSystemConfigText,
  onOpenSystemConfigEditor,
  saveSystemConfigText,
} from '@/api/systemConfigApi';

const isVisible = ref(false);
const isLoading = ref(false);
const isSaving = ref(false);
const configDraft = ref('');
const configError = ref('');

let removeOpenListener: (() => void) | null = null;

/** 打开系统配置弹框，并加载当前 app-settings.json 文本。 */
async function openModal(): Promise<void> {
  isVisible.value = true;
  isLoading.value = true;
  configError.value = '';

  try {
    configDraft.value = await loadSystemConfigText();
  } catch (error) {
    configDraft.value = '';
    configError.value =
      error instanceof Error ? error.message : '系统配置读取失败，将使用默认配置。';
  } finally {
    isLoading.value = false;
  }
}

/** 关闭系统配置弹框，保存过程中不允许关闭以免中断状态反馈。 */
function closeModal(): void {
  if (isSaving.value) {
    return;
  }

  isVisible.value = false;
  configError.value = '';
}

/** 保存用户编辑后的系统配置 JSON，并由主进程刷新当前项目状态。 */
async function handleSave(): Promise<void> {
  configError.value = '';

  try {
    JSON.parse(configDraft.value);
  } catch {
    configError.value = '系统配置不是有效的 JSON，请检查格式。';
    return;
  }

  isSaving.value = true;

  try {
    configDraft.value = await saveSystemConfigText(configDraft.value);
    isVisible.value = false;
  } catch (error) {
    configError.value =
      error instanceof Error ? error.message : '系统配置保存失败，请检查当前应用目录权限。';
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => {
  try {
    removeOpenListener = onOpenSystemConfigEditor(() => {
      void openModal();
    });
  } catch {
    // preload 未就绪时不注册系统配置菜单事件，保持普通浏览器环境可加载。
  }
});

onUnmounted(() => {
  removeOpenListener?.();
  removeOpenListener = null;
});
</script>

<template>
  <n-modal
    v-model:show="isVisible"
    preset="card"
    title="系统配置"
    style="width: min(760px, calc(100vw - 48px))"
    :mask-closable="!isSaving"
    @close="closeModal"
  >
    <div class="system-config-editor">
      <n-input
        v-model:value="configDraft"
        type="textarea"
        :disabled="isLoading || isSaving"
        :autosize="{ minRows: 16, maxRows: 24 }"
        placeholder="{}"
      />

      <n-text v-if="configError" type="error" class="system-config-editor__error">
        {{ configError }}
      </n-text>

      <div class="system-config-editor__actions">
        <n-button :disabled="isSaving" @click="closeModal">
          取消
        </n-button>
        <n-button
          type="primary"
          :loading="isSaving"
          :disabled="isLoading"
          @click="handleSave"
        >
          保存
        </n-button>
      </div>
    </div>
  </n-modal>
</template>

<style scoped>
/** 系统配置编辑弹框使用等宽输入，便于直接检查 JSON 结构。 */
.system-config-editor {
  display: grid;
  gap: 12px;
}

/** 错误信息保持独立一行，避免挤压操作按钮。 */
.system-config-editor__error {
  display: block;
}

/** 弹框操作区固定在底部右侧。 */
.system-config-editor__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.system-config-editor :deep(textarea) {
  font-family: Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.55;
}
</style>
