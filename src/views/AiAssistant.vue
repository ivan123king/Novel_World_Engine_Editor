<script setup lang="ts">
/**
 * AI小助手模块视图。
 * 当前阶段提供远程AI小助手服务设置、健康检查、项目注册、项目同步和预留聊天室界面。
 */
import { computed, nextTick, onMounted, ref } from 'vue';
import AppModal from '@/components/common/AppModal.vue';
import {
  loadAiAssistantSettings,
  saveRemoteAiAssistantProjectId,
  saveRemoteAiAssistantServiceBaseUrl,
} from '@/api/aiAssistantSettingsApi';
import { useProjectStore } from '@/stores/projectStore';
import type { RemoteAiAssistantHealthStatus } from '@/types';

/** 聊天消息的发送方。 */
type ChatMessageRole = 'assistant' | 'user';

/** 聊天消息结构。 */
interface ChatMessage {
  id: number;
  role: ChatMessageRole;
  content: string;
}

/** 远程AI小助手服务注册项目的响应结构。 */
interface RegisterProjectResponse {
  projectId?: string;
  id?: string;
  status?: string;
}

const projectStore = useProjectStore();
const { currentProject, currentProjectTitle, currentProjectPath, hasCurrentProject } = projectStore;

/** 远程AI小助手服务基础地址。 */
const remoteServiceBaseUrl = ref('');

/** 当前小说项目在远程AI小助手服务中的项目 ID。 */
const remoteProjectId = ref('');

/** 设置弹框内正在编辑的服务地址。 */
const settingFormBaseUrl = ref('');

/** 用户当前输入内容。 */
const inputText = ref('');

/** 设置弹框是否打开。 */
const isSettingsModalOpen = ref(false);

/** 设置读取状态。 */
const isLoadingSettings = ref(false);

/** 设置保存状态。 */
const isSavingSettings = ref(false);

/** 设置弹框内的健康检查状态。 */
const settingHealthStatus = ref<RemoteAiAssistantHealthStatus>('unknown');

/** 设置弹框内的提示信息。 */
const settingsModalMessage = ref('');

/** 设置弹框内的提示类型。 */
const settingsModalMessageType = ref<'info' | 'success' | 'warning' | 'error'>('info');

/** 远程服务健康检查状态。 */
const remoteHealthStatus = ref<RemoteAiAssistantHealthStatus>('unknown');

/** 当前远程操作是否执行中。 */
const isRemoteActionRunning = ref(false);

/** 设置或远程调用错误提示。 */
const actionMessage = ref('');

/** 聊天消息滚动容器引用。 */
const messageListRef = ref<HTMLElement | null>(null);

/** 聊天室中的假消息。 */
const messages = ref<ChatMessage[]>([
  {
    id: 1,
    role: 'assistant',
    content:
      '你好，我是 AI小助手。配置远程AI小助手服务后，后续我会基于当前打开的小说数据回答设定问题、辅助生成剧情，并把自然语言指令转成可审查的写作建议。',
  },
]);

/** 当前项目状态说明。 */
const projectScopeText = computed(() =>
  hasCurrentProject.value ? `当前小说：${currentProjectTitle.value}` : '当前未打开小说项目',
);

/** 是否已经配置远程服务地址。 */
const hasRemoteServiceBaseUrl = computed(() => remoteServiceBaseUrl.value.trim().length > 0);

/** 是否已经注册当前远程项目。 */
const hasRemoteProjectId = computed(() => remoteProjectId.value.trim().length > 0);

/** 远程服务配置状态文案。 */
const remoteServiceStatusText = computed(() =>
  hasRemoteServiceBaseUrl.value ? remoteServiceBaseUrl.value : '未设置远程AI小助手服务地址',
);

/** 远程服务健康状态文案。 */
const remoteHealthStatusText = computed(() => {
  if (!hasRemoteServiceBaseUrl.value) {
    return '未设置';
  }

  const statusTextMap: Record<RemoteAiAssistantHealthStatus, string> = {
    unknown: '未检测',
    checking: '检测中',
    available: '可用',
    unavailable: '不可用',
  };

  return statusTextMap[remoteHealthStatus.value];
});

/** 远程服务健康状态标签类型。 */
const remoteHealthTagType = computed(() => {
  if (remoteHealthStatus.value === 'available') {
    return 'success';
  }

  if (remoteHealthStatus.value === 'checking') {
    return 'info';
  }

  return 'warning';
});

/** 聊天不可用时的统一回复。 */
const unavailableReply = '当前 AI 服务暂未接入，请设置好 AI 服务地址。';

/** 远程服务请求超时时间，单位毫秒。 */
const REMOTE_ASSISTANT_REQUEST_TIMEOUT_MS = 5000;

/**
 * 规范化远程服务地址。
 * 远程AI小助手服务地址必须是绝对 HTTP 地址，避免被浏览器当作当前页面的相对路径。
 * @param rawBaseUrl 用户输入的服务地址
 */
function normalizeRemoteServiceBaseUrl(rawBaseUrl: string): string {
  const trimmedBaseUrl = rawBaseUrl.trim().replace(/\/+$/, '');

  if (!trimmedBaseUrl) {
    return '';
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmedBaseUrl);
  } catch {
    throw new Error('远程AI小助手服务地址必须是 http://ip:port 或 https://域名 的完整地址');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('远程AI小助手服务地址只支持 http:// 或 https://');
  }

  return parsedUrl.toString().replace(/\/+$/, '');
}

/**
 * 解析远程服务 API 地址。
 * @param path API 路径
 * @param baseUrl 远程服务基础地址
 */
function resolveRemoteApiUrl(path: string, baseUrl = remoteServiceBaseUrl.value): string {
  const normalizedBaseUrl = normalizeRemoteServiceBaseUrl(baseUrl);
  const apiBaseUrl = new URL('/api/v1/', `${normalizedBaseUrl}/`);
  return new URL(path.replace(/^\/+/, ''), apiBaseUrl).toString();
}

/**
 * 将 AbortError 转换成明确的超时提示。
 * @param error fetch 抛出的错误
 */
function formatRemoteRequestError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return '远程AI小助手服务请求超时，请检查服务地址或网络连接';
  }

  return error instanceof Error ? error.message : '远程AI小助手服务不可用';
}

/**
 * 读取 AI小助手设置。
 */
async function loadSettings(): Promise<void> {
  isLoadingSettings.value = true;
  actionMessage.value = '';

  try {
    const settings = await loadAiAssistantSettings();
    remoteServiceBaseUrl.value = settings.remoteServiceBaseUrl;
    remoteProjectId.value = settings.remoteProjectId;
    settingFormBaseUrl.value = settings.remoteServiceBaseUrl;
  } catch (error) {
    actionMessage.value = error instanceof Error ? error.message : '读取 AI 设置失败';
  } finally {
    isLoadingSettings.value = false;
  }
}

/**
 * 打开 AI 设置弹框。
 */
function openSettingsModal(): void {
  settingFormBaseUrl.value = remoteServiceBaseUrl.value;
  settingsModalMessage.value = '';
  settingsModalMessageType.value = 'info';
  settingHealthStatus.value = 'unknown';
  isSettingsModalOpen.value = true;
}

/**
 * 关闭 AI 设置弹框。
 */
function closeSettingsModal(): void {
  isSettingsModalOpen.value = false;
  settingFormBaseUrl.value = remoteServiceBaseUrl.value;
  settingsModalMessage.value = '';
  settingsModalMessageType.value = 'info';
  settingHealthStatus.value = 'unknown';
}

/**
 * 请求远程AI小助手服务。
 * @param path API 路径
 * @param init fetch 配置
 * @param baseUrl 可选的临时服务地址，设置弹框保存前用于检测用户刚输入的地址
 */
async function requestRemoteAssistant(
  path: string,
  init?: RequestInit,
  baseUrl = remoteServiceBaseUrl.value,
): Promise<unknown> {
  const abortController = new AbortController();
  const timeoutId = window.setTimeout(() => {
    abortController.abort();
  }, REMOTE_ASSISTANT_REQUEST_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(resolveRemoteApiUrl(path, baseUrl), {
      ...init,
      signal: abortController.signal,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`远程AI小助手服务请求失败：HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  return response.json() as Promise<unknown>;
}

/**
 * 检测远程AI小助手服务是否可用。
 */
async function checkRemoteServiceHealth(): Promise<boolean> {
  if (!hasRemoteServiceBaseUrl.value) {
    remoteHealthStatus.value = 'unavailable';
    actionMessage.value = '请先设置远程AI小助手服务地址';
    return false;
  }

  remoteHealthStatus.value = 'checking';
  actionMessage.value = '';

  try {
    await requestRemoteAssistant('/health', { method: 'GET' });
    remoteHealthStatus.value = 'available';
    actionMessage.value = '远程AI小助手服务可用';
    return true;
  } catch (error) {
    remoteHealthStatus.value = 'unavailable';
    actionMessage.value = formatRemoteRequestError(error);
    return false;
  }
}

/**
 * 检测设置弹框中输入的远程AI小助手服务地址。
 */
async function checkSettingFormHealth(): Promise<void> {
  settingsModalMessage.value = '';
  settingsModalMessageType.value = 'info';
  settingHealthStatus.value = 'checking';

  try {
    const nextBaseUrl = normalizeRemoteServiceBaseUrl(settingFormBaseUrl.value);

    if (!nextBaseUrl) {
      throw new Error('请填写远程AI小助手服务地址');
    }

    await requestRemoteAssistant('/health', { method: 'GET' }, nextBaseUrl);
    settingFormBaseUrl.value = nextBaseUrl;
    settingHealthStatus.value = 'available';
    settingsModalMessage.value = '远程AI小助手服务可用';
    settingsModalMessageType.value = 'success';
  } catch (error) {
    settingHealthStatus.value = 'unavailable';
    settingsModalMessage.value = formatRemoteRequestError(error);
    settingsModalMessageType.value = 'warning';
  }
}

/**
 * 保存远程AI小助手服务地址。
 */
async function submitSettings(): Promise<void> {
  isSavingSettings.value = true;
  settingsModalMessage.value = '';
  settingsModalMessageType.value = 'info';

  try {
    const nextBaseUrl = normalizeRemoteServiceBaseUrl(settingFormBaseUrl.value);

    if (!nextBaseUrl) {
      throw new Error('请填写远程AI小助手服务地址');
    }

    const settings = await saveRemoteAiAssistantServiceBaseUrl(nextBaseUrl);
    remoteServiceBaseUrl.value = settings.remoteServiceBaseUrl;
    settingFormBaseUrl.value = settings.remoteServiceBaseUrl;
    remoteHealthStatus.value = settingHealthStatus.value === 'available' ? 'available' : 'unknown';
    isSettingsModalOpen.value = false;
  } catch (error) {
    settingsModalMessage.value = formatRemoteRequestError(error);
    settingsModalMessageType.value = 'error';
  } finally {
    isSavingSettings.value = false;
  }
}

/**
 * 注册当前小说项目到远程AI小助手服务。
 */
async function registerCurrentProject(): Promise<void> {
  if (!currentProject.value) {
    actionMessage.value = '请先打开小说项目';
    return;
  }

  isRemoteActionRunning.value = true;
  actionMessage.value = '';

  try {
    const isHealthy = await checkRemoteServiceHealth();
    if (!isHealthy) {
      return;
    }

    const response = await requestRemoteAssistant('/projects/register', {
      method: 'POST',
      body: JSON.stringify({
        name: currentProject.value.novel.title,
        projectPath: currentProject.value.baseDir,
      }),
    });
    const registerResult = response as RegisterProjectResponse | null;
    const nextProjectId = registerResult?.projectId ?? registerResult?.id ?? '';

    if (!nextProjectId) {
      throw new Error('远程AI小助手服务没有返回项目 ID');
    }

    const settings = await saveRemoteAiAssistantProjectId(nextProjectId);
    remoteProjectId.value = settings.remoteProjectId;
    actionMessage.value = '当前小说项目已注册到远程AI小助手服务';
  } catch (error) {
    actionMessage.value = error instanceof Error ? error.message : '注册当前项目失败';
  } finally {
    isRemoteActionRunning.value = false;
  }
}

/**
 * 同步当前小说项目，让远程AI小助手服务更新索引。
 */
async function syncCurrentProject(): Promise<void> {
  if (!currentProject.value) {
    actionMessage.value = '请先打开小说项目';
    return;
  }

  if (!hasRemoteProjectId.value) {
    actionMessage.value = '请先注册当前小说项目';
    return;
  }

  isRemoteActionRunning.value = true;
  actionMessage.value = '';

  try {
    const isHealthy = await checkRemoteServiceHealth();
    if (!isHealthy) {
      return;
    }

    await requestRemoteAssistant(`/projects/${encodeURIComponent(remoteProjectId.value)}/sync`, {
      method: 'POST',
      body: JSON.stringify({
        projectId: remoteProjectId.value,
        projectPath: currentProject.value.baseDir,
      }),
    });
    actionMessage.value = '已请求远程AI小助手服务同步当前小说项目';
  } catch (error) {
    actionMessage.value = error instanceof Error ? error.message : '同步当前项目失败';
  } finally {
    isRemoteActionRunning.value = false;
  }
}

/**
 * 滚动到最新消息。
 */
async function scrollToLatestMessage(): Promise<void> {
  await nextTick();
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
  }
}

/**
 * 检查聊天前置条件。
 */
async function canUseRemoteChat(): Promise<boolean> {
  if (!hasRemoteServiceBaseUrl.value) {
    return false;
  }

  if (remoteHealthStatus.value === 'available') {
    return true;
  }

  return checkRemoteServiceHealth();
}

/**
 * 生成当前阶段的回复文本。
 */
async function createPlaceholderReply(): Promise<string> {
  const canChat = await canUseRemoteChat();

  if (!canChat) {
    return unavailableReply;
  }

  return [
    '远程AI小助手服务地址已设置且可用，但聊天接口暂未接入。',
    '后续会通过远程AI小助手服务只基于当前打开的小说数据进行回复，可用于查询设定、分析人物与时间线、生成剧情参考，并把可能写入 JSON 的内容作为建议变更交给用户确认。',
  ].join('\n');
}

/**
 * 发送用户消息并追加当前阶段的占位回复。
 */
async function sendMessage(): Promise<void> {
  const trimmedText = inputText.value.trim();

  if (!trimmedText) {
    return;
  }

  const timestamp = Date.now();
  messages.value.push({
    id: timestamp,
    role: 'user',
    content: trimmedText,
  });
  inputText.value = '';
  void scrollToLatestMessage();

  messages.value.push({
    id: timestamp + 1,
    role: 'assistant',
    content: await createPlaceholderReply(),
  });
  void scrollToLatestMessage();
}

/** 页面挂载后读取本地 AI 设置。 */
onMounted(() => {
  void loadSettings();
});
</script>

<template>
  <section class="ai-assistant-page">
    <!-- 页面头部：说明当前模块是预留的小助手入口。 -->
    <header class="assistant-header">
      <div class="assistant-title-group">
        <h2 class="assistant-title">AI小助手</h2>
        <n-text depth="3" class="assistant-subtitle">
          连接远程AI小助手服务后，为当前小说项目提供聊天、搜索、注册和同步入口
        </n-text>
      </div>
      <n-tag :type="hasCurrentProject ? 'success' : 'warning'" size="small" round>
        {{ projectScopeText }}
      </n-tag>
    </header>

    <div class="assistant-layout">
      <!-- 远程服务设置区：集中放置设置、检测、注册和同步入口。 -->
      <section class="assistant-service-panel" aria-label="远程AI小助手服务设置">
        <div class="service-info">
          <h3 class="service-title">远程AI小助手服务</h3>
          <n-text depth="3" class="service-status">
            {{ remoteServiceStatusText }}
          </n-text>
          <n-text v-if="currentProjectPath" depth="3" class="service-status">
            当前项目目录：{{ currentProjectPath }}
          </n-text>
          <n-text v-if="remoteProjectId" depth="3" class="service-status">
            远程项目 ID：{{ remoteProjectId }}
          </n-text>
        </div>

        <div class="service-actions">
          <n-tag :type="remoteHealthTagType" size="small" round>
            {{ remoteHealthStatusText }}
          </n-tag>
          <n-button size="small" :loading="isLoadingSettings" @click="openSettingsModal">
            设置
          </n-button>
          <n-button
            size="small"
            :disabled="!hasCurrentProject || !hasRemoteServiceBaseUrl || isRemoteActionRunning"
            :loading="isRemoteActionRunning"
            @click="registerCurrentProject"
          >
            注册
          </n-button>
          <n-button
            type="primary"
            size="small"
            :disabled="!hasCurrentProject || !hasRemoteServiceBaseUrl || !hasRemoteProjectId || isRemoteActionRunning"
            :loading="isRemoteActionRunning"
            @click="syncCurrentProject"
          >
            同步
          </n-button>
        </div>
      </section>

      <n-alert v-if="actionMessage" type="info" :bordered="false">
        {{ actionMessage }}
      </n-alert>

      <!-- 聊天室：当前只检查远程服务配置和健康状态，不真正调用 /chat。 -->
      <section class="chat-panel" aria-label="AI小助手聊天室">
        <div ref="messageListRef" class="message-list">
          <article
            v-for="message in messages"
            :key="message.id"
            class="chat-message"
            :class="`is-${message.role}`"
          >
            <div class="message-role">
              {{ message.role === 'user' ? '用户' : 'AI小助手' }}
            </div>
            <div class="message-bubble">
              {{ message.content }}
            </div>
          </article>
        </div>

        <footer class="chat-input-bar">
          <n-input
            v-model:value="inputText"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            placeholder="输入想查询的设定、剧情构思或写作指令"
            @keydown.enter.exact.prevent="sendMessage"
          />
          <n-button type="primary" class="send-button" :disabled="!inputText.trim()" @click="sendMessage">
            发送
          </n-button>
        </footer>
      </section>
    </div>

    <!-- AI 设置弹框：后续可继续扩展更多远程AI小助手服务配置项。 -->
    <AppModal
      :open="isSettingsModalOpen"
      title="AI 设置"
      :width="560"
      @close="closeSettingsModal"
    >
      <n-form label-placement="top">
        <n-form-item label="远程AI小助手服务地址">
          <n-input
            v-model:value="settingFormBaseUrl"
            placeholder="例如：http://127.0.0.1:7860"
            clearable
            :disabled="isSavingSettings || settingHealthStatus === 'checking'"
          />
        </n-form-item>
      </n-form>

      <n-alert v-if="settingsModalMessage" :type="settingsModalMessageType" :bordered="false">
        {{ settingsModalMessage }}
      </n-alert>

      <template #footer>
        <div class="modal-footer">
          <n-button :disabled="isSavingSettings" @click="closeSettingsModal">
            取消
          </n-button>
          <n-button
            :loading="settingHealthStatus === 'checking'"
            :disabled="isSavingSettings"
            @click="checkSettingFormHealth"
          >
            检测
          </n-button>
          <n-button type="primary" :loading="isSavingSettings" @click="submitSettings">
            保存
          </n-button>
        </div>
      </template>
    </AppModal>
  </section>
</template>

<style scoped>
/** AI小助手页面整体布局。 */
.ai-assistant-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  color: #172033;
}

/** 页面标题栏。 */
.assistant-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

/** 标题与副标题组合。 */
.assistant-title-group {
  display: grid;
  gap: 4px;
  min-width: 0;
}

/** 页面主标题。 */
.assistant-title {
  color: #17212b;
  font-size: 22px;
  line-height: 1.25;
}

/** 页面副标题。 */
.assistant-subtitle {
  font-size: 13px;
  line-height: 1.5;
}

/** 页面主体纵向布局：上方服务控制，下方聊天。 */
.assistant-layout {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 12px;
  flex: 1;
  min-height: 0;
}

/** 远程服务设置和操作面板。 */
.assistant-service-panel {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  background: #ffffff;
  border: 1px solid #d9e1ea;
  border-radius: 8px;
}

/** 服务信息区。 */
.service-info {
  display: grid;
  gap: 4px;
  min-width: 0;
}

/** 服务区标题。 */
.service-title {
  color: #24313d;
  font-size: 15px;
  line-height: 1.3;
}

/** 服务状态文本。 */
.service-status {
  overflow: hidden;
  max-width: 720px;
  font-size: 13px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/** 服务操作按钮区。 */
.service-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

/** 聊天室面板。 */
.chat-panel {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  min-width: 0;
  min-height: 0;
  background: #ffffff;
  border: 1px solid #d9e1ea;
  border-radius: 8px;
  overflow: hidden;
}

/** 消息滚动列表。 */
.message-list {
  display: grid;
  align-content: start;
  gap: 14px;
  min-height: 0;
  padding: 18px;
  overflow: auto;
  background: #f7f9fc;
}

/** 单条聊天消息。 */
.chat-message {
  display: grid;
  gap: 6px;
  max-width: min(720px, 82%);
}

/** 用户消息右对齐。 */
.chat-message.is-user {
  justify-self: end;
}

/** 助手消息左对齐。 */
.chat-message.is-assistant {
  justify-self: start;
}

/** 消息发送方名称。 */
.message-role {
  color: #6b7785;
  font-size: 12px;
  line-height: 1.2;
}

.chat-message.is-user .message-role {
  text-align: right;
}

/** 消息气泡。 */
.message-bubble {
  padding: 11px 13px;
  color: #24313d;
  white-space: pre-line;
  word-break: break-word;
  background: #ffffff;
  border: 1px solid #dce4ee;
  border-radius: 8px;
  line-height: 1.65;
}

.chat-message.is-user .message-bubble {
  color: #ffffff;
  background: #2f6f9f;
  border-color: #2f6f9f;
}

/** 输入栏。 */
.chat-input-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 88px;
  gap: 12px;
  align-items: end;
  padding: 14px;
  border-top: 1px solid #d9e1ea;
  background: #ffffff;
}

/** 发送按钮保持固定宽度，避免输入内容影响布局。 */
.send-button {
  width: 88px;
}

/** 弹框底部按钮栏。 */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
