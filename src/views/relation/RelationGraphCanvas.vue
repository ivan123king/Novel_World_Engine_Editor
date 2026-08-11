<script setup lang="ts">
/**
 * 关系图谱中间树形画布。
 * 负责渲染当前根节点的一跳关系树，并把节点和关系点击事件交给页面状态处理。
 */
import type { RelationGraphEdge, RelationGraphFile, RelationGraphNode } from '@/types';
import type { RelationTreeEdge, RelationTreeNode } from '@/views/relation/useRelationGraphEditor';

const props = defineProps<{
  /** 当前图谱对象。 */
  currentGraph: RelationGraphFile;
  /** 是否正在保存。 */
  isSaving: boolean;
  /** SVG 画布坐标系宽度。 */
  canvasWidth: number;
  /** 树形画布高度。 */
  treeCanvasHeight: number;
  /** 节点固定宽度。 */
  nodeWidth: number;
  /** 节点固定高度。 */
  nodeHeight: number;
  /** 当前可见树节点。 */
  visibleTreeNodes: RelationTreeNode[];
  /** 当前可见树关系。 */
  visibleTreeEdges: RelationTreeEdge[];
  /** 当前作为画布根节点的块 ID。 */
  selectedNodeId: string;
  /** 当前选中的关系 ID。 */
  selectedEdgeId: string;
  /** 当前选中的关系对象。 */
  selectedEdge: RelationGraphEdge | null;
}>();

const emit = defineEmits<{
  /** 打开添加关系弹窗。 */
  createEdge: [];
  /** 选中关系。 */
  selectEdge: [edge: RelationGraphEdge];
  /** 选中画布树节点。 */
  selectTreeNode: [treeNode: RelationTreeNode];
}>();

/**
 * 根据树节点 ID 查找树节点布局。
 * @param treeId 树节点 ID
 */
function findTreeNodeById(treeId: string): RelationTreeNode | null {
  return props.visibleTreeNodes.find((node) => node.treeId === treeId) ?? null;
}

/**
 * 获取树形关系线的贝塞尔路径。
 * @param treeEdge 树形关系边
 */
function getTreeEdgePath(treeEdge: RelationTreeEdge): string {
  const source = findTreeNodeById(treeEdge.sourceTreeId);
  const target = findTreeNodeById(treeEdge.targetTreeId);

  if (!source || !target) {
    return '';
  }

  const x1 = source.x + props.nodeWidth;
  const y1 = source.y + props.nodeHeight / 2;
  const x2 = target.x;
  const y2 = target.y + props.nodeHeight / 2;
  const controlOffset = Math.max(80, (x2 - x1) / 2);

  return `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`;
}

/**
 * 获取树形关系标签横坐标。
 * @param treeEdge 树形关系边
 */
function getTreeEdgeLabelX(treeEdge: RelationTreeEdge): number {
  const source = findTreeNodeById(treeEdge.sourceTreeId);
  const target = findTreeNodeById(treeEdge.targetTreeId);

  if (!source || !target) {
    return 0;
  }

  return (source.x + props.nodeWidth + target.x) / 2;
}

/**
 * 获取树形关系标签纵坐标。
 * @param treeEdge 树形关系边
 */
function getTreeEdgeLabelY(treeEdge: RelationTreeEdge): number {
  const source = findTreeNodeById(treeEdge.sourceTreeId);
  const target = findTreeNodeById(treeEdge.targetTreeId);

  if (!source || !target) {
    return 0;
  }

  return (source.y + target.y) / 2 + props.nodeHeight / 2 - 10;
}

/**
 * 判断关系是否和当前根节点直接相连。
 * @param edge 关系边
 */
function isIncidentEdge(edge: RelationGraphEdge): boolean {
  return Boolean(props.selectedNodeId && (edge.from === props.selectedNodeId || edge.to === props.selectedNodeId));
}

/**
 * 生成关系线的视觉状态 class。
 * @param edge 关系边
 */
function getEdgeClass(edge: RelationGraphEdge): Record<string, boolean> {
  return {
    'is-selected': props.selectedEdgeId === edge.id,
    'is-related': props.selectedEdgeId !== edge.id && isIncidentEdge(edge),
    'is-muted': Boolean(props.selectedNodeId && props.selectedEdgeId !== edge.id && !isIncidentEdge(edge)),
  };
}

/**
 * 判断节点是否是当前选中关系的端点。
 * @param node 图谱节点
 */
function isSelectedEdgeEndpoint(node: RelationGraphNode): boolean {
  return Boolean(props.selectedEdge && (props.selectedEdge.from === node.id || props.selectedEdge.to === node.id));
}

/**
 * 生成节点视觉状态 class。
 * @param node 图谱节点
 */
function getNodeClass(node: RelationGraphNode): Record<string, boolean> {
  return {
    'is-selected': props.selectedNodeId === node.id,
    'is-edge-endpoint': isSelectedEdgeEndpoint(node),
    'is-custom-node': node.kind === 'graph-block',
  };
}
</script>

<template>
  <main class="graph-panel" aria-label="关系图画布">
    <div class="graph-header">
      <div class="graph-title-group">
        <h3 class="graph-title">{{ props.currentGraph.name }}</h3>
        <p class="graph-description">
          {{ props.currentGraph.description || '选择左侧块后，以该块为根展开关系树。' }}
        </p>
      </div>

      <div class="graph-actions">
        <n-button size="small" type="primary" :disabled="props.isSaving" @click="emit('createEdge')">
          添加关系
        </n-button>
      </div>
    </div>

    <div class="canvas-shell">
      <svg
        class="relation-canvas"
        :viewBox="`0 0 ${props.canvasWidth} ${props.treeCanvasHeight}`"
        :style="{ height: `${props.treeCanvasHeight}px` }"
        role="img"
        aria-label="关系树画布"
      >
        <defs>
          <marker
            id="relation-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="7"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L8,3 z" class="arrow-path" />
          </marker>
        </defs>

        <g class="canvas-grid">
          <path
            v-for="x in 10"
            :key="`vertical-${x}`"
            :d="`M ${x * 90} 0 V ${props.treeCanvasHeight}`"
          />
          <path
            v-for="y in Math.ceil(props.treeCanvasHeight / 80)"
            :key="`horizontal-${y}`"
            :d="`M 0 ${y * 80} H ${props.canvasWidth}`"
          />
        </g>

        <g class="edge-layer">
          <g
            v-for="treeEdge in props.visibleTreeEdges"
            :key="treeEdge.id"
            class="edge-item"
            :class="getEdgeClass(treeEdge.edge)"
            @click.stop="emit('selectEdge', treeEdge.edge)"
          >
            <path
              class="edge-line"
              :d="getTreeEdgePath(treeEdge)"
              marker-end="url(#relation-arrow)"
            />
            <rect
              class="edge-label-bg"
              :x="getTreeEdgeLabelX(treeEdge) - 56"
              :y="getTreeEdgeLabelY(treeEdge) - 15"
              width="112"
              height="30"
              rx="6"
            />
            <text class="edge-label" :x="getTreeEdgeLabelX(treeEdge)" :y="getTreeEdgeLabelY(treeEdge) + 5">
              {{ treeEdge.edge.current.type }} {{ treeEdge.edge.current.score ?? '' }}
            </text>
          </g>
        </g>

        <g class="node-layer">
          <g
            v-for="treeNode in props.visibleTreeNodes"
            :key="treeNode.treeId"
            class="node-item"
            :class="getNodeClass(treeNode.node)"
            :transform="`translate(${treeNode.x}, ${treeNode.y})`"
            @click.stop="emit('selectTreeNode', treeNode)"
          >
            <rect class="node-box" :width="props.nodeWidth" :height="props.nodeHeight" rx="8" />
            <circle class="node-dot" cx="18" cy="27" r="5" />
            <text class="node-label" x="34" y="24">{{ treeNode.node.label }}</text>
            <text class="node-kind" x="34" y="41">
              {{ treeNode.depth === 0 ? '根节点' : treeNode.node.kind === 'entity-ref' ? '实体引用' : '图谱块' }}
            </text>
          </g>
        </g>
      </svg>
    </div>
  </main>
</template>

<style scoped>
/** 中间画布面板。 */
.graph-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
  min-height: 0;
  padding: 14px;
  background: #ffffff;
  border: 1px solid #d9e1ea;
  border-radius: 8px;
  overflow: hidden;
}

/** 画布标题栏。 */
.graph-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

/** 图谱标题区域。 */
.graph-title-group {
  display: grid;
  gap: 4px;
  min-width: 0;
}

/** 当前图谱标题。 */
.graph-title {
  color: #1d2936;
  font-size: 18px;
  line-height: 1.25;
}

/** 当前图谱说明。 */
.graph-description {
  max-width: 780px;
  overflow: hidden;
  color: #637083;
  font-size: 12px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/** 画布工具按钮组。 */
.graph-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/** 画布外壳。 */
.canvas-shell {
  position: relative;
  min-height: 0;
  overflow: auto;
  background: #ffffff;
  border: 1px solid #dce4ee;
  border-radius: 8px;
}

/** SVG 关系树画布。 */
.relation-canvas {
  display: block;
  width: 100%;
  min-height: 100%;
}

/** 网格辅助线。 */
.canvas-grid path {
  stroke: #f1f4f8;
  stroke-width: 1;
}

/** 箭头颜色跟随关系线。 */
.arrow-path {
  fill: #9aaabd;
}

/** 关系线分组，使用 pointer cursor 表示可选中。 */
.edge-item {
  cursor: pointer;
}

/** 关系线基础样式。 */
.edge-line {
  fill: none;
  stroke: #9aaabd;
  stroke-linecap: round;
  stroke-width: 1.8;
}

/** 关系标签背景。 */
.edge-label-bg {
  fill: #ffffff;
  stroke: #d9e3ef;
  stroke-width: 1;
}

/** 关系标签文本。 */
.edge-label {
  fill: #526174;
  font-size: 12px;
  font-weight: 700;
  text-anchor: middle;
  user-select: none;
}

.edge-item.is-selected .edge-line {
  stroke: #2f80ed;
  stroke-width: 2.6;
}

.edge-item.is-selected .edge-label-bg {
  fill: #eef6ff;
  stroke: #7aa7d9;
}

.edge-item.is-related .edge-line {
  stroke: #2f80ed;
  stroke-width: 3;
}

.edge-item.is-muted {
  opacity: 0.35;
}

/** 画布节点分组。 */
.node-item {
  cursor: pointer;
}

/** 节点主体。 */
.node-box {
  fill: #ffffff;
  stroke: #c4d0df;
  stroke-width: 1.4;
  filter: drop-shadow(0 4px 8px rgba(34, 45, 58, 0.1));
}

/** 自定义图谱块节点略带暖色，用来和人物引用节点区分。 */
.node-item.is-custom-node .node-box {
  fill: #fffaf2;
  stroke: #d8b875;
}

/** 节点左侧状态点。 */
.node-dot {
  fill: #6f879d;
}

.node-item.is-custom-node .node-dot {
  fill: #a86b23;
}

/** 节点名称。 */
.node-label {
  fill: #1e2a36;
  font-size: 14px;
  font-weight: 800;
  user-select: none;
}

/** 节点类型文本。 */
.node-kind {
  fill: #697789;
  font-size: 11px;
  user-select: none;
}

.node-item.is-selected .node-box {
  stroke: #2f80ed;
  stroke-width: 2.6;
}

.node-item.is-selected .node-dot {
  fill: #2f80ed;
}
</style>
