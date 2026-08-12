import { computed, ref } from 'vue';
import {
  createEmptyPlot,
  createEmptyPlotDescriptionBlock,
  type PlotDescriptionBlock,
  type PlotFile,
} from '@/types';
import {
  deletePlot as deletePlotFile,
  listPlots as loadPlotFiles,
  savePlot,
} from '@/api/plotApi';

/** 剧情库右键菜单目标类型。 */
export type PlotContextTargetType = 'rootPlot' | 'childPlot' | 'descriptionCard' | 'workspace';

/** 剧情库右键菜单动作。 */
export type PlotContextMenuAction =
  | 'openPlot'
  | 'createSiblingPlot'
  | 'createChildPlot'
  | 'renamePlot'
  | 'deletePlot'
  | 'createDescription'
  | 'editDescription'
  | 'moveDescriptionUp'
  | 'moveDescriptionDown'
  | 'deleteDescription';

/** 剧情库右键菜单目标。 */
export interface PlotContextTarget {
  /** 当前右键命中的区域类型。 */
  targetType: PlotContextTargetType;
  /** 命中的剧情块 ID。 */
  plotId?: string;
  /** 命中的说明卡片 ID。 */
  descriptionId?: string;
}

/** 剧情块拖放插入位置。 */
export type PlotDropPlacement = 'before' | 'after';

/** 生成页面会话内的剧情 ID。 */
function createPlotId(): string {
  return `plot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 生成页面会话内的说明卡片 ID。 */
function createDescriptionId(): string {
  return `desc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 按排序字段稳定排序剧情块。 */
function sortPlotsByOrder(left: PlotFile, right: PlotFile): number {
  if (left.order !== right.order) {
    return left.order - right.order;
  }

  return left.title.localeCompare(right.title, 'zh-CN');
}

/** 按排序字段稳定排序说明卡片。 */
function sortDescriptionsByOrder(
  left: PlotDescriptionBlock,
  right: PlotDescriptionBlock,
): number {
  if (left.order !== right.order) {
    return left.order - right.order;
  }

  return left.title.localeCompare(right.title, 'zh-CN');
}

/** 收集指定剧情块的所有后代 ID。 */
function collectDescendantIds(plotId: string, plots: PlotFile[]): Set<string> {
  const descendantIds = new Set<string>();
  const childrenByParentId = new Map<string, PlotFile[]>();

  plots.forEach((plot) => {
    if (!plot.parentId) {
      return;
    }

    const siblings = childrenByParentId.get(plot.parentId) ?? [];
    siblings.push(plot);
    childrenByParentId.set(plot.parentId, siblings);
  });

  function visit(parentId: string): void {
    const children = childrenByParentId.get(parentId) ?? [];

    children.forEach((child) => {
      descendantIds.add(child.id);
      visit(child.id);
    });
  }

  visit(plotId);
  return descendantIds;
}

/** 获取某剧情块的全部祖先和自身，用于面包屑。 */
function resolveBreadcrumb(plotId: string | null, plots: PlotFile[]): PlotFile[] {
  if (!plotId) {
    return [];
  }

  const plotById = new Map(plots.map((plot) => [plot.id, plot]));
  const breadcrumb: PlotFile[] = [];
  let cursor: string | null = plotId;
  const visitedIds = new Set<string>();

  while (cursor) {
    if (visitedIds.has(cursor)) {
      break;
    }

    visitedIds.add(cursor);
    const plot = plotById.get(cursor);

    if (!plot) {
      break;
    }

    breadcrumb.unshift(plot);
    cursor = plot.parentId;
  }

  return breadcrumb;
}

/** 为同一父节点下的剧情块重写连续排序。 */
function normalizeSiblingOrder(plots: PlotFile[], parentId: string | null): PlotFile[] {
  const siblingIds = plots
    .filter((plot) => plot.parentId === parentId)
    .sort(sortPlotsByOrder)
    .map((plot) => plot.id);

  return plots.map((plot) => {
    const order = siblingIds.indexOf(plot.id);
    return order >= 0 ? { ...plot, order } : plot;
  });
}

/**
 * 将同一父剧情下的剧情块移动到目标剧情块前后。
 * 不跨父节点调整层级，避免拖拽排序意外改变剧情结构。
 */
function moveSiblingPlotNear(
  plots: PlotFile[],
  movedPlotId: string,
  targetPlotId: string,
  placement: PlotDropPlacement,
): PlotFile[] {
  if (movedPlotId === targetPlotId) {
    return plots;
  }

  const movedPlot = plots.find((plot) => plot.id === movedPlotId);
  const targetPlot = plots.find((plot) => plot.id === targetPlotId);

  if (!movedPlot || !targetPlot || movedPlot.parentId !== targetPlot.parentId) {
    return plots;
  }

  const orderedSiblingIds = plots
    .filter((plot) => plot.parentId === movedPlot.parentId)
    .sort(sortPlotsByOrder)
    .map((plot) => plot.id)
    .filter((plotId) => plotId !== movedPlotId);
  const targetIndex = orderedSiblingIds.indexOf(targetPlotId);

  if (targetIndex < 0) {
    return plots;
  }

  orderedSiblingIds.splice(placement === 'after' ? targetIndex + 1 : targetIndex, 0, movedPlotId);

  return plots.map((plot) => {
    if (plot.parentId !== movedPlot.parentId) {
      return plot;
    }

    const order = orderedSiblingIds.indexOf(plot.id);
    return order >= 0 ? { ...plot, order } : plot;
  });
}

/** 为说明卡片重写连续排序。 */
function normalizeDescriptionOrder(descriptions: PlotDescriptionBlock[]): PlotDescriptionBlock[] {
  return descriptions
    .sort(sortDescriptionsByOrder)
    .map((description, index) => ({
      ...description,
      order: index,
    }));
}

/** 将未知错误格式化成可以展示给作者的文本。 */
function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** 剧情库页面的文件持久化状态和交互逻辑。 */
export function usePlotLibrary() {
  const plots = ref<PlotFile[]>([]);
  const currentPlotId = ref<string | null>(null);
  const inspectedPlotId = ref<string | null>(null);
  const saveMessage = ref('');
  const errorMessage = ref('');
  const fileErrors = ref<string[]>([]);
  const dataDirectory = ref('');
  const isLoading = ref(false);
  const isSaving = ref(false);
  const draggingPlotId = ref<string | null>(null);
  const dragOverPlotId = ref<string | null>(null);
  const plotDropPlacement = ref<PlotDropPlacement>('before');
  const draggingDescriptionId = ref<string | null>(null);
  const dragOverDescriptionId = ref<string | null>(null);
  const plotSaveQueues = new Map<string, Promise<PlotFile | null>>();

  const rootPlots = computed(() =>
    plots.value.filter((plot) => plot.parentId === null).sort(sortPlotsByOrder),
  );

  const currentPlot = computed(
    () => plots.value.find((plot) => plot.id === currentPlotId.value) ?? null,
  );

  /** 右侧 Inspector 当前展示的剧情块，支持子剧情单击预览。 */
  const inspectedPlot = computed(() => {
    if (inspectedPlotId.value) {
      return plots.value.find((plot) => plot.id === inspectedPlotId.value) ?? currentPlot.value;
    }

    return currentPlot.value;
  });

  const breadcrumbPlots = computed(() => resolveBreadcrumb(currentPlotId.value, plots.value));

  const childPlots = computed(() => {
    if (!currentPlot.value) {
      return [];
    }

    return plots.value.filter((plot) => plot.parentId === currentPlot.value?.id).sort(sortPlotsByOrder);
  });

  const currentDescriptionBlocks = computed(() =>
    [...(inspectedPlot.value?.descriptionBlocks ?? [])].sort(sortDescriptionsByOrder),
  );

  const hasRootPlots = computed(() => rootPlots.value.length > 0);
  const hasChildPlots = computed(() => childPlots.value.length > 0);
  const hasDescriptionBlocks = computed(() => currentDescriptionBlocks.value.length > 0);
  const hasErrorMessage = computed(() =>
    Boolean(errorMessage.value || fileErrors.value.length),
  );

  /** 将单个剧情块保存到本地 JSON 文件。 */
  async function persistPlot(plot: PlotFile): Promise<PlotFile | null> {
    const previousSave = plotSaveQueues.get(plot.id) ?? Promise.resolve(null);
    const nextSave = previousSave
      .catch(() => null)
      .then(async () => {
        isSaving.value = true;

        try {
          const savedPlot = await savePlot(plot);
          errorMessage.value = '';
          return savedPlot;
        } catch (error) {
          errorMessage.value = formatError(error);
          return null;
        }
      });

    plotSaveQueues.set(plot.id, nextSave);

    return nextSave.finally(() => {
      if (plotSaveQueues.get(plot.id) === nextSave) {
        plotSaveQueues.delete(plot.id);
      }

      isSaving.value = plotSaveQueues.size > 0;
    });
  }

  /** 从当前小说项目目录读取剧情块列表。 */
  async function loadPlots(): Promise<void> {
    isLoading.value = true;
    errorMessage.value = '';
    saveMessage.value = '';

    try {
      const result = await loadPlotFiles();
      plots.value = result.plots;
      fileErrors.value = result.errors;
      dataDirectory.value = result.baseDir;

      if (currentPlotId.value && plots.value.some((plot) => plot.id === currentPlotId.value)) {
        if (!inspectedPlotId.value || !plots.value.some((plot) => plot.id === inspectedPlotId.value)) {
          inspectedPlotId.value = currentPlotId.value;
        }

        return;
      }

      currentPlotId.value = rootPlots.value[0]?.id ?? plots.value[0]?.id ?? null;
      inspectedPlotId.value = currentPlotId.value;
    } catch (error) {
      plots.value = [];
      fileErrors.value = [];
      currentPlotId.value = null;
      inspectedPlotId.value = null;
      errorMessage.value = formatError(error);
    } finally {
      isLoading.value = false;
    }
  }

  /** 进入指定剧情层。 */
  function openPlot(plotId: string): void {
    if (!plots.value.some((plot) => plot.id === plotId)) {
      return;
    }

    currentPlotId.value = plotId;
    inspectedPlotId.value = plotId;
    saveMessage.value = '';
    errorMessage.value = '';
  }

  /** 只切换右侧 Inspector 展示的剧情块，不改变当前剧情层级。 */
  function inspectPlot(plotId: string): void {
    if (!plots.value.some((plot) => plot.id === plotId)) {
      return;
    }

    inspectedPlotId.value = plotId;
    saveMessage.value = '';
    errorMessage.value = '';
  }

  /** 更新右侧 Inspector 展示剧情块的基础字段，并保存对应 JSON 文件。 */
  function updateCurrentPlotField(field: 'title' | 'summary', value: string): void {
    const plotId = inspectedPlot.value?.id;

    if (!plotId) {
      return;
    }

    let nextPlot: PlotFile | null = null;

    plots.value = plots.value.map((plot) => {
      if (plot.id !== plotId) {
        return plot;
      }

      nextPlot = {
        ...plot,
        [field]: field === 'title' ? value.trimStart() : value,
      };

      return nextPlot;
    });

    if (nextPlot) {
      void persistPlot(nextPlot);
    }
  }

  /** 创建根剧情块并保存到 `plots/*.json`。 */
  async function createRootPlot(): Promise<void> {
    const nextPlot = createEmptyPlot(createPlotId(), '未命名剧情块', null, rootPlots.value.length);
    const savedPlot = await persistPlot(nextPlot);

    if (!savedPlot) {
      return;
    }

    plots.value = [...plots.value, savedPlot];
    currentPlotId.value = savedPlot.id;
    inspectedPlotId.value = savedPlot.id;
    // saveMessage.value = '已创建一级剧情块。';
  }

  /** 给指定剧情块创建直接子剧情并保存到 `plots/*.json`。 */
  async function createChildPlot(parentId = currentPlot.value?.id ?? null): Promise<void> {
    if (!parentId) {
      await createRootPlot();
      return;
    }

    const childCount = plots.value.filter((plot) => plot.parentId === parentId).length;
    const nextPlot = createEmptyPlot(createPlotId(), '未命名子剧情', parentId, childCount);
    const savedPlot = await persistPlot(nextPlot);

    if (!savedPlot) {
      return;
    }

    plots.value = [...plots.value, savedPlot];
    currentPlotId.value = savedPlot.id;
    inspectedPlotId.value = savedPlot.id;
    // saveMessage.value = '已创建子剧情。';
  }

  /** 给指定剧情块创建同级剧情并保存到 `plots/*.json`。 */
  async function createSiblingPlot(plotId: string): Promise<void> {
    const targetPlot = plots.value.find((plot) => plot.id === plotId);

    if (!targetPlot) {
      return;
    }

    const siblingCount = plots.value.filter((plot) => plot.parentId === targetPlot.parentId).length;
    const nextPlot = createEmptyPlot(createPlotId(), '未命名同级剧情', targetPlot.parentId, siblingCount);
    const savedPlot = await persistPlot(nextPlot);

    if (!savedPlot) {
      return;
    }

    plots.value = [...plots.value, savedPlot];
    currentPlotId.value = savedPlot.id;
    inspectedPlotId.value = savedPlot.id;
    // saveMessage.value = '已创建同级剧情。';
  }

  /** 删除指定剧情块及其全部后代，并删除对应 JSON 文件。 */
  async function deletePlot(plotId = currentPlot.value?.id ?? ''): Promise<void> {
    const targetPlot = plots.value.find((plot) => plot.id === plotId);

    if (!targetPlot) {
      return;
    }

    const deletedIds = collectDescendantIds(plotId, plots.value);
    deletedIds.add(plotId);
    const parentId = targetPlot.parentId;
    const previousPlots = plots.value;
    const nextPlots = normalizeSiblingOrder(
      plots.value.filter((plot) => !deletedIds.has(plot.id)),
      parentId,
    );
    const changedRemainingPlots = nextPlots.filter((nextPlot) => {
      const previousPlot = previousPlots.find((plot) => plot.id === nextPlot.id);
      return previousPlot ? previousPlot.order !== nextPlot.order : false;
    });

    isSaving.value = true;

    try {
      await Promise.all(plotSaveQueues.values());
      await Promise.all(Array.from(deletedIds).map((deletedId) => deletePlotFile(deletedId)));
      await Promise.all(changedRemainingPlots.map((plot) => savePlot(plot)));
      plots.value = nextPlots;
      currentPlotId.value =
        (parentId && plots.value.some((plot) => plot.id === parentId) ? parentId : rootPlots.value[0]?.id) ??
        null;
      inspectedPlotId.value = currentPlotId.value;
      saveMessage.value = `已删除 ${deletedIds.size} 个剧情块。`;
      errorMessage.value = '';
    } catch (error) {
      errorMessage.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  /** 创建右侧 Inspector 展示剧情块内的说明卡片，并保存对应 JSON 文件。 */
  async function createDescriptionBlock(plotId = inspectedPlot.value?.id ?? ''): Promise<void> {
    const targetPlot = plots.value.find((plot) => plot.id === plotId);

    if (!targetPlot) {
      return;
    }

    const nextDescription = createEmptyPlotDescriptionBlock(
      createDescriptionId(),
      '未命名说明',
      targetPlot.descriptionBlocks.length,
    );
    const nextPlot: PlotFile = {
      ...targetPlot,
      descriptionBlocks: [...targetPlot.descriptionBlocks, nextDescription],
    };
    const savedPlot = await persistPlot(nextPlot);

    if (!savedPlot) {
      return;
    }

    plots.value = plots.value.map((plot) => (plot.id === savedPlot.id ? savedPlot : plot));
    inspectedPlotId.value = savedPlot.id;
    // saveMessage.value = '已新增说明卡片。';
  }

  /** 更新右侧 Inspector 展示剧情块内的说明卡片，并保存对应 JSON 文件。 */
  function updateDescriptionBlock(
    descriptionId: string,
    patch: Partial<Pick<PlotDescriptionBlock, 'title' | 'content'>>,
  ): void {
    const plotId = inspectedPlot.value?.id;

    if (!plotId) {
      return;
    }

    let nextPlot: PlotFile | null = null;

    plots.value = plots.value.map((plot) => {
      if (plot.id !== plotId) {
        return plot;
      }

      nextPlot = {
        ...plot,
        descriptionBlocks: plot.descriptionBlocks.map((description) =>
          description.id === descriptionId
            ? {
                ...description,
                ...patch,
              }
            : description,
        ),
      };

      return nextPlot;
    });

    if (nextPlot) {
      void persistPlot(nextPlot);
    }
  }

  /** 删除右侧 Inspector 展示剧情块内的说明卡片，并保存对应 JSON 文件。 */
  async function deleteDescriptionBlock(descriptionId: string): Promise<void> {
    const plotId = inspectedPlot.value?.id;
    const targetPlot = inspectedPlot.value;

    if (!plotId || !targetPlot) {
      return;
    }

    const nextPlot: PlotFile = {
      ...targetPlot,
      descriptionBlocks: normalizeDescriptionOrder(
        targetPlot.descriptionBlocks.filter((description) => description.id !== descriptionId),
      ),
    };
    const savedPlot = await persistPlot(nextPlot);

    if (!savedPlot) {
      return;
    }

    plots.value = plots.value.map((plot) => (plot.id === savedPlot.id ? savedPlot : plot));
    // saveMessage.value = '已删除说明卡片。';
  }

  /** 上下移动右侧 Inspector 展示剧情块内的说明卡片，并保存对应 JSON 文件。 */
  async function moveDescriptionBlock(
    descriptionId: string,
    direction: 'up' | 'down',
  ): Promise<void> {
    const targetPlot = inspectedPlot.value;

    if (!targetPlot) {
      return;
    }

    const descriptions = normalizeDescriptionOrder([...targetPlot.descriptionBlocks]);
    const currentIndex = descriptions.findIndex((description) => description.id === descriptionId);
    const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= descriptions.length) {
      return;
    }

    const [movedDescription] = descriptions.splice(currentIndex, 1);
    descriptions.splice(nextIndex, 0, movedDescription);

    const nextPlot: PlotFile = {
      ...targetPlot,
      descriptionBlocks: descriptions.map((description, index) => ({
        ...description,
        order: index,
      })),
    };
    const savedPlot = await persistPlot(nextPlot);

    if (!savedPlot) {
      return;
    }

    plots.value = plots.value.map((plot) => (plot.id === savedPlot.id ? savedPlot : plot));
  }

  /** 开始拖动说明卡片。 */
  function startDescriptionDrag(descriptionId: string): void {
    draggingDescriptionId.value = descriptionId;
    dragOverDescriptionId.value = descriptionId;
  }

  /** 悬停到说明卡片拖放目标。 */
  function hoverDescriptionDropTarget(descriptionId: string): void {
    if (!draggingDescriptionId.value || draggingDescriptionId.value === descriptionId) {
      dragOverDescriptionId.value = null;
      return;
    }

    dragOverDescriptionId.value = descriptionId;
  }

  /** 清理说明卡片拖放状态。 */
  function resetDescriptionDrag(): void {
    draggingDescriptionId.value = null;
    dragOverDescriptionId.value = null;
  }

  /** 将当前拖动的说明卡片放到目标卡片位置，并保存当前剧情块 JSON 文件。 */
  async function dropDescriptionOn(targetDescriptionId: string): Promise<void> {
    const movedDescriptionId = draggingDescriptionId.value;
    resetDescriptionDrag();

    if (!movedDescriptionId || movedDescriptionId === targetDescriptionId || !inspectedPlot.value) {
      return;
    }

    const descriptions = normalizeDescriptionOrder([...inspectedPlot.value.descriptionBlocks]);
    const sourceIndex = descriptions.findIndex((description) => description.id === movedDescriptionId);
    const targetIndex = descriptions.findIndex((description) => description.id === targetDescriptionId);

    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const [movedDescription] = descriptions.splice(sourceIndex, 1);
    descriptions.splice(targetIndex, 0, movedDescription);

    const nextPlot: PlotFile = {
      ...inspectedPlot.value,
      descriptionBlocks: descriptions.map((description, index) => ({
        ...description,
        order: index,
      })),
    };
    const savedPlot = await persistPlot(nextPlot);

    if (!savedPlot) {
      return;
    }

    plots.value = plots.value.map((plot) => (plot.id === savedPlot.id ? savedPlot : plot));
    // saveMessage.value = '已调整说明卡片顺序。';
  }

  /** 开始拖动剧情块。 */
  function startPlotDrag(plotId: string): void {
    if (isSaving.value || isLoading.value) {
      return;
    }

    draggingPlotId.value = plotId;
    dragOverPlotId.value = plotId;
    plotDropPlacement.value = 'before';
  }

  /** 记录当前拖动悬停的剧情块，用于高亮潜在插入位置。 */
  function hoverPlotDropTarget(plotId: string, placement: PlotDropPlacement): void {
    if (!draggingPlotId.value || draggingPlotId.value === plotId) {
      dragOverPlotId.value = null;
      return;
    }

    const movedPlot = plots.value.find((plot) => plot.id === draggingPlotId.value);
    const targetPlot = plots.value.find((plot) => plot.id === plotId);

    if (!movedPlot || !targetPlot || movedPlot.parentId !== targetPlot.parentId) {
      dragOverPlotId.value = null;
      return;
    }

    dragOverPlotId.value = plotId;
    plotDropPlacement.value = placement;
  }

  /** 清理剧情块拖拽状态。 */
  function resetPlotDrag(): void {
    draggingPlotId.value = null;
    dragOverPlotId.value = null;
    plotDropPlacement.value = 'before';
  }

  /**
   * 完成剧情块拖放并保存同级剧情块 order。
   * 保存失败时回滚本次视觉顺序，避免界面和 JSON 文件不一致。
   */
  async function dropPlotOn(targetPlotId: string, placement: PlotDropPlacement): Promise<void> {
    const movedPlotId = draggingPlotId.value;
    resetPlotDrag();

    if (!movedPlotId || movedPlotId === targetPlotId) {
      return;
    }

    const previousPlots = plots.value;
    const nextPlots = moveSiblingPlotNear(previousPlots, movedPlotId, targetPlotId, placement);

    if (nextPlots === previousPlots) {
      return;
    }

    const changedPlots = nextPlots.filter((nextPlot) => {
      const previousPlot = previousPlots.find((plot) => plot.id === nextPlot.id);
      return previousPlot ? previousPlot.order !== nextPlot.order : false;
    });

    plots.value = nextPlots;
    currentPlotId.value = movedPlotId;
    inspectedPlotId.value = movedPlotId;
    isSaving.value = true;
    saveMessage.value = '';
    errorMessage.value = '';

    try {
      const savedPlots = await Promise.all(changedPlots.map((plot) => persistPlot(plot)));

      if (savedPlots.some((plot) => plot === null)) {
        throw new Error(errorMessage.value || '剧情块排序保存失败');
      }
    } catch (error) {
      plots.value = previousPlots;
      errorMessage.value = formatError(error);
    } finally {
      isSaving.value = plotSaveQueues.size > 0;
    }
  }

  /** 执行前端模拟右键菜单动作。 */
  async function handleContextMenuAction(
    action: PlotContextMenuAction,
    target: PlotContextTarget,
  ): Promise<void> {
    const targetPlotId = target.plotId ?? inspectedPlot.value?.id ?? currentPlot.value?.id ?? '';

    if (action === 'openPlot' && targetPlotId) {
      openPlot(targetPlotId);
      return;
    }

    if (action === 'createSiblingPlot' && targetPlotId) {
      await createSiblingPlot(targetPlotId);
      return;
    }

    if (action === 'createChildPlot') {
      await createChildPlot(targetPlotId || undefined);
      return;
    }

    if (action === 'renamePlot' && targetPlotId) {
      inspectPlot(targetPlotId);
      saveMessage.value = '可在右侧内容区直接修改剧情块名称。';
      return;
    }

    if (action === 'deletePlot' && targetPlotId) {
      await deletePlot(targetPlotId);
      return;
    }

    if (action === 'createDescription') {
      await createDescriptionBlock(targetPlotId);
      return;
    }

    if (action === 'editDescription') {
      saveMessage.value = '可在说明卡片内直接编辑名称和内容。';
      return;
    }

    if (action === 'moveDescriptionUp' && target.descriptionId) {
      await moveDescriptionBlock(target.descriptionId, 'up');
      return;
    }

    if (action === 'moveDescriptionDown' && target.descriptionId) {
      await moveDescriptionBlock(target.descriptionId, 'down');
      return;
    }

    if (action === 'deleteDescription' && target.descriptionId) {
      await deleteDescriptionBlock(target.descriptionId);
    }
  }

  return {
    plots,
    rootPlots,
    currentPlot,
    inspectedPlot,
    breadcrumbPlots,
    childPlots,
    currentDescriptionBlocks,
    saveMessage,
    errorMessage,
    fileErrors,
    dataDirectory,
    isLoading,
    isSaving,
    draggingPlotId,
    dragOverPlotId,
    plotDropPlacement,
    draggingDescriptionId,
    dragOverDescriptionId,
    hasRootPlots,
    hasChildPlots,
    hasDescriptionBlocks,
    hasErrorMessage,
    loadPlots,
    openPlot,
    inspectPlot,
    updateCurrentPlotField,
    createRootPlot,
    createChildPlot,
    createSiblingPlot,
    deletePlot,
    createDescriptionBlock,
    updateDescriptionBlock,
    deleteDescriptionBlock,
    moveDescriptionBlock,
    startPlotDrag,
    hoverPlotDropTarget,
    resetPlotDrag,
    dropPlotOn,
    startDescriptionDrag,
    hoverDescriptionDropTarget,
    resetDescriptionDrag,
    dropDescriptionOn,
    handleContextMenuAction,
  };
}
