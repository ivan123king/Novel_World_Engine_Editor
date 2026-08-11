<script setup lang="ts">
/**
 * 关系图谱中间 AntV G6 画布。
 * 只把当前根节点的一跳关系树转换为 G6 数据；G6 负责渲染、布局和点击交互，不参与 JSON 持久化。
 */
import {
  EdgeEvent,
  Graph,
  NodeEvent,
  type EdgeData,
  type GraphData,
  type GraphOptions,
  type IEvent,
  type NodeData,
} from '@antv/g6';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import type { RelationGraphEdge, RelationGraphFile } from '@/types';
import type { RelationTreeEdge, RelationTreeNode } from '@/views/relation/useRelationGraphEditor';

interface G6NodeCustomData {
  /** 树节点 ID，对应当前渲染批次中的节点。 */
  treeId: string;
  /** 领域节点 ID，对应关系图谱 JSON 中的 node.id。 */
  nodeId: string;
  /** 节点展示名称。 */
  label: string;
  /** 节点类型，用于区分实体引用和自定义图谱块。 */
  kind: string;
  /** 树层级，0 表示当前根节点。 */
  depth: number;
}

interface G6EdgeCustomData {
  /** 领域关系 ID，对应关系图谱 JSON 中的 edge.id。 */
  edgeId: string;
  /** 关系名称。 */
  type: string;
  /** 关系强度。 */
  score?: number;
}

interface G6ElementEvent {
  /** G6 事件目标元素。 */
  target?: {
    id?: string;
    attributes?: {
      id?: string;
    };
  };
}

const props = defineProps<{
  /** 当前图谱对象。 */
  currentGraph: RelationGraphFile;
  /** 是否正在保存。 */
  isSaving: boolean;
  /** G6 画布宽度。 */
  canvasWidth: number;
  /** 树形画布高度，节点较多时用于纵向滚动。 */
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

/** G6 挂载容器。 */
const graphContainerRef = ref<HTMLDivElement | null>(null);

/** G6 图实例。 */
const graphInstance = shallowRef<Graph | null>(null);

/** G6 渲染序号，用于避免异步 render 回写过期状态。 */
let renderVersion = 0;

/** 当前 G6 节点 ID 到树节点的映射。 */
const treeNodeByG6Id = computed(() =>
  new Map(props.visibleTreeNodes.map((treeNode) => [treeNode.treeId, treeNode])),
);

/** 当前 G6 边 ID 到树边的映射。 */
const treeEdgeByG6Id = computed(() =>
  new Map(props.visibleTreeEdges.map((treeEdge) => [treeEdge.id, treeEdge])),
);

/** G6 画布实际高度。 */
const g6CanvasHeight = computed(() => Math.max(props.treeCanvasHeight, 620));

/** 转换后的 G6 图数据。 */
const g6Data = computed<GraphData>(() => ({
  nodes: props.visibleTreeNodes.map<NodeData>((treeNode) => ({
    id: treeNode.treeId,
    data: {
      treeId: treeNode.treeId,
      nodeId: treeNode.node.id,
      label: treeNode.node.label,
      kind: treeNode.node.kind,
      depth: treeNode.depth,
    } satisfies G6NodeCustomData,
    states: [
      ...(treeNode.depth === 0 ? ['selected'] : []),
      ...(isSelectedEdgeEndpoint(treeNode.node.id) ? ['edge-endpoint'] : []),
    ],
  })),
  edges: props.visibleTreeEdges.map<EdgeData>((treeEdge) => ({
    id: treeEdge.id,
    source: treeEdge.sourceTreeId,
    target: treeEdge.targetTreeId,
    data: {
      edgeId: treeEdge.edge.id,
      type: treeEdge.edge.current.type,
      score: treeEdge.edge.current.score,
    } satisfies G6EdgeCustomData,
    states: [
      ...(props.selectedEdgeId === treeEdge.edge.id ? ['selected'] : []),
    ],
  })),
}));

/**
 * 读取 G6 节点自定义数据。
 * @param datum G6 节点数据
 */
function getNodeCustomData(datum: NodeData): G6NodeCustomData {
  return datum.data as unknown as G6NodeCustomData;
}

/**
 * 读取 G6 边自定义数据。
 * @param datum G6 边数据
 */
function getEdgeCustomData(datum: EdgeData): G6EdgeCustomData {
  return datum.data as unknown as G6EdgeCustomData;
}

/**
 * 判断节点是否是当前选中关系的端点。
 * @param nodeId 领域节点 ID
 */
function isSelectedEdgeEndpoint(nodeId: string): boolean {
  return Boolean(props.selectedEdge && (props.selectedEdge.from === nodeId || props.selectedEdge.to === nodeId));
}

/**
 * 从 G6 事件中取出元素 ID。
 * @param event G6 元素事件
 */
function getEventElementId(event: IEvent): string {
  const elementEvent = event as unknown as G6ElementEvent;
  return String(elementEvent.target?.id ?? elementEvent.target?.attributes?.id ?? '');
}

/**
 * 点击 G6 节点时，仍沿用当前关系图谱交互：根节点不变，子节点选中入边关系。
 * @param event G6 节点事件
 */
function handleNodeClick(event: IEvent): void {
  const treeNode = treeNodeByG6Id.value.get(getEventElementId(event));

  if (treeNode) {
    emit('selectTreeNode', treeNode);
  }
}

/**
 * 点击 G6 关系线时，右侧时间轴展示该关系。
 * @param event G6 边事件
 */
function handleEdgeClick(event: IEvent): void {
  const treeEdge = treeEdgeByG6Id.value.get(getEventElementId(event));

  if (treeEdge) {
    emit('selectEdge', treeEdge.edge);
  }
}

/** 创建 G6 图实例。 */
function createGraph(): void {
  const container = graphContainerRef.value;

  if (!container || graphInstance.value) {
    return;
  }

  const graphOptions: GraphOptions = {
    container,
    width: props.canvasWidth,
    height: g6CanvasHeight.value,
    data: g6Data.value,
    autoResize: true,
    background: '#ffffff',
    animation: false,
    layout: {
      type: 'dagre',
      rankdir: 'LR',
      ranksep: 160,
      nodesep: 48,
    } as GraphOptions['layout'],
    node: {
      type: 'rect',
      style: (datum) => {
        const data = getNodeCustomData(datum);
        const isRoot = data.depth === 0;
        const isCustomNode = data.kind === 'graph-block';
        const isEndpoint = isSelectedEdgeEndpoint(data.nodeId);

        return {
          size: [props.nodeWidth, props.nodeHeight],
          radius: 8,
          fill: isCustomNode ? '#fffaf2' : '#ffffff',
          stroke: isRoot ? '#2f80ed' : isEndpoint ? '#7aa7d9' : isCustomNode ? '#d8b875' : '#c4d0df',
          lineWidth: isRoot ? 2.6 : 1.4,
          shadowColor: 'rgba(34, 45, 58, 0.14)',
          shadowBlur: 10,
          shadowOffsetY: 4,
          labelText: data.label,
          labelPlacement: 'center',
          labelFill: '#1e2a36',
          labelFontSize: 14,
          labelFontWeight: 800,
          labelWordWrap: true,
          labelMaxWidth: props.nodeWidth - 22,
        };
      },
      state: {
        selected: {
          stroke: '#2f80ed',
          lineWidth: 2.6,
        },
        'edge-endpoint': {
          stroke: '#7aa7d9',
        },
      },
    },
    edge: {
      type: 'cubic-horizontal',
      style: (datum) => {
        const data = getEdgeCustomData(datum);
        const isSelected = props.selectedEdgeId === data.edgeId;
        const scoreText = typeof data.score === 'number' ? ` ${data.score}` : '';

        return {
          stroke: isSelected ? '#2f80ed' : '#9aaabd',
          lineWidth: isSelected ? 2.6 : 1.8,
          endArrow: true,
          labelText: `${data.type}${scoreText}`,
          labelPlacement: 'center',
          labelAutoRotate: false,
          labelFill: '#526174',
          labelFontSize: 12,
          labelFontWeight: 700,
          labelBackground: true,
          labelBackgroundFill: '#ffffff',
          labelBackgroundStroke: '#d9e3ef',
          labelBackgroundRadius: 6,
          labelPadding: [5, 9],
        };
      },
      state: {
        selected: {
          stroke: '#2f80ed',
          lineWidth: 2.6,
        },
      },
    },
    behaviors: ['drag-canvas', 'zoom-canvas'],
  };

  const graph = new Graph(graphOptions);
  graph.on(NodeEvent.CLICK, handleNodeClick);
  graph.on(EdgeEvent.CLICK, handleEdgeClick);
  graphInstance.value = graph;
}

/** 重绘 G6 图谱。 */
async function renderGraph(): Promise<void> {
  const graph = graphInstance.value;

  if (!graph || graph.destroyed) {
    return;
  }

  const currentRenderVersion = renderVersion + 1;
  renderVersion = currentRenderVersion;
  graph.resize(props.canvasWidth, g6CanvasHeight.value);
  graph.setData(g6Data.value);
  await graph.render();

  if (renderVersion !== currentRenderVersion || graph.destroyed) {
    return;
  }
}

/** 初始化 G6 画布。 */
onMounted(() => {
  void nextTick(async () => {
    createGraph();
    await renderGraph();
  });
});

/** 销毁 G6 画布，避免组件卸载后保留事件监听。 */
onBeforeUnmount(() => {
  graphInstance.value?.destroy();
  graphInstance.value = null;
});

watch(
  () => [
    props.visibleTreeNodes,
    props.visibleTreeEdges,
    props.selectedNodeId,
    props.selectedEdgeId,
    props.selectedEdge?.id,
    props.treeCanvasHeight,
  ],
  () => {
    void renderGraph();
  },
  { deep: true },
);
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
      <div
        ref="graphContainerRef"
        class="g6-canvas"
        :style="{ height: `${g6CanvasHeight}px` }"
      ></div>
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
  background:
    linear-gradient(#f1f4f8 1px, transparent 1px),
    linear-gradient(90deg, #f1f4f8 1px, transparent 1px),
    #ffffff;
  background-size: 80px 80px;
  border: 1px solid #dce4ee;
  border-radius: 8px;
}

/** G6 挂载容器，保持稳定尺寸，避免渲染后布局跳动。 */
.g6-canvas {
  width: 100%;
  min-height: 100%;
}
</style>
