<script setup lang="ts">
/**
 * 人物模块主视图。
 * 提供真实 JSON 文件驱动的人物列表、搜索、Inspector 查看、新建、编辑、复制和删除能力。
 */
import { computed, onMounted } from 'vue';
import CharacterFormModal from '@/views/character/CharacterFormModal.vue';
import { useCharacterList, type CharacterDropPlacement } from '@/views/character/useCharacterList';
import { getCharacterCustomFieldEntries, type CharacterFile, type JsonValue } from '@/types';

const {
  filteredCharacters,
  characterCount,
  selectedCharacter,
  editingCharacter,
  isCreateModalOpen,
  isEditModalOpen,
  isLoading,
  isSaving,
  loadError,
  saveError,
  fileErrors,
  dataDirectory,
  searchKeyword,
  draggingCharacterId,
  dragOverCharacterId,
  characterDropPlacement,
  loadCharacters,
  openDetail,
  openCreate,
  closeCreate,
  openEdit,
  closeEdit,
  deleteCharacter,
  duplicateCharacter,
  createCharacter,
  updateCharacter,
  startCharacterDrag,
  hoverCharacterDropTarget,
  resetCharacterDrag,
  dropCharacterOn,
} = useCharacterList();

/** 当前选中人物的自定义属性条目。 */
const selectedCustomFields = computed(() => getCharacterCustomFieldEntries(selectedCharacter.value));

/** 页面当前是否没有任何人物数据。 */
const isEmpty = computed(() => !isLoading.value && characterCount.value === 0);

/** 页面当前搜索是否没有结果。 */
const isSearchEmpty = computed(
  () => !isLoading.value && characterCount.value > 0 && filteredCharacters.value.length === 0,
);

/** 页面是否存在需要展示的错误信息。 */
const hasErrorMessage = computed(() => Boolean(loadError.value || saveError.value || fileErrors.value.length));

/**
 * 获取年龄展示文本。
 * @param age 原始年龄值
 * @returns 可读年龄文本
 */
function formatAge(age: CharacterFile['age']): string {
  return age === null || age === '' ? '未知' : String(age);
}

/**
 * 获取性格标签展示文本。
 * @param traits 性格标签数组
 * @returns 可读性格文本
 */
function formatTraits(traits: string[]): string {
  return traits.length > 0 ? traits.join('、') : '未填写';
}

/**
 * 格式化单个自定义字段值。
 * @param value 自定义字段值
 * @returns 普通文本或格式化 JSON
 */
function formatCustomFieldValue(value: JsonValue): string {
  return typeof value === 'string' ? value || '未填写' : JSON.stringify(value, null, 2);
}

/**
 * 根据鼠标位于列表项上半区或下半区判断插入位置。
 * @param event 拖拽事件
 */
function resolveCharacterDropPlacement(event: DragEvent): CharacterDropPlacement {
  const target = event.currentTarget;

  if (!(target instanceof HTMLElement)) {
    return 'before';
  }

  const targetRect = target.getBoundingClientRect();
  return event.clientY > targetRect.top + targetRect.height / 2 ? 'after' : 'before';
}

/** 页面挂载后从本地 JSON 目录读取人物文件。 */
onMounted(() => {
  void loadCharacters();
});
</script>

<template>
  <section class="character-page">
    <!-- 页面工具栏：显示当前数据目录、读写状态和主要操作入口。 -->
    <header class="character-toolbar">
      <div class="character-title-group">
        <h2 class="character-title">人物</h2>
      </div>

      <n-space align="center" size="small">
        <n-tag size="small" round>
          {{ characterCount }} 个
        </n-tag>
        <n-button size="small" :loading="isLoading" @click="loadCharacters">
          刷新
        </n-button>
        <n-button type="primary" size="small" :disabled="isSaving" @click="openCreate">
          新建人物
        </n-button>
      </n-space>
    </header>

    <!-- 错误提示：读写错误和坏文件提示不吞掉，便于用户修复本地 JSON。 -->
    <div v-if="hasErrorMessage" class="character-error-panel">
      <p v-if="loadError">{{ loadError }}</p>
      <p v-if="saveError">{{ saveError }}</p>
      <p v-for="fileError in fileErrors" :key="fileError">
        {{ fileError }}
      </p>
    </div>

    <div class="character-workspace">
      <!-- 左侧人物列表：搜索和选择人物。 -->
      <aside class="character-list-panel" aria-label="人物列表">
        <n-input
          v-model:value="searchKeyword"
          placeholder="搜索姓名、性格、外貌或自定义属性"
          clearable
          :disabled="isLoading"
        />

        <div class="character-list">
          <button
            v-for="character in filteredCharacters"
            :key="character.id"
            class="character-list-item"
            :class="{
              'is-active': selectedCharacter?.id === character.id,
              'is-dragging': draggingCharacterId === character.id,
              'is-drop-target': dragOverCharacterId === character.id,
              'is-drop-before': dragOverCharacterId === character.id && characterDropPlacement === 'before',
              'is-drop-after': dragOverCharacterId === character.id && characterDropPlacement === 'after',
            }"
            type="button"
            :draggable="!isSaving && !isLoading"
            @dragstart="startCharacterDrag(character.id)"
            @dragenter="hoverCharacterDropTarget(character.id, resolveCharacterDropPlacement($event))"
            @dragover.prevent="hoverCharacterDropTarget(character.id, resolveCharacterDropPlacement($event))"
            @drop.prevent="dropCharacterOn(character.id, resolveCharacterDropPlacement($event))"
            @dragend="resetCharacterDrag"
            @click="openDetail(character)"
          >
            <span class="character-drag-handle" aria-hidden="true">::</span>
            <span class="character-list-content">
              <span class="character-list-name">{{ character.name }}</span>
              <span class="character-list-meta">
                {{ formatAge(character.age) }} / {{ formatTraits(character.traits) }}
              </span>
            </span>
          </button>

          <n-empty v-if="isEmpty" description="暂无人物，点击右上角新建人物" />
          <n-empty v-if="isSearchEmpty" description="没有匹配的人物" />
        </div>
      </aside>

      <!-- 右侧 Inspector：展示当前选中人物并提供写入操作。 -->
      <section class="character-inspector" aria-label="人物 Inspector">
        <div v-if="selectedCharacter" class="inspector-content">
          <div class="inspector-header">
            <div class="inspector-title-group">
              <h3 class="inspector-title">{{ selectedCharacter.name }}</h3>
            </div>

            <n-space size="small" wrap>
              <n-button size="small" :disabled="isSaving" @click="openEdit(selectedCharacter)">
                编辑
              </n-button>
              <n-button size="small" :disabled="isSaving" @click="duplicateCharacter(selectedCharacter)">
                复制
              </n-button>
              <n-button
                size="small"
                type="error"
                :disabled="isSaving"
                @click="deleteCharacter(selectedCharacter.id)"
              >
                删除
              </n-button>
            </n-space>
          </div>

          <n-descriptions :column="1" bordered label-placement="left" size="medium">
            <n-descriptions-item label="名称" label-style="width: 88px">
              {{ selectedCharacter.name }}
            </n-descriptions-item>
            <n-descriptions-item label="年龄" label-style="width: 88px">
              {{ formatAge(selectedCharacter.age) }}
            </n-descriptions-item>
            <n-descriptions-item label="性格" label-style="width: 88px">
              {{ formatTraits(selectedCharacter.traits) }}
            </n-descriptions-item>
            <n-descriptions-item label="外貌" label-style="width: 88px">
              <p class="inspector-paragraph">{{ selectedCharacter.appearance || '未填写' }}</p>
            </n-descriptions-item>
          </n-descriptions>

          <div class="custom-fields">
            <div class="section-heading">
              <n-text strong>自定义属性</n-text>
              <n-text depth="3">{{ selectedCustomFields.length }} 项</n-text>
            </div>

            <div v-if="selectedCustomFields.length > 0" class="custom-field-table">
              <div
                v-for="[fieldKey, fieldValue] in selectedCustomFields"
                :key="fieldKey"
                class="custom-field-item"
              >
                <div class="custom-field-key">{{ fieldKey }}</div>
                <pre class="custom-field-value">{{ formatCustomFieldValue(fieldValue) }}</pre>
              </div>
            </div>

            <n-empty v-else description="未填写自定义属性" />
          </div>
        </div>

        <n-empty v-else description="从左侧选择人物，或新建一个人物" />
      </section>
    </div>

    <!-- 新建弹框：提交后写入 data/characters/*.json。 -->
    <CharacterFormModal
      :open="isCreateModalOpen"
      mode="create"
      :submitting="isSaving"
      @close="closeCreate"
      @submit="createCharacter"
    />

    <!-- 编辑弹框：提交后覆盖对应人物 JSON 文件。 -->
    <CharacterFormModal
      :open="isEditModalOpen"
      mode="edit"
      :character="editingCharacter"
      :submitting="isSaving"
      @close="closeEdit"
      @submit="editingCharacter && updateCharacter(editingCharacter.id, $event)"
    />
  </section>
</template>

<style scoped>
/** 人物页面整体布局，贴合桌面工作台的信息密度。 */
.character-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

/** 人物页面顶部工具栏。 */
.character-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

/** 标题和数据目录展示区域。 */
.character-title-group {
  display: grid;
  gap: 4px;
  min-width: 0;
}

/** 页面标题。 */
.character-title {
  margin: 0;
  color: #17212b;
  font-size: 22px;
  line-height: 1.25;
}

/** 数据目录路径展示。 */
.character-subtitle {
  max-width: 720px;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/** 文件读写错误展示区。 */
.character-error-panel {
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
.character-workspace {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 16px;
  flex: 1;
  min-height: 0;
}

/** 左侧人物列表面板。 */
.character-list-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  min-height: 0;
  padding: 14px;
  background: #ffffff;
  border: 1px solid #d9e1ea;
  border-radius: 8px;
}

/** 人物列表滚动容器。 */
.character-list {
  display: grid;
  align-content: start;
  gap: 8px;
  min-height: 0;
  overflow: auto;
}

/** 人物列表条目按钮。 */
.character-list-item {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 10px 11px;
  color: #24313d;
  text-align: left;
  background: #f8fafc;
  border: 1px solid #dce4ee;
  border-radius: 6px;
  cursor: grab;
}

.character-list-item:hover,
.character-list-item.is-active {
  background: #eef6ff;
  border-color: #7aa7d9;
}

.character-list-item.is-dragging {
  opacity: 0.52;
}

.character-list-item.is-drop-target {
  background: #e5f1ff;
  border-color: #2f80ed;
}

.character-list-item.is-drop-before {
  box-shadow: inset 0 3px 0 #2f80ed;
}

.character-list-item.is-drop-after {
  box-shadow: inset 0 -3px 0 #2f80ed;
}

/** 拖拽把手视觉区域。 */
.character-drag-handle {
  color: #8a98a8;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1;
  text-align: center;
}

/** 人物列表条目文本内容。 */
.character-list-content {
  display: grid;
  gap: 4px;
  min-width: 0;
}

/** 人物列表名称。 */
.character-list-name {
  overflow: hidden;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/** 人物列表摘要。 */
.character-list-meta {
  overflow: hidden;
  color: #687684;
  font-size: 12px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/** 右侧 Inspector 面板。 */
.character-inspector {
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

/** 人物 ID 展示。 */
.inspector-id {
  font-size: 12px;
  line-height: 1.2;
}

/** Inspector 人物标题。 */
.inspector-title {
  margin: 0;
  color: #17212b;
  font-size: 24px;
  line-height: 1.25;
}

/** 多行文本字段展示。 */
.inspector-paragraph {
  max-width: 100%;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

/** 自定义字段区域。 */
.custom-fields {
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

/** 自定义字段表格。 */
.custom-field-table {
  display: grid;
  border: 1px solid #dce4ee;
  border-radius: 6px;
  overflow: hidden;
}

/** 自定义字段单行。 */
.custom-field-item {
  display: grid;
  grid-template-columns: minmax(120px, 220px) minmax(0, 1fr);
  border-bottom: 1px solid #e6edf5;
}

.custom-field-item:last-child {
  border-bottom: 0;
}

/** 自定义字段 key。 */
.custom-field-key {
  padding: 10px 12px;
  color: #465260;
  background: #f8fafc;
  border-right: 1px solid #e6edf5;
  font-weight: 600;
  line-height: 1.5;
  word-break: break-word;
}

/** 自定义字段 value。 */
.custom-field-value {
  min-width: 0;
  margin: 0;
  padding: 10px 12px;
  color: #24313d;
  font-family: inherit;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
