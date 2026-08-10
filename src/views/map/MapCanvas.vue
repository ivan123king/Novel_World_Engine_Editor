<script setup lang="ts">
/**
 * 地图模块中间画布组件。
 * 负责渲染面包屑、地图标题、Konva 画布、地点 pin 和浮动工具条。
 */
import type { CSSProperties } from 'vue';
import type { LocationFile, MapFile, MapPin, MapViewport } from '@/types';
import {
  MAP_HIT_AREA,
  MAP_STAGE_SIZE,
  type KonvaDragEvent,
  type KonvaPointerEvent,
  type KonvaWheelEvent,
} from './useMapWorkbench';

defineProps<{
  /** 当前地图。 */
  currentMap: MapFile | null;
  /** 当前地图根地点。 */
  rootLocation: LocationFile | null;
  /** 面包屑地图链。 */
  breadcrumbs: MapFile[];
  /** 当前地图 pin 列表。 */
  currentPins: MapPin[];
  /** 当前选中 pin ID。 */
  selectedPinId: string;
  /** 当前地图 viewport。 */
  viewport: MapViewport;
  /** 浮动工具条位置。 */
  floatingToolbarStyle: CSSProperties;
  /** 是否正在新增地点。 */
  isPlacingLocation: boolean;
  /** 是否正在保存。 */
  isSaving: boolean;
  /** 加载错误。 */
  loadError: string;
  /** 保存错误。 */
  saveError: string;
  /** 文件错误列表。 */
  fileErrors: string[];
  /** 当前选中地点。 */
  hasSelectedLocation: boolean;
  /** 当前选中地点 ID。 */
  selectedLocationId: string | null;
  /** 根据地点 ID 获取地点名称。 */
  getLocationName: (locationId: string) => string;
  /** 判断地点是否拥有子地图。 */
  hasChildMap: (locationId: string) => boolean;
}>();

const emit = defineEmits<{
  /** 打开地图。 */
  openMap: [mapId: string];
  /** 点击画布。 */
  stageClick: [event: KonvaPointerEvent];
  /** 滚轮缩放画布。 */
  stageWheel: [event: KonvaWheelEvent];
  /** 拖拽画布场景结束。 */
  sceneDragEnd: [event: KonvaDragEvent];
  /** 选中 pin。 */
  pinClick: [pinId: string, event: KonvaPointerEvent];
  /** 双击进入子地图。 */
  openChildMap: [locationId: string];
  /** pin 拖拽结束。 */
  pinDragEnd: [pinId: string, event: KonvaDragEvent];
  /** 编辑当前地点。 */
  edit: [];
  /** 删除当前地点。 */
  delete: [];
  /** 创建子地图。 */
  createChildMap: [];
}>();

const stageConfig = {
  width: MAP_STAGE_SIZE.width,
  height: MAP_STAGE_SIZE.height,
};
</script>

<template>
  <main class="map-canvas-shell">
    <header class="canvas-header">
      <div>
        <div class="breadcrumbs">
          <button
            v-for="breadcrumb in breadcrumbs"
            :key="breadcrumb.id"
            type="button"
            @click="emit('openMap', breadcrumb.id)"
          >
            {{ breadcrumb.name }}
          </button>
        </div>
        <h2>{{ currentMap?.name ?? '地图加载中' }}</h2>
        <p>
          <span v-if="isPlacingLocation">点击画布空白处放置新地点。</span>
          <span v-else>{{ rootLocation?.description || '当前地图暂无说明。' }}</span>
        </p>
      </div>
    </header>

    <div class="status-strip" v-if="loadError || saveError || fileErrors.length || isSaving">
      <span v-if="isSaving">正在保存...</span>
      <span v-if="loadError">{{ loadError }}</span>
      <span v-if="saveError">{{ saveError }}</span>
      <span v-if="fileErrors.length">有 {{ fileErrors.length }} 个 JSON 文件读取失败。</span>
    </div>

    <div class="stage-frame">
      <div v-if="hasSelectedLocation" class="stage-toolbar" :style="floatingToolbarStyle">
        <button type="button" @click="emit('edit')">编辑</button>
        <button type="button" @click="emit('delete')">删除</button>
        <button
          v-if="selectedLocationId && hasChildMap(selectedLocationId)"
          type="button"
          @click="emit('openChildMap', selectedLocationId)"
        >
          进入
        </button>
        <button v-else type="button" @click="emit('createChildMap')">子地图</button>
      </div>

      <v-stage
        :config="stageConfig"
        @click="emit('stageClick', $event)"
        @wheel="emit('stageWheel', $event)"
      >
        <v-layer>
          <v-group
            :config="{
              x: viewport.x,
              y: viewport.y,
              scaleX: viewport.scale,
              scaleY: viewport.scale,
              draggable: !isPlacingLocation,
            }"
            @dragend="emit('sceneDragEnd', $event)"
          >
            <v-rect
              :config="{
                x: MAP_HIT_AREA.x,
                y: MAP_HIT_AREA.y,
                width: MAP_HIT_AREA.width,
                height: MAP_HIT_AREA.height,
                fill: 'rgba(255,255,255,0.01)',
              }"
            />

            <v-group
              v-for="pin in currentPins"
              :key="pin.id"
              :config="{ x: pin.x, y: pin.y, draggable: true }"
              @click="emit('pinClick', pin.id, $event)"
              @dblclick="emit('openChildMap', pin.locationId)"
              @dragend="($event.cancelBubble = true), emit('pinDragEnd', pin.id, $event)"
            >
              <v-circle
                v-if="hasChildMap(pin.locationId)"
                :config="{
                  x: 0,
                  y: 0,
                  radius: pin.id === selectedPinId ? 30 : 26,
                  stroke: pin.color,
                  strokeWidth: 2,
                  fill: 'rgba(255, 255, 255, 0.9)',
                }"
              />
              <v-circle
                :config="{
                  x: 0,
                  y: 0,
                  radius: pin.id === selectedPinId ? 20 : 16,
                  fill: pin.color,
                  stroke: pin.id === selectedPinId ? '#0f172a' : '#ffffff',
                  strokeWidth: pin.id === selectedPinId ? 4 : 3,
                  shadowColor: '#0f172a',
                  shadowBlur: pin.id === selectedPinId ? 12 : 5,
                  shadowOpacity: pin.id === selectedPinId ? 0.24 : 0.12,
                }"
              />
              <v-text
                v-if="pin.showLabel"
                :config="{
                  x: -56,
                  y: 28,
                  width: 112,
                  text: getLocationName(pin.locationId),
                  align: 'center',
                  fill: '#0f172a',
                  fontSize: 16,
                  fontStyle: pin.id === selectedPinId ? 'bold' : 'normal',
                  fontFamily: 'Microsoft YaHei, Segoe UI, sans-serif',
                }"
              />
              <v-text
                v-if="hasChildMap(pin.locationId)"
                :config="{
                  x: 14,
                  y: -31,
                  width: 28,
                  text: '子',
                  align: 'center',
                  fill: '#ffffff',
                  fontSize: 12,
                  fontStyle: 'bold',
                  fontFamily: 'Microsoft YaHei, Segoe UI, sans-serif',
                }"
              />
            </v-group>
          </v-group>
        </v-layer>
      </v-stage>
    </div>
  </main>
</template>

<style scoped>
.map-canvas-shell {
  display: grid;
  grid-template-rows: auto auto 1fr;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #d7dee8;
  border-radius: 8px;
  background: #ffffff;
}

.canvas-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border-bottom: 1px solid #e2e8f0;
}

.canvas-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 20px;
  line-height: 1.2;
}

.canvas-header p {
  max-width: 680px;
  margin-top: 8px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.breadcrumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.breadcrumbs button {
  border: 0;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
  font-size: 13px;
}

.breadcrumbs button:not(:last-child)::after {
  margin-left: 6px;
  color: #94a3b8;
  content: '/';
}

.status-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 8px 18px;
  border-bottom: 1px solid #fde68a;
  background: #fffbeb;
  color: #92400e;
  font-size: 13px;
}

.stage-frame {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 0;
  padding: 18px;
  overflow: auto;
  background: #edf2f7;
}

.stage-frame :deep(canvas) {
  border-radius: 8px;
  cursor: grab;
}

.stage-frame :deep(canvas:active) {
  cursor: grabbing;
}

.stage-toolbar {
  position: absolute;
  z-index: 5;
  display: flex;
  gap: 6px;
  padding: 6px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
}

.stage-toolbar button {
  min-width: 48px;
  height: 28px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
  font-size: 13px;
}
</style>
