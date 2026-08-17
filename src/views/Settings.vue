<script setup lang="ts">
/**
 * 设定模块主视图。
 * 提供真实 JSON 文件驱动的设定列表、Inspector 查看、新建、编辑和删除能力。
 */
import { computed, onMounted } from 'vue';
import AppModal from '@/components/common/AppModal.vue';
import SettingRichTextEditor from '@/views/settings/SettingRichTextEditor.vue';
import {
  getSettingContentHtml,
  isSettingHtmlEmpty,
} from '@/views/settings/settingContent';
import { useSettingList } from '@/views/settings/useSettingList';

const {
  filteredSettings,
  selectedSetting,
  settingCount,
  formValues,
  formMode,
  isCreateModalOpen,
  isEditModalOpen,
  isLoading,
  isSaving,
  loadError,
  saveError,
  fileErrors,
  searchKeyword,
  formError,
  isEmpty,
  isSearchEmpty,
  hasErrorMessage,
  canSubmitForm,
  loadSettings,
  openDetail,
  openCreate,
  openEdit,
  closeForm,
  submitForm,
  removeSetting,
  createSettingExcerpt,
} = useSettingList();

/** 当前设定内容的 HTML，用于 Inspector 富文本展示。 */
const selectedContentHtml = computed(() => getSettingContentHtml(selectedSetting.value));

/** 当前设定内容是否为空，用于 Inspector 展示空状态。 */
const selectedContentIsEmpty = computed(() => isSettingHtmlEmpty(selectedContentHtml.value));

/**
 * 清理设定 HTML 展示内容。
 * 当前内容由 Tiptap 生成，本地 JSON 仍可能被手动编辑，因此渲染前只保留基础文字标签。
 */
const safeSelectedContentHtml = computed(() => sanitizeSettingHtml(selectedContentHtml.value));

/**
 * 过滤设定 HTML 中的非基础文字标签和属性。
 * @param html 原始 HTML
 */
function sanitizeSettingHtml(html: string): string {
  const template = document.createElement('template');
  const allowedTags = new Set([
    'P',
    'BR',
    'STRONG',
    'B',
    'EM',
    'I',
    'S',
    'UL',
    'OL',
    'LI',
    'BLOCKQUOTE',
    'H2',
    'H3',
  ]);

  template.innerHTML = html;

  template.content.querySelectorAll('*').forEach((element) => {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(document.createTextNode(element.textContent ?? ''));
      return;
    }

    [...element.attributes].forEach((attribute) => {
      element.removeAttribute(attribute.name);
    });
  });

  return template.innerHTML;
}

/** 页面挂载后读取当前小说项目的设定数据。 */
onMounted(() => {
  void loadSettings();
});
</script>

<template>
  <section class="setting-page">
    <!-- 页面工具栏：显示设定数量和主要操作入口。 -->
    <header class="setting-toolbar">
      <div class="setting-title-group">
        <h2 class="setting-title">设定</h2>
      </div>

      <n-space align="center" size="small">
        <n-tag size="small" round>
          {{ settingCount }} 条
        </n-tag>
        <n-button size="small" :loading="isLoading" @click="loadSettings">
          刷新
        </n-button>
        <n-button type="primary" size="small" :disabled="isSaving" @click="openCreate">
          新建设定
        </n-button>
      </n-space>
    </header>

    <!-- 错误提示：读写错误和坏文件提示不吞掉，便于用户修复本地 JSON。 -->
    <div v-if="hasErrorMessage" class="setting-error-panel">
      <p v-if="loadError">{{ loadError }}</p>
      <p v-if="saveError">{{ saveError }}</p>
      <p v-for="fileError in fileErrors" :key="fileError">
        {{ fileError }}
      </p>
    </div>

    <div class="setting-workspace">
      <!-- 左侧设定列表：第一阶段只按标题搜索。 -->
      <aside class="setting-list-panel" aria-label="设定列表">
        <n-input
          v-model:value="searchKeyword"
          placeholder="搜索设定标题"
          clearable
          :disabled="isLoading"
        />

        <div class="setting-list">
          <button
            v-for="setting in filteredSettings"
            :key="setting.id"
            class="setting-list-row"
            :class="{ 'is-active': selectedSetting?.id === setting.id }"
            type="button"
            @click="openDetail(setting)"
          >
            <span class="setting-list-name">{{ setting.title }}</span>
            <span class="setting-list-meta">
              {{ createSettingExcerpt(setting.content, setting.contentFormat) }}
            </span>
          </button>

          <n-empty v-if="isEmpty" description="暂无设定，点击右上角新建设定" />
          <n-empty v-if="isSearchEmpty" description="没有匹配的设定" />
        </div>
      </aside>

      <!-- 右侧 Inspector：展示选中的世界规则或背景设定。 -->
      <section class="setting-inspector" aria-label="设定 Inspector">
        <div v-if="selectedSetting" class="inspector-content">
          <div class="inspector-header">
            <div class="inspector-title-group">
              <h3 class="inspector-title">{{ selectedSetting.title }}</h3>
            </div>

            <n-space size="small" wrap>
              <n-button size="small" :disabled="isSaving" @click="openEdit(selectedSetting)">
                编辑
              </n-button>
              <n-button
                size="small"
                type="error"
                :disabled="isSaving"
                @click="removeSetting(selectedSetting.id)"
              >
                删除
              </n-button>
            </n-space>
          </div>

          <div class="setting-content-panel">
            <div class="section-heading">
              <n-text strong>设定内容</n-text>
            </div>

            <div
              v-if="!selectedContentIsEmpty"
              class="setting-content-text"
              v-html="safeSelectedContentHtml"
            />
            <n-empty v-else description="未填写设定内容" />
          </div>
        </div>

        <n-empty v-else description="从左侧选择设定，或新建一条设定" />
      </section>
    </div>

    <!-- 设定表单弹框：提交后写入 settings/*.json。 -->
    <AppModal
      :open="isCreateModalOpen || isEditModalOpen"
      :title="formMode === 'create' ? '新建设定' : '编辑设定'"
      :width="680"
      @close="closeForm"
    >
      <n-form label-placement="top" label-align="text">
        <n-form-item label="标题" required>
          <n-input
            v-model:value="formValues.title"
            placeholder="请输入设定标题，例如：修炼境界体系"
            clearable
          />
        </n-form-item>

        <n-form-item label="内容">
          <SettingRichTextEditor
            v-model="formValues.content"
            :disabled="isSaving"
          />
        </n-form-item>

        <div v-if="formError" class="form-error">
          {{ formError }}
        </div>
      </n-form>

      <template #footer>
        <div class="modal-footer">
          <n-button @click="closeForm">
            取消
          </n-button>
          <n-button
            type="primary"
            :loading="isSaving"
            :disabled="!canSubmitForm"
            @click="submitForm"
          >
            保存
          </n-button>
        </div>
      </template>
    </AppModal>
  </section>
</template>

<style scoped>
/** 设定页面整体布局，沿用桌面编辑器的稳定工作台结构。 */
.setting-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

/** 页面顶部工具栏。 */
.setting-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

/** 标题和数据来源展示区域。 */
.setting-title-group {
  display: grid;
  gap: 4px;
  min-width: 0;
}

/** 页面标题。 */
.setting-title {
  margin: 0;
  color: #17212b;
  font-size: 22px;
  line-height: 1.25;
}

/** 文件读写错误展示区。 */
.setting-error-panel {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  color: #9f3a2f;
  background: #fff1ef;
  border: 1px solid #f0c4bf;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.5;
}

/** 主工作区，左列表右 Inspector。 */
.setting-workspace {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  gap: 16px;
  flex: 1;
  min-height: 0;
}

/** 左侧设定列表面板。 */
.setting-list-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  min-height: 0;
  padding: 14px;
  background: #ffffff;
  border: 1px solid #d9e1ea;
  border-radius: 8px;
}

/** 设定列表滚动容器。 */
.setting-list {
  display: grid;
  align-content: start;
  gap: 8px;
  min-height: 0;
  overflow: auto;
}

/** 设定列表行按钮。 */
.setting-list-row {
  display: grid;
  gap: 5px;
  width: 100%;
  padding: 11px 12px;
  color: #24313d;
  text-align: left;
  background: #f8fafc;
  border: 1px solid #dce4ee;
  border-radius: 6px;
  cursor: pointer;
}

.setting-list-row:hover,
.setting-list-row.is-active {
  background: #eef6ff;
  border-color: #7aa7d9;
}

/** 设定列表标题。 */
.setting-list-name {
  overflow: hidden;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/** 设定列表摘要。 */
.setting-list-meta {
  display: -webkit-box;
  overflow: hidden;
  color: #687684;
  font-size: 12px;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

/** 右侧 Inspector 面板。 */
.setting-inspector {
  min-width: 0;
  min-height: 0;
  padding: 18px;
  overflow: auto;
  background: #ffffff;
  border: 1px solid #d9e1ea;
  border-radius: 8px;
}

/** Inspector 内容垂直布局。 */
.inspector-content {
  display: grid;
  gap: 18px;
}

/** Inspector 顶部名称和操作栏。 */
.inspector-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

/** Inspector 标题组。 */
.inspector-title-group {
  display: grid;
  gap: 4px;
  min-width: 0;
}

/** Inspector 设定标题。 */
.inspector-title {
  margin: 0;
  color: #17212b;
  font-size: 24px;
  line-height: 1.25;
  word-break: break-word;
}

/** 设定 ID 展示。 */
.inspector-id {
  font-size: 12px;
  line-height: 1.2;
}

/** 设定正文面板。 */
.setting-content-panel {
  display: grid;
  gap: 12px;
}

/** 区块标题栏。 */
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/** 设定正文富文本展示。 */
.setting-content-text {
  min-height: 220px;
  padding: 14px 16px;
  color: #24313d;
  background: #f8fafc;
  border: 1px solid #dce4ee;
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

.setting-content-text :deep(p),
.setting-content-text :deep(ul),
.setting-content-text :deep(ol),
.setting-content-text :deep(blockquote),
.setting-content-text :deep(h2),
.setting-content-text :deep(h3) {
  margin: 0 0 10px;
}

.setting-content-text :deep(h2) {
  font-size: 20px;
  line-height: 1.35;
}

.setting-content-text :deep(h3) {
  font-size: 17px;
  line-height: 1.4;
}

.setting-content-text :deep(ul),
.setting-content-text :deep(ol) {
  padding-left: 24px;
}

.setting-content-text :deep(blockquote) {
  padding-left: 12px;
  color: #52616f;
  border-left: 3px solid #9db7d3;
}

/** 表单错误提示。 */
.form-error {
  padding: 9px 11px;
  color: #9f3a2f;
  background: #fff1ef;
  border: 1px solid #f0c4bf;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.5;
}

/** 弹框底部按钮栏。 */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
