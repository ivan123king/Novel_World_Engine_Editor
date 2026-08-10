<script setup lang="ts">
/**
 * 地图模块入口页面。
 * 页面只负责组合左侧地图树、中间 Konva 画布和右侧 Inspector，具体状态与动作在 useMapWorkbench 中维护。
 */
import MapCanvas from '@/views/map/MapCanvas.vue';
import MapInspector from '@/views/map/MapInspector.vue';
import MapSidebar from '@/views/map/MapSidebar.vue';
import { useMapWorkbench } from '@/views/map/useMapWorkbench';

const mapWorkbench = useMapWorkbench();
</script>

<template>
  <section class="map-page">
    <MapSidebar
      v-model:search-keyword="mapWorkbench.searchKeyword.value"
      :map-tree-items="mapWorkbench.mapTreeItems.value"
      :current-map-id="mapWorkbench.currentMap.value?.id ?? ''"
      :filtered-current-pins="mapWorkbench.filteredCurrentPins.value"
      :selected-pin-id="mapWorkbench.selectedPinId.value"
      :is-loading="mapWorkbench.isLoading.value"
      :has-current-map="Boolean(mapWorkbench.currentMap.value)"
      :get-location-name="mapWorkbench.getLocationName"
      :get-location-type="mapWorkbench.getLocationType"
      :has-child-map="mapWorkbench.hasChildMap"
      @begin-place-location="mapWorkbench.beginPlaceLocation"
      @reload="mapWorkbench.loadMaps"
      @open-map="mapWorkbench.openMap"
      @select-pin="mapWorkbench.handlePinClick"
    />

    <MapCanvas
      :current-map="mapWorkbench.currentMap.value"
      :root-location="mapWorkbench.rootLocation.value"
      :breadcrumbs="mapWorkbench.breadcrumbs.value"
      :current-pins="mapWorkbench.currentPins.value"
      :selected-pin-id="mapWorkbench.selectedPinId.value"
      :viewport="mapWorkbench.currentViewport.value"
      :grid-lines="mapWorkbench.gridLines.value"
      :floating-toolbar-style="mapWorkbench.floatingToolbarStyle.value"
      :is-placing-location="mapWorkbench.isPlacingLocation.value"
      :is-saving="mapWorkbench.isSaving.value"
      :load-error="mapWorkbench.loadError.value"
      :save-error="mapWorkbench.saveError.value"
      :file-errors="mapWorkbench.fileErrors.value"
      :has-selected-location="Boolean(mapWorkbench.selectedLocation.value)"
      :selected-location-id="mapWorkbench.selectedLocation.value?.id ?? null"
      :get-location-name="mapWorkbench.getLocationName"
      :has-child-map="mapWorkbench.hasChildMap"
      @open-map="mapWorkbench.openMap"
      @stage-click="mapWorkbench.handleStageClick"
      @scene-drag-end="mapWorkbench.handleSceneDragEnd"
      @pin-click="mapWorkbench.handlePinClick"
      @open-child-map="mapWorkbench.openChildMap"
      @pin-drag-end="mapWorkbench.handlePinDragEnd"
      @edit="mapWorkbench.startEdit"
      @delete="mapWorkbench.deleteSelectedLocation"
      @create-child-map="mapWorkbench.createChildMapForSelectedLocation"
    />

    <MapInspector
      :selected-location="mapWorkbench.selectedLocation.value"
      :child-maps="mapWorkbench.childMaps.value"
      :location-form="mapWorkbench.locationForm"
      :inspector-mode="mapWorkbench.inspectorMode.value"
      :is-placing-location="mapWorkbench.isPlacingLocation.value"
      :is-saving="mapWorkbench.isSaving.value"
      :can-save-location-form="mapWorkbench.canSaveLocationForm.value"
      :duplicate-field-keys="mapWorkbench.duplicateFieldKeys.value"
      :has-child-map="mapWorkbench.hasChildMap"
      :is-duplicate-field-key="mapWorkbench.isDuplicateFieldKey"
      @open-map="mapWorkbench.openMap"
      @open-child-map="mapWorkbench.openChildMap"
      @create-child-map="mapWorkbench.createChildMapForSelectedLocation"
      @edit="mapWorkbench.startEdit"
      @save="mapWorkbench.submitLocationForm"
      @cancel="mapWorkbench.cancelEdit"
      @add-custom-field="mapWorkbench.addCustomField"
      @remove-custom-field="mapWorkbench.removeCustomField"
    />
  </section>
</template>

<style scoped>
.map-page {
  display: grid;
  grid-template-columns: 260px minmax(560px, 1fr) 320px;
  gap: 16px;
  min-height: calc(100vh - 124px);
  color: #172033;
}
</style>
