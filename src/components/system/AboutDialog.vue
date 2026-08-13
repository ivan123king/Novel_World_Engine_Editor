<script setup lang="ts">
/**
 * 关于佳依创式弹框组件。
 * 监听 Electron 系统菜单事件，展示写死的软件名称、简介、作者和联系方式。
 */
import { onMounted, onUnmounted, ref } from 'vue';
import { onOpenAboutDialog } from '@/api/aboutApi';
import aboutBackgroundUrl from '@/assets/about.jpg';

const isVisible = ref(false);

let removeOpenListener: (() => void) | null = null;

/** 打开关于弹框，只改变 renderer UI 状态，不读写任何 JSON 文件。 */
function openDialog(): void {
  isVisible.value = true;
}

/** 关闭关于弹框。 */
function closeDialog(): void {
  isVisible.value = false;
}

onMounted(() => {
  try {
    removeOpenListener = onOpenAboutDialog(openDialog);
  } catch {
    // preload 未就绪时不注册关于菜单事件，保持普通浏览器环境可加载。
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
    title="佳依创式"
    class="about-dialog-modal"
    :mask-closable="true"
    @close="closeDialog"
  >
    <section
      class="about-dialog"
      :style="{ backgroundImage: `url(${aboutBackgroundUrl})` }"
    >
      <div class="about-dialog__overlay">
        <div class="about-dialog__content">
          <h1 class="about-dialog__title">佳依创式</h1>

          <p class="about-dialog__summary">
            一款本地优先的长篇小说世界引擎编辑器，用于维护故事世界的当前状态、人物关系、剧情事件与可供 AI 写作使用的上下文。
          </p>

          <dl class="about-dialog__meta">
            <div class="about-dialog__meta-row">
              <dt>作者</dt>
              <dd>GPT5.5、刘伟</dd>
            </div>
            <div class="about-dialog__meta-row">
              <dt>联系方式</dt>
              <dd>lw18751836671@163.com</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  </n-modal>
</template>

<style scoped>
/** 关于弹框主体使用图片背景，失败时回落到深色底色。 */
.about-dialog {
  min-height: 360px;
  overflow: hidden;
  background-color: #16222f;
  background-position: center;
  background-size: cover;
}

/** 背景遮罩保证浅色文字在不同图片区域都清晰可读。 */
.about-dialog__overlay {
  display: flex;
  min-height: 360px;
  align-items: center;
  justify-content: center;
  padding: 46px 38px;
  background:
    linear-gradient(180deg, rgb(12 18 27 / 0.54), rgb(12 18 27 / 0.78)),
    rgb(12 18 27 / 0.22);
}

/** 关于信息内容居中排版，保持桌面工具的克制信息层级。 */
.about-dialog__content {
  display: grid;
  width: min(100%, 520px);
  gap: 22px;
  color: #f8fafc;
  text-align: center;
  text-shadow: 0 1px 3px rgb(0 0 0 / 0.42);
}

/** 软件名称作为关于弹框的第一视觉，居中且不依赖旧英文名称。 */
.about-dialog__title {
  font-size: 38px;
  font-weight: 700;
  line-height: 1.18;
  letter-spacing: 0;
}

/** 软件简介使用可读段落宽度，避免长句贴边。 */
.about-dialog__summary {
  font-size: 15px;
  line-height: 1.8;
}

/** 作者信息与联系方式以轻量信息块呈现，不参与任何持久化。 */
.about-dialog__meta {
  display: grid;
  gap: 8px;
  margin: 6px 0 0;
  padding: 16px 18px;
  border: 1px solid rgb(255 255 255 / 0.22);
  background: rgb(15 23 42 / 0.46);
}

.about-dialog__meta-row {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 12px;
  text-align: left;
}

.about-dialog__meta dt {
  color: rgb(226 232 240 / 0.82);
  font-size: 13px;
}

.about-dialog__meta dd {
  min-width: 0;
  margin: 0;
  color: #ffffff;
  font-size: 14px;
  overflow-wrap: anywhere;
}

@media (max-width: 560px) {
  .about-dialog__overlay {
    padding: 34px 24px;
  }

  .about-dialog__title {
    font-size: 32px;
  }

  .about-dialog__meta-row {
    grid-template-columns: 1fr;
    gap: 4px;
    text-align: center;
  }
}
</style>

<style>
/** 关于弹框需要让背景图覆盖整个卡片内容区，因此覆盖 Naive UI 默认内边距。 */
.about-dialog-modal {
  width: min(620px, calc(100vw - 32px));
}

.about-dialog-modal .n-card__content {
  padding: 0;
}
</style>
