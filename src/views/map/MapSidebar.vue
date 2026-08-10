<script setup lang="ts">
/**
 * 地图模块左侧面板组件。
 * 负责展示地图层级、搜索框和当前地图地点列表。
 */
import type { MapPin } from '@/types';
import type { MapTreeItem } from './useMapWorkbench';

defineProps<{
  /** 地图树渲染项。 */
  mapTreeItems: MapTreeItem[];
  /** 当前地图 ID。 */
  currentMapId: string;
  /** 当前地图经过搜索过滤后的 pin 列表。 */
  filteredCurrentPins: MapPin[];
  /** 当前选中 pin ID。 */
  selectedPinId: string;
  /** 搜索关键字。 */
  searchKeyword: string;
  /** 是否正在加载。 */
  isLoading: boolean;
  /** 当前是否存在可编辑地图。 */
  hasCurrentMap: boolean;
  /** 根据地点 ID 获取地点名称。 */
  getLocationName: (locationId: string) => string;
  /** 根据地点 ID 获取地点类型。 */
  getLocationType: (locationId: string) => string;
  /** 判断地点是否拥有子地图。 */
  hasChildMap: (locationId: string) => boolean;
}>();

const emit = defineEmits<{
  /** 更新搜索关键字。 */
  'update:searchKeyword': [value: string];
  /** 开始新增地点。 */
  beginPlaceLocation: [];
  /** 刷新地图数据。 */
  reload: [];
  /** 打开地图。 */
  openMap: [mapId: string];
  /** 选中 pin。 */
  selectPin: [pinId: string];
}>();
</script>

<template>
  <aside class="map-sidebar">
    <div class="panel-heading">
      <span class="eyebrow">地图层级</span>
      <h2>地点地图</h2>
    </div>

    <div class="map-actions">
      <n-button
        size="small"
        type="primary"
        :disabled="isLoading || !hasCurrentMap"
        @click="emit('beginPlaceLocation')"
      >
        新增地点
      </n-button>
      <n-button size="small" :loading="isLoading" @click="emit('reload')">刷新</n-button>
    </div>

    <input
      class="search-box"
      type="text"
      placeholder="搜索地点、自定义信息"
      :value="searchKeyword"
      @input="emit('update:searchKeyword', ($event.target as HTMLInputElement).value)"
    />

    <div class="tree-list">
      <button
        v-for="item in mapTreeItems"
        :key="item.map.id"
        class="tree-item"
        :class="{ active: item.map.id === currentMapId }"
        :style="{ paddingLeft: `${12 + item.depth * 18}px` }"
        type="button"
        @click="emit('openMap', item.map.id)"
      >
        <span class="tree-dot" />
        <span>{{ item.map.name }}</span>
      </button>
    </div>

    <div class="section-title">当前地图地点</div>
    <div class="pin-list">
      <button
        v-for="pin in filteredCurrentPins"
        :key="pin.id"
        class="pin-list-item"
        :class="{ active: pin.id === selectedPinId }"
        type="button"
        @click="emit('selectPin', pin.id)"
      >
        <span class="pin-color" :style="{ backgroundColor: pin.color }" />
        <span>
          <strong>{{ getLocationName(pin.locationId) }}</strong>
          <small>{{ hasChildMap(pin.locationId) ? '含子地图' : getLocationType(pin.locationId) }}</small>
        </span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.map-sidebar {
  min-height: 0;
  padding: 16px;
  overflow: auto;
  border: 1px solid #d7dee8;
  border-radius: 8px;
  background: #ffffff;
}

.panel-heading {
  display: grid;
  gap: 6px;
  margin-bottom: 14px;
}

.eyebrow {
  color: #64748b;
  font-size: 12px;
  line-height: 1;
}

.panel-heading h2 {
  margin: 0;
  color: #0f172a;
  font-size: 20px;
  line-height: 1.2;
}

.map-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.search-box {
  width: 100%;
  height: 34px;
  margin: 16px 0;
  padding: 8px 10px;
  border: 1px solid #dbe3ee;
  border-radius: 6px;
  color: #334155;
  background: #f8fafc;
  font-size: 13px;
}

.tree-list,
.pin-list {
  display: grid;
  gap: 6px;
}

.tree-item,
.pin-list-item {
  width: 100%;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #334155;
  cursor: pointer;
  text-align: left;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding-right: 10px;
}

.tree-item.active,
.pin-list-item.active {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
}

.tree-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #94a3b8;
}

.section-title {
  margin: 20px 0 10px;
  color: #475569;
  font-size: 13px;
  font-weight: 700;
}

.pin-list-item {
  display: flex;
  gap: 10px;
  padding: 10px;
}

.pin-list-item strong,
.pin-list-item small {
  display: block;
}

.pin-list-item small {
  margin-top: 3px;
  color: #64748b;
  font-size: 12px;
}

.pin-color {
  width: 12px;
  height: 12px;
  flex: 0 0 auto;
  margin-top: 3px;
  border-radius: 999px;
}
</style>
