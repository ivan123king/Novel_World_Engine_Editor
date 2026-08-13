<script setup lang="ts">
/**
 * AI小助手模块视图。
 * 当前阶段只提供预留聊天室界面，不接入真实 AI 服务，也不读取或写入小说 JSON 数据。
 */
import { computed, nextTick, ref } from 'vue';
import { useProjectStore } from '@/stores/projectStore';

/** 聊天消息的发送方。 */
type ChatMessageRole = 'assistant' | 'user';

/** 聊天消息结构。 */
interface ChatMessage {
  id: number;
  role: ChatMessageRole;
  content: string;
}

/** 小助手后续计划挂载的小说数据范围。 */
const attachedDataTypes = [
  '当前小说项目',
  '世界状态',
  '人物设定',
  '物品道具',
  '地点与地图',
  '剧情库',
  '时间线',
  '人物关系',
];

/** 小助手预留能力列表。 */
const plannedCapabilities = [
  '根据当前打开的小说设定回答问题',
  '搜索人物、物品、地点、剧情和时间线设定',
  '根据自然语言指令生成写作建议',
  '按设定生成简短连贯的剧情参考',
  '未来只以建议变更形式提出数据修改',
];

const projectStore = useProjectStore();
const { currentProjectTitle, hasCurrentProject } = projectStore;

/** 用户当前输入内容。 */
const inputText = ref('');

/** 聊天消息滚动容器引用。 */
const messageListRef = ref<HTMLElement | null>(null);

/** 聊天室中的假消息。 */
const messages = ref<ChatMessage[]>([
  {
    id: 1,
    role: 'assistant',
    content:
      '你好，我是 AI小助手。后续我会基于当前打开的小说数据回答设定问题、辅助生成剧情，并帮助作者把自然语言指令转成可审查的写作建议。',
  },
]);

/** 当前项目状态说明。 */
const projectScopeText = computed(() =>
  hasCurrentProject.value ? `当前小说：${currentProjectTitle.value}` : '当前未打开小说项目',
);

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
 * 生成假回复文本。
 */
function createPlaceholderReply(): string {
  return [
    '此模块暂未接入 AI 服务。',
    '后续 AI小助手会只基于当前打开的小说数据进行回复，可用于查询设定、分析人物与时间线、根据世界状态生成简短连贯的剧情参考，并把可能写入 JSON 的内容作为建议变更交给用户确认。',
  ].join('\n');
}

/**
 * 发送用户消息并追加固定占位回复。
 */
function sendMessage(): void {
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
  messages.value.push({
    id: timestamp + 1,
    role: 'assistant',
    content: createPlaceholderReply(),
  });
  inputText.value = '';
  void scrollToLatestMessage();
}
</script>

<template>
  <section class="ai-assistant-page">
    <!-- 页面头部：说明当前模块是预留的小助手入口。 -->
    <header class="assistant-header">
      <div class="assistant-title-group">
        <h2 class="assistant-title">AI小助手</h2>
        <n-text depth="3" class="assistant-subtitle">
          预留给当前小说项目的 AI 聊天与写作辅助入口
        </n-text>
      </div>
      <n-tag :type="hasCurrentProject ? 'success' : 'warning'" size="small" round>
        {{ projectScopeText }}
      </n-tag>
    </header>

    <div class="assistant-workspace">
      <!-- 左侧上下文范围提示：只展示未来会挂载的数据类型。 -->
      <aside class="assistant-context-panel" aria-label="小助手上下文范围">
        <section class="context-section">
          <h3 class="context-title">上下文范围</h3>
          <n-text depth="3" class="context-description">
            后续小助手只使用当前打开小说的数据，不跨项目读取。
          </n-text>
          <div class="context-tag-list">
            <n-tag
              v-for="dataType in attachedDataTypes"
              :key="dataType"
              size="small"
              round
            >
              {{ dataType }}
            </n-tag>
          </div>
        </section>

        <section class="context-section">
          <h3 class="context-title">预留能力</h3>
          <ul class="capability-list">
            <li v-for="capability in plannedCapabilities" :key="capability">
              {{ capability }}
            </li>
          </ul>
        </section>
      </aside>

      <!-- 右侧聊天室：当前只提供假发送与固定回复。 -->
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

/** 小助手工作区，左侧范围说明，右侧聊天室。 */
.assistant-workspace {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 16px;
  flex: 1;
  min-height: 0;
}

/** 小助手上下文范围侧栏。 */
.assistant-context-panel {
  display: grid;
  align-content: start;
  gap: 16px;
  min-height: 0;
  padding: 16px;
  overflow: auto;
  background: #ffffff;
  border: 1px solid #d9e1ea;
  border-radius: 8px;
}

/** 侧栏信息分区。 */
.context-section {
  display: grid;
  gap: 10px;
}

/** 侧栏分区标题。 */
.context-title {
  color: #24313d;
  font-size: 15px;
  line-height: 1.3;
}

/** 侧栏说明文本。 */
.context-description {
  font-size: 13px;
  line-height: 1.6;
}

/** 上下文数据标签列表。 */
.context-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/** 预留能力列表。 */
.capability-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 18px;
  color: #465260;
  font-size: 13px;
  line-height: 1.55;
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
</style>
