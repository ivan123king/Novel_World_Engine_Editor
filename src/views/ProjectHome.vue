<script setup lang="ts">
/**
 * 项目首页视图。
 * 从当前用户选择的小说目录 `novel.json` 展示小说名和简介，并提供双击编辑入口。
 */
import { computed, nextTick, ref, watch } from 'vue';
import { useProjectStore } from '@/stores/projectStore';

/** 项目首页正在编辑的字段类型。 */
type EditingField = 'title' | 'description' | null;

const projectStore = useProjectStore();
const { currentProject, hasCurrentProject, updateProjectOverview } = projectStore;

/** 当前正在编辑的字段。 */
const editingField = ref<EditingField>(null);
/** 标题输入框内容。 */
const titleDraft = ref('');
/** 简介输入框内容。 */
const descriptionDraft = ref('');
/** 保存中的状态标记。 */
const isSaving = ref(false);
/** 保存失败时展示的错误。 */
const saveError = ref('');
/** 标题输入框引用，用于进入编辑态后聚焦。 */
const titleInputRef = ref<{ focus: () => void } | null>(null);
/** 简介输入框引用，用于进入编辑态后聚焦。 */
const descriptionInputRef = ref<{ focus: () => void } | null>(null);

/** 当前小说名。 */
const novelTitle = computed(() => currentProject.value?.novel.title.trim() || '未命名小说');
/** 当前小说简介。 */
const novelDescription = computed(() => currentProject.value?.novel.description.trim() || '双击添加小说简介。');

/**
 * 从当前项目同步编辑草稿。
 * 项目切换或恢复上次项目时，首页展示内容应立即跟随 `novel.json`。
 */
function syncDraftFromProject(): void {
  titleDraft.value = currentProject.value?.novel.title ?? '';
  descriptionDraft.value = currentProject.value?.novel.description ?? '';
}

/** 进入指定字段的编辑状态。 */
async function startEditing(field: Exclude<EditingField, null>): Promise<void> {
  if (!hasCurrentProject.value || isSaving.value) {
    return;
  }

  saveError.value = '';
  syncDraftFromProject();
  editingField.value = field;

  await nextTick();

  if (field === 'title') {
    titleInputRef.value?.focus();
    return;
  }

  descriptionInputRef.value?.focus();
}

/** 取消编辑并恢复当前项目中的原始值。 */
function cancelEditing(): void {
  syncDraftFromProject();
  editingField.value = null;
  saveError.value = '';
}

/** 保存首页编辑内容到当前项目目录的 novel.json。 */
async function saveOverview(): Promise<void> {
  if (!hasCurrentProject.value || isSaving.value) {
    return;
  }

  const nextTitle = titleDraft.value.trim() || '未命名小说';
  const nextDescription = descriptionDraft.value.trim();
  const currentTitle = currentProject.value?.novel.title ?? '';
  const currentDescription = currentProject.value?.novel.description ?? '';

  if (nextTitle === currentTitle && nextDescription === currentDescription) {
    editingField.value = null;
    return;
  }

  isSaving.value = true;
  saveError.value = '';

  try {
    await updateProjectOverview(nextTitle, nextDescription);
    syncDraftFromProject();
    editingField.value = null;
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : '保存小说信息失败';
  } finally {
    isSaving.value = false;
  }
}

watch(
  currentProject,
  () => {
    syncDraftFromProject();
    editingField.value = null;
    saveError.value = '';
  },
  { immediate: true },
);
</script>

<template>
  <section class="project-home">
    <div v-if="hasCurrentProject" class="project-home__center">
      <!-- 小说名：双击进入编辑态，保存后写回当前项目目录的 novel.json。 -->
      <n-input
        v-if="editingField === 'title'"
        ref="titleInputRef"
        v-model:value="titleDraft"
        class="project-home__title-input"
        :disabled="isSaving"
        maxlength="80"
        show-count
        @blur="saveOverview"
        @keyup.enter="saveOverview"
        @keyup.esc="cancelEditing"
      />
      <button
        v-else
        class="project-home__title"
        type="button"
        title="双击修改小说名"
        @dblclick="startEditing('title')"
      >
        {{ novelTitle }}
      </button>

      <!-- 小说简介：双击进入编辑态，保存后写回当前项目目录的 novel.json。 -->
      <n-input
        v-if="editingField === 'description'"
        ref="descriptionInputRef"
        v-model:value="descriptionDraft"
        class="project-home__description-input"
        type="textarea"
        :autosize="{ minRows: 5, maxRows: 10 }"
        :disabled="isSaving"
        maxlength="1200"
        show-count
        @blur="saveOverview"
        @keyup.esc="cancelEditing"
      />
      <button
        v-else
        class="project-home__description"
        type="button"
        title="双击修改小说简介"
        @dblclick="startEditing('description')"
      >
        {{ novelDescription }}
      </button>

      <n-text v-if="isSaving" depth="3" class="project-home__status">
        正在保存...
      </n-text>
      <n-text v-else-if="saveError" type="error" class="project-home__status">
        {{ saveError }}
      </n-text>
    </div>

    <n-empty
      v-else
      class="project-home__empty"
      description="尚未打开小说项目，请通过顶部菜单“小说 > 新建”或“小说 > 打开”选择小说目录。"
    />
  </section>
</template>

<style scoped>
/** 首页容器占满右侧工作区，用于让小说信息形成稳定的居中视觉锚点。 */
.project-home {
  display: grid;
  min-height: 100%;
  padding: 48px 32px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(248, 250, 252, 0.94)),
    #f4f7fa;
  place-items: center;
}

/** 小说信息主体区域，只承载标题和简介，不再展示 mock 统计数据。 */
.project-home__center {
  display: grid;
  width: min(780px, 100%);
  gap: 26px;
  justify-items: center;
  text-align: center;
}

/** 小说名展示按钮，保留按钮语义但视觉上接近正文标题。 */
.project-home__title {
  width: 100%;
  padding: 0;
  border: 0;
  color: #17212b;
  background: transparent;
  cursor: text;
  font-size: 42px;
  font-weight: 750;
  line-height: 1.18;
  overflow-wrap: anywhere;
}

.project-home__title:hover {
  color: #0f5f8f;
}

/** 标题编辑框和展示标题宽度一致，避免进入编辑态时页面跳动。 */
.project-home__title-input {
  max-width: 720px;
}

.project-home__title-input :deep(.n-input__input-el) {
  height: 58px;
  text-align: center;
  font-size: 34px;
  font-weight: 700;
}

/** 小说简介展示按钮。 */
.project-home__description {
  width: 100%;
  max-width: 680px;
  min-height: 132px;
  padding: 0;
  border: 0;
  color: #4a5968;
  background: transparent;
  cursor: text;
  font-size: 17px;
  line-height: 1.9;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.project-home__description:hover {
  color: #203040;
}

/** 简介编辑框使用稳定宽度，适合录入较长项目概述。 */
.project-home__description-input {
  max-width: 680px;
}

.project-home__description-input :deep(.n-input__textarea-el) {
  text-align: center;
  line-height: 1.8;
}

/** 保存状态和错误提示区域固定高度，避免内容闪烁造成布局移动。 */
.project-home__status {
  min-height: 22px;
  font-size: 13px;
}

/** 未打开项目时的空态位置。 */
.project-home__empty {
  width: min(620px, 100%);
}
</style>
