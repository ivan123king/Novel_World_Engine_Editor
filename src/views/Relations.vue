<script setup lang="ts">
/**
 * 关系图谱模块主视图。
 * 作为页面组合层连接关系图谱 composable、三栏工作区和表单弹窗。
 */
import { onMounted } from 'vue';
import RelationBlockPanel from '@/views/relation/RelationBlockPanel.vue';
import RelationEdgeFormModal from '@/views/relation/RelationEdgeFormModal.vue';
import RelationGraphCanvas from '@/views/relation/RelationGraphCanvas.vue';
import RelationGraphFormModal from '@/views/relation/RelationGraphFormModal.vue';
import RelationHistoryFormModal from '@/views/relation/RelationHistoryFormModal.vue';
import RelationNodeFormModal from '@/views/relation/RelationNodeFormModal.vue';
import RelationTimelinePanel from '@/views/relation/RelationTimelinePanel.vue';
import RelationToolbar from '@/views/relation/RelationToolbar.vue';
import { useRelationGraphEditor } from '@/views/relation/useRelationGraphEditor';

const {
  CANVAS_WIDTH,
  NODE_WIDTH,
  NODE_HEIGHT,
  currentGraphId,
  searchKeyword,
  selectedNodeId,
  selectedEdgeId,
  isLoading,
  isSaving,
  loadError,
  saveError,
  fileErrors,
  draggingNodeId,
  dragOverNodeId,
  blockDropPlacement,
  isGraphModalOpen,
  graphFormMode,
  graphForm,
  isNodeModalOpen,
  nodeFormMode,
  nodeForm,
  isEdgeModalOpen,
  edgeFormMode,
  edgeForm,
  isHistoryModalOpen,
  historyFormMode,
  historyForm,
  currentGraph,
  isCharacterDefaultGraph,
  customGraphs,
  filteredNodes,
  selectedNode,
  selectedEdge,
  visibleTreeNodes,
  visibleTreeEdges,
  treeCanvasHeight,
  selectionMode,
  selectedEdgeHistory,
  graphSummary,
  hasErrorMessage,
  edgeTargetNodes,
  duplicateEdgeMessage,
  canSubmitGraphForm,
  canSubmitNodeForm,
  canSubmitEdgeForm,
  canSubmitHistoryForm,
  formatScore,
  loadRelationGraphModule,
  getEdgeFromNode,
  getEdgeToNode,
  selectNode,
  selectTreeNode,
  selectEdge,
  openCreateGraph,
  openRenameCurrentGraph,
  closeGraphModal,
  submitGraphForm,
  deleteCurrentGraph,
  openCreateNode,
  openRenameSelectedNode,
  closeNodeModal,
  submitNodeForm,
  deleteSelectedNode,
  openCreateEdge,
  openEditSelectedEdge,
  closeEdgeModal,
  submitEdgeForm,
  openCreateHistory,
  openEditHistory,
  closeHistoryModal,
  submitHistoryForm,
  deleteHistory,
  deleteSelectedEdge,
  startBlockDrag,
  hoverBlockDropTarget,
  dropBlockOn,
  resetBlockDrag,
} = useRelationGraphEditor();

/** 页面挂载后从当前小说项目读取关系图谱 JSON。 */
onMounted(() => {
  void loadRelationGraphModule();
});
</script>

<template>
  <section class="relation-page">
    <RelationToolbar
      v-model:current-graph-id="currentGraphId"
      :current-graph="currentGraph"
      :custom-graphs="customGraphs"
      :is-loading="isLoading"
      :is-saving="isSaving"
      :is-character-default-graph="isCharacterDefaultGraph"
      @refresh="loadRelationGraphModule"
      @rename="openRenameCurrentGraph"
      @create="openCreateGraph"
      @delete="deleteCurrentGraph"
    />

    <div v-if="hasErrorMessage" class="relation-error-panel">
      <p v-if="loadError">{{ loadError }}</p>
      <p v-if="saveError">{{ saveError }}</p>
      <p v-for="fileError in fileErrors" :key="fileError">
        {{ fileError }}
      </p>
    </div>

    <div v-if="currentGraph" class="relation-workspace">
      <RelationBlockPanel
        v-model:search-keyword="searchKeyword"
        :current-graph="currentGraph"
        :graph-summary="graphSummary"
        :filtered-nodes="filteredNodes"
        :selected-node-id="selectedNodeId"
        :selected-node="selectedNode"
        :dragging-node-id="draggingNodeId"
        :drag-over-node-id="dragOverNodeId"
        :block-drop-placement="blockDropPlacement"
        :is-character-default-graph="isCharacterDefaultGraph"
        :is-saving="isSaving"
        @select-node="selectNode"
        @start-drag="startBlockDrag"
        @hover-drop-target="hoverBlockDropTarget"
        @drop-node="dropBlockOn"
        @reset-drag="resetBlockDrag"
        @create-node="openCreateNode"
        @rename-node="openRenameSelectedNode"
        @delete-node="deleteSelectedNode"
      />

      <RelationGraphCanvas
        :current-graph="currentGraph"
        :is-saving="isSaving"
        :canvas-width="CANVAS_WIDTH"
        :tree-canvas-height="treeCanvasHeight"
        :node-width="NODE_WIDTH"
        :node-height="NODE_HEIGHT"
        :visible-tree-nodes="visibleTreeNodes"
        :visible-tree-edges="visibleTreeEdges"
        :selected-node-id="selectedNodeId"
        :selected-edge-id="selectedEdgeId"
        :selected-edge="selectedEdge"
        @create-edge="openCreateEdge"
        @select-edge="selectEdge"
        @select-tree-node="selectTreeNode"
      />

      <RelationTimelinePanel
        :selection-mode="selectionMode"
        :selected-edge="selectedEdge"
        :selected-node="selectedNode"
        :selected-edge-history="selectedEdgeHistory"
        :is-saving="isSaving"
        :get-edge-from-node="getEdgeFromNode"
        :get-edge-to-node="getEdgeToNode"
        :format-score="formatScore"
        @edit-edge="openEditSelectedEdge"
        @delete-edge="deleteSelectedEdge"
        @create-history="openCreateHistory"
        @edit-history="openEditHistory"
        @delete-history="deleteHistory"
      />
    </div>

    <n-empty v-else description="暂无关系图谱数据，请先打开小说项目或新建图谱" />

    <RelationGraphFormModal
      :open="isGraphModalOpen"
      :mode="graphFormMode"
      :form="graphForm"
      :submitting="isSaving"
      :can-submit="canSubmitGraphForm"
      @close="closeGraphModal"
      @submit="submitGraphForm"
    />

    <RelationNodeFormModal
      :open="isNodeModalOpen"
      :mode="nodeFormMode"
      :form="nodeForm"
      :submitting="isSaving"
      :can-submit="canSubmitNodeForm"
      @close="closeNodeModal"
      @submit="submitNodeForm"
    />

    <RelationEdgeFormModal
      :open="isEdgeModalOpen"
      :mode="edgeFormMode"
      :current-graph="currentGraph"
      :edge-target-nodes="edgeTargetNodes"
      :form="edgeForm"
      :duplicate-message="duplicateEdgeMessage"
      :submitting="isSaving"
      :can-submit="canSubmitEdgeForm"
      @close="closeEdgeModal"
      @submit="submitEdgeForm"
    />

    <RelationHistoryFormModal
      :open="isHistoryModalOpen"
      :mode="historyFormMode"
      :form="historyForm"
      :submitting="isSaving"
      :can-submit="canSubmitHistoryForm"
      @close="closeHistoryModal"
      @submit="submitHistoryForm"
    />
  </section>
</template>

<style scoped>
/** 关系图谱页面整体布局，保持桌面编辑器的稳定工作区。 */
.relation-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  color: #172033;
}

/** 关系工作台三栏布局。 */
.relation-workspace {
  display: grid;
  grid-template-columns: 260px minmax(520px, 1fr) 330px;
  gap: 16px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/** 关系模块读写错误展示区。 */
.relation-error-panel {
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
</style>
