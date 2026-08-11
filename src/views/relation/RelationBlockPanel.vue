<script setup lang="ts">
/**
 * 关系图谱左侧块列表面板。
 * 负责块搜索、选择、拖拽排序和自定义图谱块操作入口。
 */
import type { RelationGraphFile, RelationGraphNode } from '@/types';
import type { BlockDropPlacement } from '@/views/relation/useRelationGraphEditor';

const props = defineProps<{
  /** 当前图谱对象。 */
  currentGraph: RelationGraphFile;
  /** 当前图谱统计文本。 */
  graphSummary: string;
  /** 搜索关键词。 */
  searchKeyword: string;
  /** 搜索过滤后的块列表。 */
  filteredNodes: RelationGraphNode[];
  /** 当前作为画布根节点的块 ID。 */
  selectedNodeId: string;
  /** 当前选中的块对象。 */
  selectedNode: RelationGraphNode | null;
  /** 正在拖拽的块 ID。 */
  draggingNodeId: string;
  /** 当前拖拽悬停的块 ID。 */
  dragOverNodeId: string;
  /** 当前拖拽插入位置。 */
  blockDropPlacement: BlockDropPlacement;
  /** 当前图谱是否为系统默认人物图谱。 */
  isCharacterDefaultGraph: boolean;
  /** 是否正在保存。 */
  isSaving: boolean;
}>();

const emit = defineEmits<{
  /** 更新搜索关键词。 */
  'update:searchKeyword': [keyword: string];
  /** 选择块作为画布根节点。 */
  selectNode: [nodeId: string];
  /** 开始拖拽块。 */
  startDrag: [nodeId: string];
  /** 悬停拖拽目标。 */
  hoverDropTarget: [nodeId: string, placement: BlockDropPlacement];
  /** 将拖拽块放置到目标块附近。 */
  dropNode: [nodeId: string, placement: BlockDropPlacement];
  /** 重置拖拽状态。 */
  resetDrag: [];
  /** 打开新建块弹窗。 */
  createNode: [];
  /** 打开重命名块弹窗。 */
  renameNode: [];
  /** 删除选中块。 */
  deleteNode: [];
}>();

/**
 * 根据鼠标位置判断拖拽块应插入到目标块前方还是后方。
 * @param event 拖拽事件
 */
function resolveBlockDropPlacement(event: DragEvent): BlockDropPlacement {
  const target = event.currentTarget;

  if (!(target instanceof HTMLElement)) {
    return 'before';
  }

  const targetRect = target.getBoundingClientRect();
  return event.clientY > targetRect.top + targetRect.height / 2 ? 'after' : 'before';
}
</script>

<template>
  <aside class="block-panel" aria-label="图谱块列表">
    <div class="panel-header">
      <div>
        <h3 class="panel-title">块列表</h3>
        <n-text depth="3" class="panel-meta">{{ props.graphSummary }}</n-text>
      </div>
      <n-tag size="small" round>
        {{ props.currentGraph.kind === 'character-default' ? '人物' : '自定义' }}
      </n-tag>
    </div>

    <n-input
      :value="props.searchKeyword"
      placeholder="搜索块名称"
      clearable
      @update:value="emit('update:searchKeyword', $event)"
    />

    <div class="block-list">
      <button
        v-for="node in props.filteredNodes"
        :key="node.id"
        class="block-row"
        :class="{
          'is-active': props.selectedNodeId === node.id,
          'is-dragging': props.draggingNodeId === node.id,
          'is-drop-target': props.dragOverNodeId === node.id,
          'is-drop-before': props.dragOverNodeId === node.id && props.blockDropPlacement === 'before',
          'is-drop-after': props.dragOverNodeId === node.id && props.blockDropPlacement === 'after',
        }"
        type="button"
        draggable="true"
        @dragstart="emit('startDrag', node.id)"
        @dragenter="emit('hoverDropTarget', node.id, resolveBlockDropPlacement($event))"
        @dragover.prevent="emit('hoverDropTarget', node.id, resolveBlockDropPlacement($event))"
        @drop.prevent="emit('dropNode', node.id, resolveBlockDropPlacement($event))"
        @dragend="emit('resetDrag')"
        @click="emit('selectNode', node.id)"
      >
        <span class="drag-handle" aria-hidden="true">::</span>
        <span class="block-content">
          <span class="block-name">{{ node.label }}</span>
        </span>
      </button>

      <n-empty v-if="props.filteredNodes.length === 0" description="没有匹配的块" />
    </div>

    <div class="block-actions">
      <n-button
        size="small"
        block
        v-if="!props.isCharacterDefaultGraph"
        :disabled="props.isCharacterDefaultGraph || props.isSaving"
        @click="emit('createNode')"
      >
        新建块
      </n-button>
      <div v-if="!props.isCharacterDefaultGraph" class="block-action-row">
        <n-button size="small" :disabled="!props.selectedNode || props.isSaving" @click="emit('renameNode')">
          重命名块
        </n-button>
        <n-button
          size="small"
          type="error"
          :disabled="!props.selectedNode || props.isSaving"
          @click="emit('deleteNode')"
        >
          删除块
        </n-button>
      </div>
      <n-text v-if="props.isCharacterDefaultGraph" depth="3" class="block-tip">
        人物图谱的块来自人物模块，此处不直接新建或删除人物。
      </n-text>
    </div>
  </aside>
</template>

<style scoped>
/** 左侧块列表面板。 */
.block-panel {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: 12px;
  min-height: 0;
  padding: 14px;
  background: #ffffff;
  border: 1px solid #d9e1ea;
  border-radius: 8px;
}

/** 面板标题栏。 */
.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

/** 面板标题。 */
.panel-title {
  color: #1d2936;
  font-size: 15px;
  line-height: 1.3;
}

/** 面板辅助信息。 */
.panel-meta {
  font-size: 12px;
  line-height: 1.35;
}

/** 块列表滚动区。 */
.block-list {
  display: grid;
  align-content: start;
  gap: 8px;
  min-height: 0;
  overflow: auto;
}

/** 块列表行按钮。 */
.block-row {
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

.block-row:hover,
.block-row.is-active {
  background: #eef6ff;
  border-color: #7aa7d9;
}

.block-row.is-dragging {
  opacity: 0.52;
}

.block-row.is-drop-target {
  background: #e5f1ff;
  border-color: #2f80ed;
}

.block-row.is-drop-before {
  box-shadow: inset 0 3px 0 #2f80ed;
}

.block-row.is-drop-after {
  box-shadow: inset 0 -3px 0 #2f80ed;
}

/** 块列表拖拽把手。 */
.drag-handle {
  color: #8a98a8;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  text-align: center;
}

/** 块列表文本容器。 */
.block-content {
  display: grid;
  gap: 4px;
  min-width: 0;
}

/** 块名称。 */
.block-name {
  overflow: hidden;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/** 块类型摘要。 */
.block-meta {
  overflow: hidden;
  color: #687684;
  font-size: 12px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/** 块底部操作区。 */
.block-actions {
  display: grid;
  gap: 8px;
}

/** 自定义图谱块操作按钮。 */
.block-action-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

/** 人物图谱限制说明。 */
.block-tip {
  font-size: 12px;
  line-height: 1.45;
}
</style>
