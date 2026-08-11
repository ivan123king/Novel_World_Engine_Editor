/**
 * 关系图谱模块页面。
 * 通过 Electron IPC 读写当前小说项目中的关系图谱 JSON，并以当前选中块为根展示树形关系视图。
 */
import { computed, reactive, ref, watch } from 'vue';
import {
  deleteRelationGraph,
  listRelationGraphs,
  saveRelationGraph,
  saveRelationGraphBlockOrder,
  saveRelationGraphOrder,
} from '@/api/relationApi';
import type { RelationGraphEdge, RelationGraphFile, RelationGraphNode, RelationHistoryRecord } from '@/types';

export type RelationSelectionMode = 'node' | 'edge' | 'empty';
export type BlockDropPlacement = 'before' | 'after';
export type GraphFormMode = 'create' | 'rename';
export type NodeFormMode = 'create' | 'rename';
export type EdgeFormMode = 'create' | 'edit';
export type HistoryFormMode = 'create' | 'edit';

/** 树形画布节点。 */
export interface RelationTreeNode {
  treeId: string;
  node: RelationGraphNode;
  depth: number;
  parentTreeId: string | null;
  x: number;
  y: number;
}

/** 树形画布边。 */
export interface RelationTreeEdge {
  id: string;
  edge: RelationGraphEdge;
  sourceTreeId: string;
  targetTreeId: string;
}

/** 图谱表单值。 */
export interface GraphFormValues {
  name: string;
  description: string;
}

/** 块表单值。 */
export interface NodeFormValues {
  label: string;
}

/** 关系表单值。 */
export interface EdgeFormValues {
  from: string;
  to: string;
  type: string;
  score: number | null;
  reason: string;
}

/** 历史记录表单值。 */
export interface HistoryFormValues {
  label: string;
  type: string;
  score: number | null;
  reason: string;
}

/** SVG 画布坐标系宽度。 */
const CANVAS_WIDTH = 900;

/** SVG 画布最小高度。 */
const CANVAS_MIN_HEIGHT = 620;

/** 关系图谱节点圆角矩形的固定宽度。 */
const NODE_WIDTH = 132;

/** 关系图谱节点圆角矩形的固定高度。 */
const NODE_HEIGHT = 54;

/** 树形画布横向层级间距。 */
const TREE_LEVEL_GAP = 260;

/** 树形画布叶子节点纵向间距。 */
const TREE_LEAF_GAP = 96;

/** 树形画布左侧内边距。 */
const TREE_PADDING_X = 64;

/** 树形画布顶部内边距。 */
const TREE_PADDING_Y = 72;

/** 首版树形关系只展示根节点的一跳直接关系。 */
const TREE_MAX_DEPTH = 1;

/**
 * 管理关系图谱页面的本地 JSON 持久化状态和 UI 交互。
 */
export function useRelationGraphEditor() {
  /** 关系图谱数据，由 Electron main process 从当前小说项目 JSON 文件读取。 */
  const graphs = ref<RelationGraphFile[]>([]);

  /** 当前图谱 ID。 */
  const currentGraphId = ref('');

  /** 块搜索关键词。 */
  const searchKeyword = ref('');

  /** 当前选中的节点 ID。 */
  const selectedNodeId = ref('');

  /** 当前选中的关系 ID，右侧时间轴优先展示关系。 */
  const selectedEdgeId = ref('');

  /** 是否正在从本地 JSON 读取关系图谱。 */
  const isLoading = ref(false);

  /** 是否正在保存关系图谱或排序元数据。 */
  const isSaving = ref(false);

  /** 关系模块读取错误。 */
  const loadError = ref('');

  /** 关系模块保存错误。 */
  const saveError = ref('');

  /** 单个图谱文件或排序文件损坏时的非致命错误。 */
  const fileErrors = ref<string[]>([]);

  /** 正在拖拽的块 ID，仅影响 mock 排序预览。 */
  const draggingNodeId = ref('');

  /** 当前拖拽悬停的块 ID。 */
  const dragOverNodeId = ref('');

  /** 当前拖拽插入位置。 */
  const blockDropPlacement = ref<BlockDropPlacement>('before');

  /** 图谱弹窗状态。 */
  const isGraphModalOpen = ref(false);

  /** 图谱弹窗模式。 */
  const graphFormMode = ref<GraphFormMode>('create');

  /** 图谱表单。 */
  const graphForm = reactive<GraphFormValues>({
    name: '',
    description: '',
  });

  /** 块弹窗状态。 */
  const isNodeModalOpen = ref(false);

  /** 块弹窗模式。 */
  const nodeFormMode = ref<NodeFormMode>('create');

  /** 块表单。 */
  const nodeForm = reactive<NodeFormValues>({
    label: '',
  });

  /** 关系弹窗状态。 */
  const isEdgeModalOpen = ref(false);

  /** 关系弹窗模式。 */
  const edgeFormMode = ref<EdgeFormMode>('create');

  /** 当前编辑的关系 ID。 */
  const editingEdgeId = ref('');

  /** 关系表单。 */
  const edgeForm = reactive<EdgeFormValues>({
    from: '',
    to: '',
    type: '',
    score: null,
    reason: '',
  });

  /** 历史记录弹窗状态。 */
  const isHistoryModalOpen = ref(false);

  /** 历史记录弹窗模式。 */
  const historyFormMode = ref<HistoryFormMode>('create');

  /** 当前编辑的历史记录 ID。 */
  const editingHistoryId = ref('');

  /** 历史记录表单。 */
  const historyForm = reactive<HistoryFormValues>({
    label: '',
    type: '',
    score: null,
    reason: '',
  });

  /** 当前图谱对象。 */
  const currentGraph = computed<RelationGraphFile | null>(
    () => graphs.value.find((graph) => graph.id === currentGraphId.value) ?? graphs.value[0] ?? null,
  );

  /** 当前图谱是否为系统默认人物图谱。 */
  const isCharacterDefaultGraph = computed(() => currentGraph.value?.kind === 'character-default');

  /** 作者自定义图谱列表。 */
  const customGraphs = computed(() => graphs.value.filter((graph) => graph.kind === 'custom'));

  /** 当前图谱中符合搜索条件的块列表。 */
  const filteredNodes = computed(() => {
    const graph = currentGraph.value;
    const keyword = searchKeyword.value.trim().toLowerCase();

    if (!graph) {
      return [];
    }

    if (!keyword) {
      return graph.nodes;
    }

    return graph.nodes.filter((node) => node.label.toLowerCase().includes(keyword));
  });

  /** 当前选中的节点。 */
  const selectedNode = computed<RelationGraphNode | null>(() => findNodeById(selectedNodeId.value));

  /** 当前选中的关系。 */
  const selectedEdge = computed<RelationGraphEdge | null>(
    () => currentGraph.value?.edges.find((edge) => edge.id === selectedEdgeId.value) ?? null,
  );

  /** 当前树形画布数据，以选中块为根生成。 */
  const relationTree = computed<{
    nodes: RelationTreeNode[];
    edges: RelationTreeEdge[];
    height: number;
  }>(() => {
    const graph = currentGraph.value;
    const rootNode = selectedNode.value ?? graph?.nodes[0] ?? null;

    if (!graph || !rootNode) {
      return {
        nodes: [],
        edges: [],
        height: CANVAS_MIN_HEIGHT,
      };
    }

    const graphValue = graph;
    const visitedNodeIds = new Set<string>([rootNode.id]);
    const treeNodes: RelationTreeNode[] = [];
    const treeEdges: RelationTreeEdge[] = [];
    let treeIdSeed = 0;
    let nextLeafY = TREE_PADDING_Y;

    function createTreeId(nodeId: string): string {
      treeIdSeed += 1;
      return `${nodeId}_${treeIdSeed}`;
    }

    function findIncidentEdges(nodeId: string): RelationGraphEdge[] {
      return graphValue.edges
        .filter((edge) => edge.from === nodeId || edge.to === nodeId)
        .sort((left, right) => {
          const leftOtherNode = findNodeById(left.from === nodeId ? left.to : left.from);
          const rightOtherNode = findNodeById(right.from === nodeId ? right.to : right.from);
          return (leftOtherNode?.label ?? '').localeCompare(rightOtherNode?.label ?? '', 'zh-Hans-CN');
        });
    }

    function buildTreeNode(
      node: RelationGraphNode,
      depth: number,
      parentTreeId: string | null,
      incomingEdge: RelationGraphEdge | null,
    ): RelationTreeNode {
      const treeNode: RelationTreeNode = {
        treeId: createTreeId(node.id),
        node,
        depth,
        parentTreeId,
        x: TREE_PADDING_X + depth * TREE_LEVEL_GAP,
        y: 0,
      };

      treeNodes.push(treeNode);

      if (incomingEdge && parentTreeId) {
        treeEdges.push({
          id: `${parentTreeId}_${treeNode.treeId}_${incomingEdge.id}`,
          edge: incomingEdge,
          sourceTreeId: parentTreeId,
          targetTreeId: treeNode.treeId,
        });
      }

      const childEntries = depth >= TREE_MAX_DEPTH
        ? []
        : findIncidentEdges(node.id)
          .map((edge) => ({
            edge,
            childNode: findNodeById(edge.from === node.id ? edge.to : edge.from),
          }))
          .filter((entry): entry is { edge: RelationGraphEdge; childNode: RelationGraphNode } =>
            Boolean(entry.childNode) && !visitedNodeIds.has(entry.childNode!.id),
          );

      const childTreeNodes: RelationTreeNode[] = [];

      for (const entry of childEntries) {
        visitedNodeIds.add(entry.childNode.id);
        childTreeNodes.push(buildTreeNode(entry.childNode, depth + 1, treeNode.treeId, entry.edge));
      }

      if (childTreeNodes.length === 0) {
        treeNode.y = nextLeafY;
        nextLeafY += TREE_LEAF_GAP;
      } else {
        treeNode.y =
          childTreeNodes.reduce((sum, childTreeNode) => sum + childTreeNode.y, 0) /
          childTreeNodes.length;
      }

      return treeNode;
    }

    buildTreeNode(rootNode, 0, null, null);

    return {
      nodes: treeNodes,
      edges: treeEdges,
      height: Math.max(CANVAS_MIN_HEIGHT, nextLeafY + TREE_PADDING_Y),
    };
  });

  /** 树形画布可见节点。 */
  const visibleTreeNodes = computed(() => relationTree.value.nodes);

  /** 树形画布可见关系。 */
  const visibleTreeEdges = computed(() => relationTree.value.edges);

  /** 树形画布高度，节点较多时用于纵向滚动。 */
  const treeCanvasHeight = computed(() => relationTree.value.height);

  /** 右侧 Inspector 当前展示模式。 */
  const selectionMode = computed<RelationSelectionMode>(() => {
    if (selectedEdge.value) {
      return 'edge';
    }

    if (selectedNode.value) {
      return 'node';
    }

    return 'empty';
  });

  /** 当前关系变化记录，按设计文档要求以当前或最新记录优先展示。 */
  const selectedEdgeHistory = computed<RelationHistoryRecord[]>(() => {
    if (!selectedEdge.value) {
      return [];
    }

    return [...selectedEdge.value.history].sort((left, right) => {
      const leftOrder = left.order ?? Number.NEGATIVE_INFINITY;
      const rightOrder = right.order ?? Number.NEGATIVE_INFINITY;

      if (leftOrder !== rightOrder) {
        return rightOrder - leftOrder;
      }

      return (right.createdAt ?? '').localeCompare(left.createdAt ?? '');
    });
  });

  /** 当前图谱统计文本。 */
  const graphSummary = computed(() => {
    const graph = currentGraph.value;

    if (!graph) {
      return '暂无图谱';
    }

    return `${graph.nodes.length} 个块 / ${graph.edges.length} 条关系`;
  });

  /** 页面是否存在需要展示的错误信息。 */
  const hasErrorMessage = computed(() => Boolean(loadError.value || saveError.value || fileErrors.value.length));

  /** 关系终点候选块，排除起点块。 */
  const edgeTargetNodes = computed(() =>
    currentGraph.value?.nodes.filter((node) => node.id !== edgeForm.from) ?? [],
  );

  /** 关系表单中与当前两端重复的已有关系。 */
  const duplicateEdgeForForm = computed<RelationGraphEdge | null>(() => {
    const graph = currentGraph.value;

    if (!graph || !edgeForm.from || !edgeForm.to || edgeForm.from === edgeForm.to) {
      return null;
    }

    return findExistingRelationEdge(graph, edgeForm.from, edgeForm.to, editingEdgeId.value);
  });

  /** 关系表单重复关系提示。 */
  const duplicateEdgeMessage = computed(() => {
    const duplicateEdge = duplicateEdgeForForm.value;

    if (!duplicateEdge) {
      return '';
    }

    return `这两个块已经存在“${duplicateEdge.current.type || '未命名'}”关系，请编辑已有关系，不要重复添加。`;
  });

  /** 图谱表单是否可提交。 */
  const canSubmitGraphForm = computed(() => graphForm.name.trim().length > 0);

  /** 块表单是否可提交。 */
  const canSubmitNodeForm = computed(() => nodeForm.label.trim().length > 0);

  /** 关系表单基础字段是否填写完整，不包含重复关系业务校验。 */
  const canSubmitEdgeForm = computed(
    () =>
      edgeForm.from.trim().length > 0 &&
      edgeForm.to.trim().length > 0 &&
      edgeForm.from !== edgeForm.to &&
      edgeForm.type.trim().length > 0,
  );

  /** 历史记录表单是否可提交。 */
  const canSubmitHistoryForm = computed(
    () => historyForm.label.trim().length > 0 && historyForm.type.trim().length > 0,
  );

  /**
   * 将未知错误格式化成可展示文本。
   * @param error 未知错误
   */
  function formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * 生成可安全作为 JSON 文件名一部分的 ID。
   * @param prefix ID 前缀
   */
  function createSafeId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * 更新内存中的图谱列表。
   * @param graph 已保存的图谱
   */
  function upsertGraph(graph: RelationGraphFile): void {
    const existingIndex = graphs.value.findIndex((item) => item.id === graph.id);

    if (existingIndex >= 0) {
      graphs.value.splice(existingIndex, 1, graph);
    } else {
      graphs.value.push(graph);
    }
  }

  /** 同步当前图谱选择和默认节点关系选择。 */
  function resetSelectionForCurrentGraph(): void {
    selectedEdgeId.value = currentGraph.value?.edges[0]?.id ?? '';
    selectedNodeId.value = selectedEdge.value?.from ?? currentGraph.value?.nodes[0]?.id ?? '';
    resetBlockDrag();
  }

  /** 从 Electron main process 读取关系图谱模块数据。 */
  async function loadRelationGraphModule(): Promise<void> {
    isLoading.value = true;
    loadError.value = '';
    saveError.value = '';

    try {
      const result = await listRelationGraphs();
      graphs.value = result.graphs;
      fileErrors.value = result.errors;
      if (!graphs.value.some((graph) => graph.id === currentGraphId.value)) {
        currentGraphId.value = graphs.value[0]?.id ?? '';
      }

      resetSelectionForCurrentGraph();
    } catch (error) {
      loadError.value = formatError(error);
      graphs.value = [];
      fileErrors.value = [];
      currentGraphId.value = '';
      selectedNodeId.value = '';
      selectedEdgeId.value = '';
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 保存指定图谱，并更新页面状态。
   * @param graph 待保存图谱
   */
  async function persistGraph(graph: RelationGraphFile): Promise<RelationGraphFile> {
    isSaving.value = true;
    saveError.value = '';

    try {
      const savedGraph = await saveRelationGraph(graph);
      upsertGraph(savedGraph);
      return savedGraph;
    } catch (error) {
      saveError.value = formatError(error);
      throw error;
    } finally {
      isSaving.value = false;
    }
  }

  /** 保存当前图谱。 */
  async function persistCurrentGraph(): Promise<RelationGraphFile | null> {
    if (!currentGraph.value) {
      return null;
    }

    return persistGraph(currentGraph.value);
  }

  /** 保存当前图谱的块展示顺序。 */
  async function persistCurrentBlockOrder(): Promise<void> {
    if (!currentGraph.value) {
      return;
    }

    isSaving.value = true;
    saveError.value = '';

    try {
      await saveRelationGraphBlockOrder(
        currentGraph.value.id,
        currentGraph.value.nodes.map((node) => node.id),
      );
    } catch (error) {
      saveError.value = formatError(error);
      throw error;
    } finally {
      isSaving.value = false;
    }
  }

  /** 保存自定义图谱下拉顺序。 */
  async function persistGraphOrder(): Promise<void> {
    isSaving.value = true;
    saveError.value = '';

    try {
      await saveRelationGraphOrder(customGraphs.value.map((graph) => graph.id));
    } catch (error) {
      saveError.value = formatError(error);
      throw error;
    } finally {
      isSaving.value = false;
    }
  }

  /** 监听图谱切换，同步默认选中第一条关系或第一个节点。 */
  watch(currentGraphId, () => {
    searchKeyword.value = '';
    resetSelectionForCurrentGraph();
  });

  /**
   * 根据节点 ID 查找当前图谱节点。
   * @param nodeId 节点稳定 ID
   */
  function findNodeById(nodeId: string): RelationGraphNode | null {
    return currentGraph.value?.nodes.find((node) => node.id === nodeId) ?? null;
  }

  /**
   * 判断两个关系端点是否指向同一对块。
   * 关系图谱中同一对块只能存在一条当前关系，方向相反也视为重复。
   * @param edge 关系边
   * @param from 起点块 ID
   * @param to 终点块 ID
   */
  function isSameRelationPair(edge: RelationGraphEdge, from: string, to: string): boolean {
    return (edge.from === from && edge.to === to) || (edge.from === to && edge.to === from);
  }

  /**
   * 查找两端重复的已有关系。
   * @param graph 当前图谱
   * @param from 起点块 ID
   * @param to 终点块 ID
   * @param excludedEdgeId 编辑模式下需要排除的当前关系 ID
   */
  function findExistingRelationEdge(
    graph: RelationGraphFile,
    from: string,
    to: string,
    excludedEdgeId = '',
  ): RelationGraphEdge | null {
    return graph.edges.find((edge) => edge.id !== excludedEdgeId && isSameRelationPair(edge, from, to)) ?? null;
  }

  /**
   * 查找新增关系时可用的第一个终点块。
   * @param graph 当前图谱
   * @param from 起点块 ID
   */
  function findAvailableEdgeTargetNode(graph: RelationGraphFile, from: string): RelationGraphNode | null {
    return (
      graph.nodes.find((node) => node.id !== from && !findExistingRelationEdge(graph, from, node.id)) ??
      graph.nodes.find((node) => node.id !== from) ??
      null
    );
  }

  /**
   * 获取关系起点节点。
   * @param edge 关系边
   */
  function getEdgeFromNode(edge: RelationGraphEdge): RelationGraphNode | null {
    return findNodeById(edge.from);
  }

  /**
   * 获取关系终点节点。
   * @param edge 关系边
   */
  function getEdgeToNode(edge: RelationGraphEdge): RelationGraphNode | null {
    return findNodeById(edge.to);
  }

  /**
   * 格式化关系强度展示文本。
   * @param score 关系强度
   */
  function formatScore(score?: number): string {
    return typeof score === 'number' ? `${score}` : '未填写';
  }

  /**
   * 选择节点并清空当前关系选择。
   * @param nodeId 节点 ID
   */
  function selectNode(nodeId: string): void {
    selectedNodeId.value = nodeId;
    selectedEdgeId.value = '';
  }

  /**
   * 选择画布节点。
   * 画布根节点不改变焦点；子节点只选中其与根节点之间的关系，不联动左侧块列表。
   * @param treeNode 树形画布节点
   */
  function selectTreeNode(treeNode: RelationTreeNode): void {
    if (treeNode.depth === 0) {
      return;
    }

    const incomingTreeEdge = visibleTreeEdges.value.find((treeEdge) => treeEdge.targetTreeId === treeNode.treeId);

    if (incomingTreeEdge) {
      selectEdge(incomingTreeEdge.edge);
    }
  }

  /**
   * 选择关系，只更新右侧时间轴，不切换画布焦点块。
   * @param edge 关系边
   */
  function selectEdge(edge: RelationGraphEdge): void {
    selectedEdgeId.value = edge.id;
  }

  /** 打开新建图谱弹窗。 */
  function openCreateGraph(): void {
    saveError.value = '';
    graphFormMode.value = 'create';
    graphForm.name = '';
    graphForm.description = '';
    isGraphModalOpen.value = true;
  }

  /** 打开重命名图谱弹窗。 */
  function openRenameCurrentGraph(): void {
    const graph = currentGraph.value;

    if (!graph || graph.kind === 'character-default') {
      return;
    }

    saveError.value = '';
    graphFormMode.value = 'rename';
    graphForm.name = graph.name;
    graphForm.description = graph.description;
    isGraphModalOpen.value = true;
  }

  /** 关闭图谱表单弹窗。 */
  function closeGraphModal(): void {
    isGraphModalOpen.value = false;
  }

  /** 提交图谱表单，创建或更新图谱文件。 */
  async function submitGraphForm(): Promise<void> {
    if (!canSubmitGraphForm.value) {
      return;
    }

    const graphName = graphForm.name.trim();

    try {
      if (graphFormMode.value === 'create') {
        const now = new Date().toISOString();
        const graphId = createSafeId('graph');
        const nextGraph: RelationGraphFile = {
          id: graphId,
          name: graphName,
          kind: 'custom',
          description: graphForm.description.trim(),
          nodes: [],
          edges: [],
          view: {
            layout: 'manual',
            zoom: 1,
            pan: { x: 0, y: 0 },
          },
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        };
        const savedGraph = await persistGraph(nextGraph);
        currentGraphId.value = savedGraph.id;
        await persistGraphOrder();
      } else if (currentGraph.value && currentGraph.value.kind === 'custom') {
        currentGraph.value.name = graphName;
        currentGraph.value.description = graphForm.description.trim();
        await persistCurrentGraph();
      }

      closeGraphModal();
    } catch {
      // 错误已写入 saveError
    }
  }

  /**
   * 删除当前自定义图谱，人物图谱不可删除。
   */
  async function deleteCurrentGraph(): Promise<void> {
    const graph = currentGraph.value;

    if (!graph || graph.kind === 'character-default') {
      return;
    }

    const confirmed = window.confirm(`删除图谱“${graph.name}”？\n\n块：${graph.nodes.length} 个\n关系：${graph.edges.length} 条`);

    if (!confirmed) {
      return;
    }

    isSaving.value = true;
    saveError.value = '';

    try {
      await deleteRelationGraph(graph.id);
      graphs.value = graphs.value.filter((item) => item.id !== graph.id);
      currentGraphId.value = graphs.value[0]?.id ?? '';
      await persistGraphOrder();
    } catch (error) {
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  /** 打开新建块弹窗。 */
  function openCreateNode(): void {
    if (!currentGraph.value || currentGraph.value.kind !== 'custom') {
      return;
    }

    saveError.value = '';
    nodeFormMode.value = 'create';
    nodeForm.label = '';
    isNodeModalOpen.value = true;
  }

  /** 打开重命名块弹窗。 */
  function openRenameSelectedNode(): void {
    if (!currentGraph.value || currentGraph.value.kind !== 'custom' || !selectedNode.value) {
      return;
    }

    saveError.value = '';
    nodeFormMode.value = 'rename';
    nodeForm.label = selectedNode.value.label;
    isNodeModalOpen.value = true;
  }

  /** 关闭块表单弹窗。 */
  function closeNodeModal(): void {
    isNodeModalOpen.value = false;
  }

  /** 提交块表单，创建或重命名自定义图谱块。 */
  async function submitNodeForm(): Promise<void> {
    const graph = currentGraph.value;

    if (!graph || graph.kind !== 'custom' || !canSubmitNodeForm.value) {
      return;
    }

    try {
      if (nodeFormMode.value === 'create') {
        const node: RelationGraphNode = {
          id: createSafeId('node'),
          label: nodeForm.label.trim(),
          kind: 'graph-block',
          view: {
            x: 120 + (graph.nodes.length % 4) * 170,
            y: 120 + Math.floor(graph.nodes.length / 4) * 140,
          },
          customFields: {},
        };

        graph.nodes.push(node);
        selectedNodeId.value = node.id;
        selectedEdgeId.value = '';
        await persistCurrentGraph();
        await persistCurrentBlockOrder();
      } else if (selectedNode.value) {
        selectedNode.value.label = nodeForm.label.trim();
        await persistCurrentGraph();
      }

      closeNodeModal();
    } catch {
      // 错误已写入 saveError
    }
  }

  /**
   * 删除当前选中的自定义图谱块，并同步删除关联关系。
   */
  async function deleteSelectedNode(): Promise<void> {
    const graph = currentGraph.value;
    const node = selectedNode.value;

    if (!graph || graph.kind !== 'custom' || !node) {
      return;
    }

    const relatedEdges = graph.edges.filter((edge) => edge.from === node.id || edge.to === node.id);
    const confirmed = window.confirm(
      `删除块“${node.label}”？\n\n将同时删除 ${relatedEdges.length} 条关联关系。`,
    );

    if (!confirmed) {
      return;
    }

    graph.nodes = graph.nodes.filter((item) => item.id !== node.id);
    graph.edges = graph.edges.filter((edge) => edge.from !== node.id && edge.to !== node.id);
    selectedNodeId.value = graph.nodes[0]?.id ?? '';
    selectedEdgeId.value = '';

    try {
      await persistCurrentGraph();
      await persistCurrentBlockOrder();
    } catch {
      // 错误已写入 saveError
    }
  }

  /** 打开新增关系弹窗。 */
  function openCreateEdge(): void {
    const graph = currentGraph.value;

    if (!graph || graph.nodes.length < 2) {
      return;
    }

    const fromNode = selectedNode.value ?? graph.nodes[0];
    const targetNode = findAvailableEdgeTargetNode(graph, fromNode.id);
    saveError.value = '';
    edgeFormMode.value = 'create';
    editingEdgeId.value = '';
    edgeForm.from = fromNode.id;
    edgeForm.to = targetNode?.id ?? '';
    edgeForm.type = '';
    edgeForm.score = null;
    edgeForm.reason = '';
    isEdgeModalOpen.value = true;
  }

  /** 打开编辑关系弹窗。 */
  function openEditSelectedEdge(): void {
    const edge = selectedEdge.value;

    if (!edge) {
      return;
    }

    saveError.value = '';
    edgeFormMode.value = 'edit';
    editingEdgeId.value = edge.id;
    edgeForm.from = edge.from;
    edgeForm.to = edge.to;
    edgeForm.type = edge.current.type;
    edgeForm.score = edge.current.score ?? null;
    edgeForm.reason = edge.current.reason;
    isEdgeModalOpen.value = true;
  }

  /** 关闭关系表单弹窗。 */
  function closeEdgeModal(): void {
    isEdgeModalOpen.value = false;
  }

  /** 提交关系表单，创建或编辑关系。 */
  async function submitEdgeForm(): Promise<void> {
    const graph = currentGraph.value;

    if (!graph || !canSubmitEdgeForm.value) {
      return;
    }

    if (duplicateEdgeMessage.value) {
      saveError.value = duplicateEdgeMessage.value;
      return;
    }

    try {
      const score = edgeForm.score === null ? undefined : edgeForm.score;

      if (edgeFormMode.value === 'create') {
        const edge: RelationGraphEdge = {
          id: createSafeId('edge'),
          from: edgeForm.from,
          to: edgeForm.to,
          current: {
            type: edgeForm.type.trim(),
            score,
            reason: edgeForm.reason.trim(),
          },
          history: [
            {
              id: createSafeId('hist'),
              label: '当前',
              order: Date.now(),
              type: edgeForm.type.trim(),
              score,
              reason: edgeForm.reason.trim() || '创建关系时自动生成的第一条变化记录。',
              createdAt: new Date().toISOString(),
            },
          ],
          customFields: {},
        };

        graph.edges.push(edge);
        selectEdge(edge);
      } else {
        const edge = graph.edges.find((item) => item.id === editingEdgeId.value);

        if (!edge) {
          saveError.value = '要编辑的关系不存在';
          return;
        }

        edge.from = edgeForm.from;
        edge.to = edgeForm.to;
        edge.current = {
          type: edgeForm.type.trim(),
          score,
          reason: edgeForm.reason.trim(),
        };
        selectEdge(edge);
      }

      await persistCurrentGraph();
      closeEdgeModal();
    } catch {
      // 错误已写入 saveError
    }
  }

  /** 打开新增历史记录弹窗。 */
  function openCreateHistory(): void {
    const edge = selectedEdge.value;

    if (!edge) {
      return;
    }

    saveError.value = '';
    historyFormMode.value = 'create';
    editingHistoryId.value = '';
    historyForm.label = '当前';
    historyForm.type = edge.current.type;
    historyForm.score = edge.current.score ?? null;
    historyForm.reason = '';
    isHistoryModalOpen.value = true;
  }

  /**
   * 打开编辑历史记录弹窗。
   * @param record 待编辑历史记录
   */
  function openEditHistory(record: RelationHistoryRecord): void {
    saveError.value = '';
    historyFormMode.value = 'edit';
    editingHistoryId.value = record.id;
    historyForm.label = record.label;
    historyForm.type = record.type;
    historyForm.score = record.score ?? null;
    historyForm.reason = record.reason;
    isHistoryModalOpen.value = true;
  }

  /** 关闭历史记录表单弹窗。 */
  function closeHistoryModal(): void {
    isHistoryModalOpen.value = false;
  }

  /** 提交历史记录表单，创建或编辑时间轴记录。 */
  async function submitHistoryForm(): Promise<void> {
    const edge = selectedEdge.value;

    if (!edge || !canSubmitHistoryForm.value) {
      return;
    }

    try {
      const score = historyForm.score === null ? undefined : historyForm.score;

      if (historyFormMode.value === 'create') {
        const maxOrder = edge.history.reduce(
          (currentMax, record) => Math.max(currentMax, record.order ?? 0),
          0,
        );

        edge.history.push({
          id: createSafeId('hist'),
          label: historyForm.label.trim(),
          order: maxOrder + 1,
          type: historyForm.type.trim(),
          score,
          reason: historyForm.reason.trim(),
          createdAt: new Date().toISOString(),
        });
      } else {
        const record = edge.history.find((item) => item.id === editingHistoryId.value);

        if (!record) {
          saveError.value = '要编辑的历史记录不存在';
          return;
        }

        record.label = historyForm.label.trim();
        record.type = historyForm.type.trim();
        record.score = score;
        record.reason = historyForm.reason.trim();
      }

      await persistCurrentGraph();
      closeHistoryModal();
    } catch {
      // 错误已写入 saveError
    }
  }

  /**
   * 删除关系历史记录。
   * @param recordId 历史记录 ID
   */
  async function deleteHistory(recordId: string): Promise<void> {
    const edge = selectedEdge.value;

    if (!edge) {
      return;
    }

    const confirmed = window.confirm('删除这条关系变化记录？');

    if (!confirmed) {
      return;
    }

    edge.history = edge.history.filter((record) => record.id !== recordId);

    try {
      await persistCurrentGraph();
    } catch {
      // 错误已写入 saveError
    }
  }

  /** 删除当前选中关系，并保存到关系图谱 JSON。 */
  async function deleteSelectedEdge(): Promise<void> {
    const graph = currentGraph.value;
    const edge = selectedEdge.value;

    if (!graph || !edge) {
      return;
    }

    const fromLabel = getEdgeFromNode(edge)?.label ?? edge.from;
    const toLabel = getEdgeToNode(edge)?.label ?? edge.to;
    const confirmed = window.confirm(`删除关系：${fromLabel} -> ${toLabel} / ${edge.current.type}`);

    if (!confirmed) {
      return;
    }

    graph.edges = graph.edges.filter((item) => item.id !== edge.id);
    selectedEdgeId.value = '';

    try {
      await persistCurrentGraph();
    } catch {
      // 错误已写入 saveError
    }
  }

  /**
   * 开始拖拽块列表行。
   * @param nodeId 节点 ID
   */
  function startBlockDrag(nodeId: string): void {
    draggingNodeId.value = nodeId;
  }

  /**
   * 悬停块列表行，记录拖拽插入位置。
   * @param nodeId 节点 ID
   * @param placement 插入位置
   */
  function hoverBlockDropTarget(nodeId: string, placement: BlockDropPlacement): void {
    if (!draggingNodeId.value || draggingNodeId.value === nodeId) {
      return;
    }

    dragOverNodeId.value = nodeId;
    blockDropPlacement.value = placement;
  }

  /**
   * 完成块列表排序，仅影响当前 mock 图谱节点顺序。
   * @param targetNodeId 目标节点 ID
   * @param placement 插入位置
   */
  async function dropBlockOn(targetNodeId: string, placement: BlockDropPlacement): Promise<void> {
    const graph = currentGraph.value;
    const previousNodes = graph?.nodes ? [...graph.nodes] : [];

    if (!graph || !draggingNodeId.value || draggingNodeId.value === targetNodeId) {
      resetBlockDrag();
      return;
    }

    const draggingIndex = graph.nodes.findIndex((node) => node.id === draggingNodeId.value);
    const targetIndex = graph.nodes.findIndex((node) => node.id === targetNodeId);

    if (draggingIndex < 0 || targetIndex < 0) {
      resetBlockDrag();
      return;
    }

    const [draggingNode] = graph.nodes.splice(draggingIndex, 1);
    const nextTargetIndex = graph.nodes.findIndex((node) => node.id === targetNodeId);
    const insertIndex = placement === 'after' ? nextTargetIndex + 1 : nextTargetIndex;
    graph.nodes.splice(insertIndex, 0, draggingNode);
    resetBlockDrag();

    try {
      await persistCurrentBlockOrder();
    } catch {
      graph.nodes = previousNodes;
    }
  }

  /**
   * 重置块列表拖拽状态。
   */
  function resetBlockDrag(): void {
    draggingNodeId.value = '';
    dragOverNodeId.value = '';
  }

  /** 暴露给页面和关系子组件使用的状态与操作。 */
    return {
      CANVAS_WIDTH,
      NODE_WIDTH,
      NODE_HEIGHT,
      graphs,
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
      editingEdgeId,
      edgeForm,
      isHistoryModalOpen,
      historyFormMode,
      editingHistoryId,
      historyForm,
      currentGraph,
      isCharacterDefaultGraph,
      customGraphs,
      filteredNodes,
      selectedNode,
      selectedEdge,
      relationTree,
      visibleTreeNodes,
      visibleTreeEdges,
      treeCanvasHeight,
      selectionMode,
      selectedEdgeHistory,
      graphSummary,
      hasErrorMessage,
      edgeTargetNodes,
      duplicateEdgeForForm,
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
    };
  }

