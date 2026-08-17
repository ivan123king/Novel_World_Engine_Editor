import { computed, ref } from 'vue';
import {
  createEmptyPlot,
  createEmptyPlotDescriptionBlock,
  type PlotDescriptionBlock,
  type PlotFile,
  type PlotIndexEntry,
} from '@/types';
import {
  deletePlot as deletePlotFile,
  listPlotRoots,
  loadPlotLayer as loadPlotLayerFile,
  savePlot,
  savePlotOrder,
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

/** 说明卡片弹框提交的数据。 */
interface PlotDescriptionDraft {
  /** 说明卡片名称。 */
  title: string;
  /** 说明卡片正文内容。 */
  content: string;
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

/** 从完整剧情块创建轻量索引条目。 */
function createEntryFromPlot(plot: PlotFile, childCount = 0): PlotIndexEntry {
  return {
    id: plot.id,
    title: plot.title,
    summary: plot.summary,
    parentId: plot.parentId,
    order: plot.order,
    childCount,
  };
}

/** 按排序字段稳定排序剧情索引条目。 */
function sortPlotEntries(left: PlotIndexEntry, right: PlotIndexEntry): number {
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

/** 为说明卡片重写连续排序。 */
function normalizeDescriptionOrder(descriptions: PlotDescriptionBlock[]): PlotDescriptionBlock[] {
  return descriptions
    .sort(sortDescriptionsByOrder)
    .map((description, index) => ({
      ...description,
      order: index,
    }));
}

/**
 * 将同一父剧情下的剧情块移动到目标剧情块前后。
 * 不跨父节点调整层级，避免拖拽排序意外改变剧情结构。
 */
function moveSiblingEntryNear(
  entries: PlotIndexEntry[],
  movedPlotId: string,
  targetPlotId: string,
  placement: PlotDropPlacement,
): PlotIndexEntry[] {
  if (movedPlotId === targetPlotId) {
    return entries;
  }

  const movedEntry = entries.find((entry) => entry.id === movedPlotId);
  const targetEntry = entries.find((entry) => entry.id === targetPlotId);

  if (!movedEntry || !targetEntry || movedEntry.parentId !== targetEntry.parentId) {
    return entries;
  }

  const orderedIds = [...entries]
    .sort(sortPlotEntries)
    .map((entry) => entry.id)
    .filter((plotId) => plotId !== movedPlotId);
  const targetIndex = orderedIds.indexOf(targetPlotId);

  if (targetIndex < 0) {
    return entries;
  }

  orderedIds.splice(placement === 'after' ? targetIndex + 1 : targetIndex, 0, movedPlotId);

  return orderedIds.map((plotId, order) => ({
    ...entries.find((entry) => entry.id === plotId)!,
    order,
  }));
}

/** 将未知错误格式化成可以展示给作者的文本。 */
function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** 剧情库页面的索引化持久化状态和交互逻辑。 */
export function usePlotLibrary() {
  const plotById = ref(new Map<string, PlotFile>());
  const entryById = ref(new Map<string, PlotIndexEntry>());
  const childrenByParentId = ref(new Map<string | null, PlotIndexEntry[]>());
  const currentPlotId = ref<string | null>(null);
  const inspectedPlotId = ref<string | null>(null);
  const breadcrumbPlots = ref<PlotIndexEntry[]>([]);
  const totalPlotCount = ref(0);
  const saveMessage = ref('');
  const errorMessage = ref('');
  const fileErrors = ref<string[]>([]);
  const dataDirectory = ref('');
  const isLoading = ref(false);
  const isLayerLoading = ref(false);
  const isSaving = ref(false);
  const draggingPlotId = ref<string | null>(null);
  const dragOverPlotId = ref<string | null>(null);
  const plotDropPlacement = ref<PlotDropPlacement>('before');
  const draggingDescriptionId = ref<string | null>(null);
  const dragOverDescriptionId = ref<string | null>(null);
  const plotSaveQueues = new Map<string, Promise<PlotFile | null>>();
  let layerLoadToken = 0;

  const plots = computed(() => Array.from(plotById.value.values()));
  const rootPlots = computed(() =>
    [...(childrenByParentId.value.get(null) ?? [])].sort(sortPlotEntries),
  );

  const currentPlot = computed(() =>
    currentPlotId.value ? plotById.value.get(currentPlotId.value) ?? null : null,
  );

  /** 右侧 Inspector 当前展示的剧情块，懒加载后只包含已读取详情的节点。 */
  const inspectedPlot = computed(() => {
    if (inspectedPlotId.value) {
      return plotById.value.get(inspectedPlotId.value) ?? currentPlot.value;
    }

    return currentPlot.value;
  });

  const childPlots = computed(() => {
    if (!currentPlotId.value) {
      return [];
    }

    return [...(childrenByParentId.value.get(currentPlotId.value) ?? [])].sort(sortPlotEntries);
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

  /** 在缓存中批量写入剧情索引条目。 */
  function cacheEntries(entries: PlotIndexEntry[]): void {
    const nextEntryById = new Map(entryById.value);

    entries.forEach((entry) => {
      nextEntryById.set(entry.id, entry);
    });

    entryById.value = nextEntryById;
  }

  /**
   * 缓存某个父剧情下的直接子剧情索引。
   * @param parentId 父剧情 ID，根层传 null
   * @param children 直接子剧情索引
   */
  function cacheChildren(parentId: string | null, children: PlotIndexEntry[]): void {
    const sortedChildren = [...children].sort(sortPlotEntries);
    const nextChildrenByParentId = new Map(childrenByParentId.value);

    nextChildrenByParentId.set(parentId, sortedChildren);
    childrenByParentId.value = nextChildrenByParentId;
    cacheEntries(sortedChildren);
  }

  /** 缓存完整剧情详情，并同步轻量索引标题、简介和排序。 */
  function cachePlot(plot: PlotFile): PlotIndexEntry {
    const nextPlotById = new Map(plotById.value);
    const currentEntry = entryById.value.get(plot.id);
    const knownChildren = childrenByParentId.value.get(plot.id);
    const entry = createEntryFromPlot(plot, currentEntry?.childCount ?? knownChildren?.length ?? 0);

    nextPlotById.set(plot.id, plot);
    plotById.value = nextPlotById;
    cacheEntries([entry]);
    replaceEntryInChildren(entry);

    return entry;
  }

  /** 替换已缓存子列表中的同 ID 索引条目。 */
  function replaceEntryInChildren(entry: PlotIndexEntry): void {
    const nextChildrenByParentId = new Map(childrenByParentId.value);

    nextChildrenByParentId.forEach((children, parentId) => {
      if (!children.some((child) => child.id === entry.id)) {
        return;
      }

      nextChildrenByParentId.set(
        parentId,
        children.map((child) => (child.id === entry.id ? entry : child)).sort(sortPlotEntries),
      );
    });

    childrenByParentId.value = nextChildrenByParentId;
  }

  /** 将新索引条目追加进已缓存的同级列表。 */
  function appendEntryToCachedChildren(entry: PlotIndexEntry): void {
    const siblings = childrenByParentId.value.get(entry.parentId);

    if (!siblings) {
      return;
    }

    cacheChildren(entry.parentId, [...siblings, entry]);
  }

  /** 更新某个索引条目的直接子剧情数量。 */
  function updateEntryChildCount(plotId: string, childCount: number): void {
    const entry = entryById.value.get(plotId);

    if (!entry) {
      return;
    }

    const nextEntry = {
      ...entry,
      childCount,
    };

    cacheEntries([nextEntry]);
    replaceEntryInChildren(nextEntry);
  }

  /** 从已缓存索引中解析面包屑路径。 */
  function resolveCachedBreadcrumb(plotId: string): PlotIndexEntry[] {
    const breadcrumb: PlotIndexEntry[] = [];
    let cursor: string | null = plotId;
    const visitedIds = new Set<string>();

    while (cursor) {
      if (visitedIds.has(cursor)) {
        break;
      }

      visitedIds.add(cursor);
      const entry = entryById.value.get(cursor);

      if (!entry) {
        break;
      }

      breadcrumb.unshift(entry);
      cursor = entry.parentId;
    }

    return breadcrumb;
  }

  /** 从缓存中移除一批剧情块。 */
  function removePlotsFromCache(plotIds: string[]): void {
    const removedIds = new Set(plotIds);
    const nextPlotById = new Map(plotById.value);
    const nextEntryById = new Map(entryById.value);
    const nextChildrenByParentId = new Map<string | null, PlotIndexEntry[]>();

    plotIds.forEach((plotId) => {
      nextPlotById.delete(plotId);
      nextEntryById.delete(plotId);
    });

    childrenByParentId.value.forEach((children, parentId) => {
      if (parentId && removedIds.has(parentId)) {
        return;
      }

      nextChildrenByParentId.set(
        parentId,
        children.filter((child) => !removedIds.has(child.id)),
      );
    });

    plotById.value = nextPlotById;
    entryById.value = nextEntryById;
    childrenByParentId.value = nextChildrenByParentId;
  }

  /** 将单个剧情块保存到本地 JSON 文件并同步本地缓存。 */
  async function persistPlot(plot: PlotFile): Promise<PlotFile | null> {
    const previousSave = plotSaveQueues.get(plot.id) ?? Promise.resolve(null);
    const nextSave = previousSave
      .catch(() => null)
      .then(async () => {
        isSaving.value = true;

        try {
          const savedPlot = await savePlot(plot);
          cachePlot(savedPlot);
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

  /** 从当前小说项目目录读取一级剧情块索引。 */
  async function loadPlots(): Promise<void> {
    isLoading.value = true;
    errorMessage.value = '';
    saveMessage.value = '';
    layerLoadToken += 1;
    isLayerLoading.value = false;

    try {
      const result = await listPlotRoots();

      plotById.value = new Map();
      entryById.value = new Map();
      childrenByParentId.value = new Map();
      cacheChildren(null, result.roots);
      fileErrors.value = result.errors;
      dataDirectory.value = result.baseDir;
      totalPlotCount.value = result.totalCount;
      currentPlotId.value = null;
      inspectedPlotId.value = null;
      breadcrumbPlots.value = [];
    } catch (error) {
      plotById.value = new Map();
      entryById.value = new Map();
      childrenByParentId.value = new Map();
      fileErrors.value = [];
      totalPlotCount.value = 0;
      currentPlotId.value = null;
      inspectedPlotId.value = null;
      breadcrumbPlots.value = [];
      errorMessage.value = formatError(error);
    } finally {
      isLoading.value = false;
    }
  }

  /** 进入指定剧情层，并读取它的详情和直接子剧情。 */
  async function openPlot(plotId: string): Promise<void> {
    if (!entryById.value.has(plotId) && !plotById.value.has(plotId)) {
      return;
    }

    const requestToken = ++layerLoadToken;
    isLayerLoading.value = true;
    saveMessage.value = '';
    errorMessage.value = '';

    try {
      const result = await loadPlotLayerFile(plotId);

      if (requestToken !== layerLoadToken) {
        return;
      }

      const entry = cachePlot(result.plot);

      cacheEntries(result.breadcrumb);
      cacheChildren(result.plot.id, result.children);
      fileErrors.value = result.errors;
      dataDirectory.value = result.baseDir;
      currentPlotId.value = result.plot.id;
      inspectedPlotId.value = result.plot.id;
      breadcrumbPlots.value = result.breadcrumb.length > 0 ? result.breadcrumb : [entry];
    } catch (error) {
      if (requestToken === layerLoadToken) {
        errorMessage.value = formatError(error);
      }
    } finally {
      if (requestToken === layerLoadToken) {
        isLayerLoading.value = false;
      }
    }
  }

  /** 只切换右侧 Inspector 展示的剧情块；未加载详情时只读取详情，不改变当前剧情层级。 */
  async function inspectPlot(plotId: string): Promise<void> {
    if (plotById.value.has(plotId)) {
      inspectedPlotId.value = plotId;
      saveMessage.value = '';
      errorMessage.value = '';
      return;
    }

    if (!entryById.value.has(plotId)) {
      return;
    }

    const requestToken = ++layerLoadToken;
    isLayerLoading.value = true;
    saveMessage.value = '';
    errorMessage.value = '';

    try {
      const result = await loadPlotLayerFile(plotId);

      if (requestToken !== layerLoadToken) {
        return;
      }

      const entry = cachePlot(result.plot);

      cacheEntries(result.breadcrumb.length > 0 ? result.breadcrumb : [entry]);
      cacheChildren(result.plot.id, result.children);
      fileErrors.value = result.errors;
      dataDirectory.value = result.baseDir;
      inspectedPlotId.value = result.plot.id;
    } catch (error) {
      if (requestToken === layerLoadToken) {
        errorMessage.value = formatError(error);
      }
    } finally {
      if (requestToken === layerLoadToken) {
        isLayerLoading.value = false;
      }
    }
  }

  /** 更新右侧 Inspector 展示剧情块的基础字段，并保存对应 JSON 文件。 */
  function updateCurrentPlotField(field: 'title' | 'summary', value: string): void {
    const plotId = inspectedPlot.value?.id;

    if (!plotId) {
      return;
    }

    const current = plotById.value.get(plotId);

    if (!current) {
      return;
    }

    const nextPlot: PlotFile = {
      ...current,
      [field]: field === 'title' ? value.trimStart() : value,
    };

    cachePlot(nextPlot);
    breadcrumbPlots.value = resolveCachedBreadcrumb(currentPlotId.value ?? plotId);
    void persistPlot(nextPlot);
  }

  /**
   * 从已缓存的完整剧情或轻量索引中读取剧情名称。
   * 供右键重命名弹框初始化输入值，不依赖右侧 Inspector 当前展示状态。
   */
  function getPlotTitle(plotId: string): string {
    return plotById.value.get(plotId)?.title ?? entryById.value.get(plotId)?.title ?? '';
  }

  /**
   * 重命名指定剧情块并保存到本地 JSON 文件。
   * 若目标剧情尚未加载完整详情，则先读取该剧情层级，但不切换当前页面层级。
   */
  async function renamePlot(plotId: string, title: string): Promise<boolean> {
    const nextTitle = title.trim();

    if (!nextTitle) {
      errorMessage.value = '剧情名称不能为空。';
      return false;
    }

    let targetPlot = plotById.value.get(plotId);

    if (!targetPlot) {
      try {
        const result = await loadPlotLayerFile(plotId);
        const entry = cachePlot(result.plot);

        cacheEntries(result.breadcrumb.length > 0 ? result.breadcrumb : [entry]);
        cacheChildren(result.plot.id, result.children);
        fileErrors.value = result.errors;
        dataDirectory.value = result.baseDir;
        targetPlot = result.plot;
      } catch (error) {
        errorMessage.value = formatError(error);
        return false;
      }
    }

    const nextPlot: PlotFile = {
      ...targetPlot,
      title: nextTitle,
    };

    cachePlot(nextPlot);

    if (currentPlotId.value) {
      breadcrumbPlots.value = resolveCachedBreadcrumb(currentPlotId.value);
    }

    const savedPlot = await persistPlot(nextPlot);

    if (!savedPlot) {
      return false;
    }

    if (currentPlotId.value) {
      breadcrumbPlots.value = resolveCachedBreadcrumb(currentPlotId.value);
    }

    saveMessage.value = '已重命名剧情块。';
    return true;
  }

  /** 创建根剧情块并保存到 `plots/*.json`。 */
  async function createRootPlot(): Promise<void> {
    const nextPlot = createEmptyPlot(createPlotId(), '未命名剧情块', null, rootPlots.value.length);
    const savedPlot = await persistPlot(nextPlot);

    if (!savedPlot) {
      return;
    }

    const entry = cachePlot(savedPlot);

    appendEntryToCachedChildren(entry);
    cacheChildren(savedPlot.id, []);
    totalPlotCount.value += 1;
    currentPlotId.value = savedPlot.id;
    inspectedPlotId.value = savedPlot.id;
    breadcrumbPlots.value = [entry];
  }

  /** 给指定剧情块创建直接子剧情并保存到 `plots/*.json`。 */
  async function createChildPlot(parentId = currentPlot.value?.id ?? null): Promise<void> {
    if (!parentId) {
      await createRootPlot();
      return;
    }

    const parentEntry = entryById.value.get(parentId);
    const loadedChildren = childrenByParentId.value.get(parentId);
    const childCount = loadedChildren?.length ?? parentEntry?.childCount ?? 0;
    const nextPlot = createEmptyPlot(createPlotId(), '未命名子剧情', parentId, childCount);
    const savedPlot = await persistPlot(nextPlot);

    if (!savedPlot) {
      return;
    }

    const entry = cachePlot(savedPlot);

    appendEntryToCachedChildren(entry);
    cacheChildren(savedPlot.id, []);
    totalPlotCount.value += 1;
    updateEntryChildCount(parentId, childCount + 1);
    currentPlotId.value = savedPlot.id;
    inspectedPlotId.value = savedPlot.id;
    breadcrumbPlots.value = resolveCachedBreadcrumb(savedPlot.id);
  }

  /** 给指定剧情块创建同级剧情并保存到 `plots/*.json`。 */
  async function createSiblingPlot(plotId: string): Promise<void> {
    const targetEntry = entryById.value.get(plotId);

    if (!targetEntry) {
      return;
    }

    const siblings = childrenByParentId.value.get(targetEntry.parentId) ?? [];
    const siblingCount = siblings.length > 0
      ? siblings.length
      : Array.from(entryById.value.values()).filter(
          (entry) => entry.parentId === targetEntry.parentId,
        ).length;
    const nextPlot = createEmptyPlot(
      createPlotId(),
      '未命名同级剧情',
      targetEntry.parentId,
      siblingCount,
    );
    const savedPlot = await persistPlot(nextPlot);

    if (!savedPlot) {
      return;
    }

    const entry = cachePlot(savedPlot);

    appendEntryToCachedChildren(entry);
    cacheChildren(savedPlot.id, []);
    totalPlotCount.value += 1;
    currentPlotId.value = savedPlot.id;
    inspectedPlotId.value = savedPlot.id;
    breadcrumbPlots.value = resolveCachedBreadcrumb(savedPlot.id);
  }

  /** 删除指定剧情块及其全部后代，并让 main process 根据索引计算子树。 */
  async function deletePlot(plotId = currentPlot.value?.id ?? ''): Promise<void> {
    const targetEntry = entryById.value.get(plotId);

    if (!targetEntry) {
      return;
    }

    isSaving.value = true;

    try {
      await Promise.all(plotSaveQueues.values());
      const result = await deletePlotFile(plotId);

      removePlotsFromCache(result.deletedIds);
      cacheChildren(result.parentId, result.siblings);
      totalPlotCount.value = Math.max(0, totalPlotCount.value - result.deletedIds.length);

      if (result.parentId) {
        updateEntryChildCount(result.parentId, result.siblings.length);
      }

      if (result.parentId && entryById.value.has(result.parentId)) {
        if (plotById.value.has(result.parentId)) {
          currentPlotId.value = result.parentId;
          inspectedPlotId.value = result.parentId;
          breadcrumbPlots.value = resolveCachedBreadcrumb(result.parentId);
        } else {
          await openPlot(result.parentId);
        }
      } else {
        currentPlotId.value = null;
        inspectedPlotId.value = null;
        breadcrumbPlots.value = [];
      }

      saveMessage.value = `已删除 ${result.deletedIds.length} 个剧情块。`;
      errorMessage.value = '';
    } catch (error) {
      errorMessage.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  /** 创建右侧 Inspector 展示剧情块内的说明卡片，并保存对应 JSON 文件。 */
  async function createDescriptionBlock(
    plotId = inspectedPlot.value?.id ?? '',
    draft: Partial<PlotDescriptionDraft> = {},
  ): Promise<boolean> {
    const targetPlot = plotById.value.get(plotId);

    if (!targetPlot) {
      return false;
    }

    const nextDescription = createEmptyPlotDescriptionBlock(
      createDescriptionId(),
      draft.title?.trim() || '未命名说明',
      0,
    );
    const orderedDescriptions = normalizeDescriptionOrder(targetPlot.descriptionBlocks);
    const nextPlot: PlotFile = {
      ...targetPlot,
      descriptionBlocks: [
        {
          ...nextDescription,
          content: draft.content ?? '',
        },
        ...orderedDescriptions,
      ].map((description, index) => ({
        ...description,
        order: index,
      })),
    };
    const savedPlot = await persistPlot(nextPlot);

    if (!savedPlot) {
      return false;
    }

    inspectedPlotId.value = savedPlot.id;
    return true;
  }

  /** 更新右侧 Inspector 展示剧情块内的说明卡片，并保存对应 JSON 文件。 */
  async function updateDescriptionBlock(
    descriptionId: string,
    patch: Partial<Pick<PlotDescriptionBlock, 'title' | 'content'>>,
    plotId = inspectedPlot.value?.id ?? '',
  ): Promise<boolean> {

    if (!plotId) {
      return false;
    }

    const current = plotById.value.get(plotId);

    if (!current) {
      return false;
    }

    const nextPlot: PlotFile = {
      ...current,
      descriptionBlocks: current.descriptionBlocks.map((description) =>
        description.id === descriptionId
          ? {
              ...description,
              ...patch,
            }
          : description,
      ),
    };

    const savedPlot = await persistPlot(nextPlot);

    if (!savedPlot) {
      return false;
    }

    inspectedPlotId.value = savedPlot.id;
    return true;
  }

  /** 删除指定剧情块内的说明卡片，并保存对应 JSON 文件。 */
  async function deleteDescriptionBlock(
    descriptionId: string,
    plotId = inspectedPlot.value?.id ?? '',
  ): Promise<void> {
    const targetPlot = plotById.value.get(plotId);

    if (!targetPlot) {
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

    inspectedPlotId.value = savedPlot.id;
  }

  /** 上下移动指定剧情块内的说明卡片，并保存对应 JSON 文件。 */
  async function moveDescriptionBlock(
    descriptionId: string,
    direction: 'up' | 'down',
    plotId = inspectedPlot.value?.id ?? '',
  ): Promise<void> {
    const targetPlot = plotById.value.get(plotId);

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

    inspectedPlotId.value = savedPlot.id;
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
    await persistPlot(nextPlot);
  }

  /** 开始拖动剧情块。 */
  function startPlotDrag(plotId: string): void {
    if (isSaving.value || isLoading.value || isLayerLoading.value) {
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

    const movedEntry = entryById.value.get(draggingPlotId.value);
    const targetEntry = entryById.value.get(plotId);

    if (!movedEntry || !targetEntry || movedEntry.parentId !== targetEntry.parentId) {
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

    const movedEntry = entryById.value.get(movedPlotId);

    if (!movedEntry) {
      return;
    }

    const parentId = movedEntry.parentId;
    const previousSiblings = childrenByParentId.value.get(parentId) ?? [];
    const nextSiblings = moveSiblingEntryNear(previousSiblings, movedPlotId, targetPlotId, placement);

    if (nextSiblings === previousSiblings) {
      return;
    }

    cacheChildren(parentId, nextSiblings);
    isSaving.value = true;
    saveMessage.value = '';
    errorMessage.value = '';

    try {
      await Promise.all(plotSaveQueues.values());
      const savedSiblings = await savePlotOrder(parentId, nextSiblings.map((entry) => entry.id));

      cacheChildren(parentId, savedSiblings);
      savedSiblings.forEach((entry) => {
        const plot = plotById.value.get(entry.id);

        if (plot && plot.order !== entry.order) {
          cachePlot({
            ...plot,
            order: entry.order,
          });
        }
      });

      if (plotById.value.has(movedPlotId)) {
        currentPlotId.value = movedPlotId;
        inspectedPlotId.value = movedPlotId;
        breadcrumbPlots.value = resolveCachedBreadcrumb(movedPlotId);
      }
    } catch (error) {
      cacheChildren(parentId, previousSiblings);
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
    const targetEntry = entryById.value.get(targetPlotId) ?? null;

    if (action === 'openPlot' && targetPlotId) {
      await openPlot(targetPlotId);
      return;
    }

    if (action === 'createSiblingPlot' && targetPlotId) {
      await createSiblingPlot(targetPlotId);
      return;
    }

    if (action === 'createChildPlot') {
      if (!targetPlotId) {
        errorMessage.value = '请先选择一个剧情块，再新建子剧情。';
        return;
      }

      await createChildPlot(targetPlotId);
      return;
    }

    if (action === 'renamePlot' && targetPlotId) {
      await inspectPlot(targetPlotId);
      return;
    }

    if (action === 'deletePlot' && targetPlotId) {
      await deletePlot(targetPlotId);
      return;
    }

    if (action === 'createDescription') {
      if (!targetPlotId) {
        errorMessage.value = '请先选择一个剧情块，再新建说明卡片。';
        return;
      }

      await inspectPlot(targetPlotId);
      await createDescriptionBlock(targetPlotId);
      return;
    }

    if (action === 'editDescription') {
      if (targetEntry) {
        await inspectPlot(targetEntry.id);
      }

      return;
    }

    if (action === 'moveDescriptionUp' && target.descriptionId) {
      await moveDescriptionBlock(target.descriptionId, 'up', targetPlotId);
      return;
    }

    if (action === 'moveDescriptionDown' && target.descriptionId) {
      await moveDescriptionBlock(target.descriptionId, 'down', targetPlotId);
      return;
    }

    if (action === 'deleteDescription' && target.descriptionId) {
      await deleteDescriptionBlock(target.descriptionId, targetPlotId);
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
    totalPlotCount,
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
    getPlotTitle,
    renamePlot,
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
