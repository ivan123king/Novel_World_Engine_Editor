<script setup lang="ts">
/**
 * 物品模块页面。
 * 提供真实 JSON 文件驱动的物品列表、搜索、Inspector 查看、新建、编辑、复制和删除能力。
 */
import { onMounted } from 'vue';
import AppModal from '@/components/common/AppModal.vue';
import { useItemList } from '@/views/items/useItemList';
import type { JsonValue } from '@/types';

const {
  items,
  filteredItems,
  selectedItem,
  selectedItemId,
  selectedCustomFields,
  searchKeyword,
  formValues,
  formMode,
  isCreateModalOpen,
  isEditModalOpen,
  isLoading,
  isSaving,
  loadError,
  saveError,
  fileErrors,
  dataDirectory,
  duplicateFieldKeys,
  hasDuplicateKeys,
  canSubmitForm,
  isEmpty,
  isSearchEmpty,
  hasErrorMessage,
  loadItems,
  isDuplicateFieldKey,
  openCreate,
  openEdit,
  closeForm,
  addCustomField,
  removeCustomField,
  submitForm,
  deleteItem,
  duplicateItem,
} = useItemList();

/**
 * 格式化自定义字段值用于 Inspector 展示。
 * @param value 自定义字段值
 */
function formatCustomFieldValue(value: JsonValue): string {
  return typeof value === 'string' ? value || '未填写' : JSON.stringify(value, null, 2);
}

/** 页面挂载后从本地 JSON 目录读取物品文件。 */
onMounted(() => {
  void loadItems();
});
</script>

<template>
  <section class="item-page">
    <!-- 页面工具栏：显示当前数据目录、读写状态和主要操作入口。 -->
    <header class="item-toolbar">
      <div class="item-title-group">
        <h2 class="item-title">物品</h2>
        <n-text depth="3" class="item-subtitle">
          {{ dataDirectory || '正在读取数据目录...' }}
        </n-text>
      </div>

      <n-space align="center" size="small">
        <n-tag size="small" round>{{ items.length }} 个</n-tag>
        <n-button size="small" :loading="isLoading" @click="loadItems">
          刷新
        </n-button>
        <n-button type="primary" size="small" :disabled="isSaving" @click="openCreate">
          新建物品
        </n-button>
      </n-space>
    </header>

    <!-- 错误提示：读写错误和坏文件提示不吞掉，便于用户修复本地 JSON。 -->
    <div v-if="hasErrorMessage" class="item-error-panel">
      <p v-if="loadError">{{ loadError }}</p>
      <p v-if="saveError">{{ saveError }}</p>
      <p v-for="fileError in fileErrors" :key="fileError">
        {{ fileError }}
      </p>
    </div>

    <div class="item-workspace">
      <!-- 左侧物品列表：搜索和选择物品。 -->
      <aside class="item-list-panel" aria-label="物品列表">
        <n-input
          v-model:value="searchKeyword"
          placeholder="搜索名称或自定义属性"
          clearable
          :disabled="isLoading"
        />

        <div class="item-list">
          <button
            v-for="item in filteredItems"
            :key="item.id"
            class="item-list-row"
            :class="{ 'is-active': selectedItem?.id === item.id }"
            type="button"
            @click="selectedItemId = item.id"
          >
            <span class="item-list-name">{{ item.name }}</span>
            <span class="item-list-meta">{{ Object.keys(item.customFields).length }} 个自定义属性</span>
          </button>

          <n-empty v-if="isEmpty" description="暂无物品，点击右上角新建物品" />
          <n-empty v-if="isSearchEmpty" description="没有匹配的物品" />
        </div>
      </aside>

      <!-- 右侧 Inspector：参考人物页面样式展示名称和自定义属性。 -->
      <section class="item-inspector" aria-label="物品 Inspector">
        <div v-if="selectedItem" class="inspector-content">
          <div class="inspector-header">
            <div class="inspector-title-group">
              <n-text depth="3" class="inspector-id">
                {{ selectedItem.id }}
              </n-text>
              <h3 class="inspector-title">{{ selectedItem.name }}</h3>
            </div>

            <n-space size="small" wrap>
              <n-button size="small" :disabled="isSaving" @click="openEdit(selectedItem)">
                编辑
              </n-button>
              <n-button size="small" :disabled="isSaving" @click="duplicateItem(selectedItem)">
                复制
              </n-button>
              <n-button
                size="small"
                type="error"
                :disabled="isSaving"
                @click="deleteItem(selectedItem.id)"
              >
                删除
              </n-button>
            </n-space>
          </div>

          <n-descriptions :column="1" bordered label-placement="left" size="medium">
            <n-descriptions-item label="名称" label-style="width: 88px">
              {{ selectedItem.name }}
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

        <n-empty v-else description="从左侧选择物品，或新建一个物品" />
      </section>
    </div>

    <!-- 物品表单弹框：提交后写入 data/items/*.json。 -->
    <AppModal
      :open="isCreateModalOpen || isEditModalOpen"
      :title="formMode === 'create' ? '新建物品' : '编辑物品'"
      :width="660"
      @close="closeForm"
    >
      <n-form label-placement="top" label-align="text">
        <n-form-item label="名称" required>
          <n-input
            v-model:value="formValues.name"
            placeholder="请输入物品名称，例如：屠龙刀"
            clearable
          />
        </n-form-item>

        <n-divider />

        <div class="custom-fields-header">
          <n-text strong>自定义属性</n-text>
          <n-button type="primary" text @click="addCustomField">
            + 添加属性
          </n-button>
        </div>

        <div v-if="hasDuplicateKeys" class="duplicate-warning">
          存在重复 key：{{ duplicateFieldKeys.join('、') }}。请修改后再保存。
        </div>

        <div class="custom-field-editor">
          <div
            v-for="(field, index) in formValues.customFields"
            :key="field.id"
            class="custom-field-row"
            :class="{ 'has-duplicate-key': isDuplicateFieldKey(field.key) }"
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
/** 物品页面整体布局，沿用人物模块的工作台密度。 */
.item-page {
  display: grid;
  gap: 16px;
  min-height: calc(100vh - 124px);
}

/** 页面顶部工具栏。 */
.item-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

/** 标题和说明文本区域。 */
.item-title-group {
  display: grid;
  gap: 4px;
  min-width: 0;
}

/** 页面标题。 */
.item-title {
  margin: 0;
  color: #17212b;
  font-size: 22px;
  line-height: 1.25;
}

/** 页面阶段说明。 */
.item-subtitle {
  max-width: 720px;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/** 文件读写错误展示区。 */
.item-error-panel {
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
.item-workspace {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 16px;
  min-height: 0;
}

/** 左侧物品列表面板。 */
.item-list-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  min-height: 0;
  padding: 14px;
  background: #ffffff;
  border: 1px solid #d9e1ea;
  border-radius: 8px;
}

/** 物品列表滚动容器。 */
.item-list {
  display: grid;
  align-content: start;
  gap: 8px;
  min-height: 0;
  overflow: auto;
}

/** 物品列表行按钮。 */
.item-list-row {
  display: grid;
  gap: 4px;
  width: 100%;
  padding: 10px 11px;
  color: #24313d;
  text-align: left;
  background: #f8fafc;
  border: 1px solid #dce4ee;
  border-radius: 6px;
  cursor: pointer;
}

.item-list-row:hover,
.item-list-row.is-active {
  background: #eef6ff;
  border-color: #7aa7d9;
}

/** 物品列表名称。 */
.item-list-name {
  overflow: hidden;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/** 物品列表摘要。 */
.item-list-meta {
  overflow: hidden;
  color: #687684;
  font-size: 12px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/** 右侧 Inspector 面板。 */
.item-inspector {
  min-width: 0;
  min-height: 0;
  padding: 18px;
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

/** 物品 ID 展示。 */
.inspector-id {
  font-size: 12px;
  line-height: 1.2;
}

/** Inspector 物品标题。 */
.inspector-title {
  margin: 0;
  color: #17212b;
  font-size: 24px;
  line-height: 1.25;
}

/** 自定义字段区域。 */
.custom-fields {
  display: grid;
  gap: 12px;
}

/** 区块标题栏。 */
.section-heading,
.custom-fields-header {
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

/** 自定义字段展示行。 */
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

/** 重复 key 提示。 */
.duplicate-warning {
  margin-bottom: 12px;
  padding: 9px 11px;
  color: #9f3a2f;
  background: #fff1ef;
  border: 1px solid #f0c4bf;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.5;
}

/** 自定义属性编辑列表。 */
.custom-field-editor {
  display: grid;
  gap: 12px;
}

/** 单条自定义属性输入行。 */
.custom-field-row {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) 18px minmax(120px, 1fr) 34px;
  gap: 10px;
  align-items: center;
}

/** 重复 key 行的视觉提示。 */
.custom-field-row.has-duplicate-key :deep(.n-input-wrapper) {
  border-color: #d03050;
}

/** 自定义属性 key/value 之间的等号。 */
.custom-field-equals {
  color: #8a929b;
  font-size: 18px;
  font-weight: 600;
  text-align: center;
}

/** 自定义属性删除按钮。 */
.custom-field-remove {
  width: 32px;
  height: 32px;
  font-size: 22px;
}

/** 弹框底部按钮栏。 */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
