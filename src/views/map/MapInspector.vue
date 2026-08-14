<script setup lang="ts">
/**
 * 地图模块右侧 Inspector 组件。
 * 负责展示和编辑当前选中地点的基础信息与自定义字段。
 */
import type { LocationFile, MapFile } from '@/types';
import {
  getLocationCustomFieldEntries,
  stringifyFieldValue,
  type LocationFormValues,
} from './useMapWorkbench';

defineProps<{
  /** 当前选中地点。 */
  selectedLocation: LocationFile | null;
  /** 当前地图的子地图列表。 */
  childMaps: MapFile[];
  /** 地点编辑表单。 */
  locationForm: LocationFormValues;
  /** Inspector 模式。 */
  inspectorMode: 'detail' | 'edit';
  /** 是否正在放置地点。 */
  isPlacingLocation: boolean;
  /** 是否正在保存。 */
  isSaving: boolean;
  /** 表单是否可保存。 */
  canSaveLocationForm: boolean;
  /** 重复字段 key。 */
  duplicateFieldKeys: string[];
  /** 判断地点是否拥有子地图。 */
  hasChildMap: (locationId: string) => boolean;
  /** 判断字段 key 是否重复。 */
  isDuplicateFieldKey: (key: string) => boolean;
}>();

const emit = defineEmits<{
  /** 打开地图。 */
  openMap: [mapId: string];
  /** 打开子地图。 */
  openChildMap: [locationId: string];
  /** 创建子地图。 */
  createChildMap: [];
  /** 进入编辑模式。 */
  edit: [];
  /** 保存表单。 */
  save: [];
  /** 取消编辑。 */
  cancel: [];
  /** 新增自定义字段。 */
  addCustomField: [];
  /** 删除自定义字段。 */
  removeCustomField: [index: number];
}>();
</script>

<template>
  <aside class="map-inspector">
    <div v-if="selectedLocation" class="inspector-content">
      <div class="panel-heading">
        <h2>{{ selectedLocation.name.trim() === '未命名地点' ? '新地点' : selectedLocation.name.trim() || '新地点' }}</h2>
      </div>

      <div class="tag-row">
        <n-tag size="small" type="info">{{ selectedLocation.type || '地点' }}</n-tag>
        <n-tag v-if="hasChildMap(selectedLocation.id)" size="small" type="success">含子地图</n-tag>
      </div>

      <div v-if="inspectorMode === 'detail'" class="field-stack">
        <section>
          <h3>介绍</h3>
          <p>{{ selectedLocation.description || '暂无介绍。' }}</p>
        </section>

        <section>
          <h3>自定义信息</h3>
          <dl v-if="getLocationCustomFieldEntries(selectedLocation).length" class="custom-fields">
            <template v-for="[key, value] in getLocationCustomFieldEntries(selectedLocation)" :key="key">
              <dt>{{ key }}</dt>
              <dd>{{ stringifyFieldValue(value) }}</dd>
            </template>
          </dl>
          <p v-else>暂无自定义信息。</p>
        </section>
      </div>

      <div v-else class="field-stack">
        <label>
          地点名称
          <input v-model="locationForm.name" type="text" placeholder="请输入地点名称" />
        </label>
        <label>
          地点类型
          <input v-model="locationForm.type" type="text" placeholder="地点" />
        </label>
        <label>
          地点介绍
          <textarea v-model="locationForm.description" rows="5" />
        </label>

        <section class="custom-field-editor">
          <div class="custom-field-heading">
            <h3>自定义字段</h3>
            <button type="button" @click="emit('addCustomField')">新增字段</button>
          </div>
          <div
            v-for="(row, index) in locationForm.customFields"
            :key="row.id"
            class="custom-field-row"
            :class="{ duplicate: isDuplicateFieldKey(row.key) }"
          >
            <input v-model="row.key" type="text" placeholder="字段名" />
            <textarea v-model="row.value" rows="3" placeholder="字段值" />
            <button type="button" @click="emit('removeCustomField', index)">删除</button>
          </div>
          <div v-if="duplicateFieldKeys.length" class="edit-note">
            自定义字段名重复：{{ duplicateFieldKeys.join('、') }}
          </div>
        </section>
      </div>

      <div class="inspector-actions">
        <template v-if="inspectorMode === 'detail'">
          <n-button type="primary" :disabled="isSaving" @click="emit('edit')">编辑地点</n-button>
          <n-button v-if="hasChildMap(selectedLocation.id)" @click="emit('openChildMap', selectedLocation.id)">
            进入子地图
          </n-button>
          <n-button v-else :disabled="isSaving" @click="emit('createChildMap')">创建子地图</n-button>
        </template>
        <template v-else>
          <n-button type="primary" :loading="isSaving" :disabled="!canSaveLocationForm" @click="emit('save')">
            保存
          </n-button>
          <n-button :disabled="isSaving" @click="emit('cancel')">取消</n-button>
        </template>
      </div>
    </div>

    <div v-else class="empty-inspector">
      <h2>未选择地点</h2>
      <p v-if="isPlacingLocation">点击地图画布放置新地点。</p>
      <p v-else>点击地图上的圆点后，在这里查看地点信息。</p>
    </div>
  </aside>
</template>

<style scoped>
.map-inspector {
  min-height: 0;
  padding: 16px;
  overflow: auto;
  border: 1px solid #d7dee8;
  border-radius: 8px;
  background: #ffffff;
}

.inspector-content,
.field-stack {
  display: grid;
  gap: 16px;
}

.panel-heading {
  display: grid;
  gap: 6px;
  margin-bottom: 14px;
}

.panel-heading h2,
.empty-inspector h2 {
  margin: 0;
  color: #0f172a;
  font-size: 20px;
  line-height: 1.2;
}

.tag-row,
.inspector-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.field-stack section {
  display: grid;
  gap: 8px;
}

.field-stack h3 {
  color: #334155;
  font-size: 14px;
}

.field-stack p,
.empty-inspector p {
  color: #475569;
  font-size: 14px;
  line-height: 1.7;
}

.custom-fields {
  display: grid;
  gap: 10px;
  margin: 0;
}

.custom-fields dt {
  color: #64748b;
  font-size: 12px;
}

.custom-fields dd {
  margin: -6px 0 0;
  padding: 9px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #f8fafc;
  color: #1e293b;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.sub-map-button {
  width: 100%;
  padding: 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #334155;
  cursor: pointer;
  text-align: left;
}

.sub-map-button:hover {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
}

.field-stack label {
  display: grid;
  gap: 7px;
  color: #475569;
  font-size: 13px;
}

.field-stack input,
.field-stack textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 9px 10px;
  color: #172033;
  font: inherit;
}

.custom-field-editor {
  display: grid;
  gap: 10px;
}

.custom-field-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.custom-field-heading button,
.custom-field-row button {
  height: 30px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
}

.custom-field-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: start;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.custom-field-row textarea {
  grid-column: 1 / -1;
  min-height: 72px;
  resize: vertical;
}

.custom-field-row.duplicate input {
  border-color: #dc2626;
}

.edit-note {
  padding: 10px;
  border-radius: 6px;
  background: #fffbeb;
  color: #92400e;
  font-size: 13px;
  line-height: 1.5;
}

.empty-inspector {
  display: grid;
  gap: 10px;
}
</style>
