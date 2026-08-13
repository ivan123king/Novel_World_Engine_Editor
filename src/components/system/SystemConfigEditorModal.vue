<script setup lang="ts">
/**
 * 系统配置 JSON 编辑弹框组件。
 * 监听 Electron 菜单事件，按需读取和保存 Electron userData 目录中的 app-settings.json。
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
const configFilePath = ref('');
const pathCopyTip = ref('');

let removeOpenListener: (() => void) | null = null;

/** 打开系统配置弹框，并加载当前 app-settings.json 文本。 */
async function openModal(): Promise<void> {
  isVisible.value = true;
  isLoading.value = true;
  configError.value = '';
  pathCopyTip.value = '';

  try {
    const configFile = await loadSystemConfigText();
    configDraft.value = configFile.text;
    configFilePath.value = configFile.filePath;
  } catch (error) {
    configDraft.value = '';
    configFilePath.value = '';
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
  pathCopyTip.value = '';
}

/** 复制系统配置文件路径，方便用户用外部编辑器直接打开。 */
async function copyConfigFilePath(): Promise<void> {
  if (!configFilePath.value) {
    return;
  }

  try {
    await navigator.clipboard.writeText(configFilePath.value);
    pathCopyTip.value = '已复制';
  } catch {
    pathCopyTip.value = '复制失败';
  }
}

/** 保存用户编辑后的系统配置 JSON，并由主进程刷新当前项目状态。 */
async function handleSave(): Promise<void> {
  configError.value = '';
  pathCopyTip.value = '';

  try {
    JSON.parse(configDraft.value);
  } catch {
    configError.value = '系统配置不是有效的 JSON，请检查格式。';
    return;
  }

  isSaving.value = true;

  try {
    const configFile = await saveSystemConfigText(configDraft.value);
    configDraft.value = configFile.text;
    configFilePath.value = configFile.filePath;
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
      <div class="system-config-editor__path-row">
        <n-input
          :value="configFilePath"
          readonly
          size="small"
          placeholder="系统配置路径加载中"
        />
        <n-button size="small" :disabled="!configFilePath" @click="copyConfigFilePath">
          复制路径
        </n-button>
      </div>

      <n-text v-if="pathCopyTip" depth="3" class="system-config-editor__copy-tip">
        {{ pathCopyTip }}
      </n-text>

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

/** 配置文件路径行保持单行展示，便于用户复制完整绝对路径。 */
.system-config-editor__path-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

/** 复制结果提示使用紧凑文本，避免挤占 JSON 编辑区。 */
.system-config-editor__copy-tip {
  min-height: 18px;
  font-size: 12px;
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
