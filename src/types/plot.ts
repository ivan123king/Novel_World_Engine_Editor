/** 当前剧情节点文件结构版本。 */
export const PLOT_SCHEMA_VERSION = 1;

/** 剧情库索引文件结构版本。 */
export const PLOT_INDEX_SCHEMA_VERSION = 1;

/**
 * 剧情说明卡片。
 * 说明卡片属于某一个剧情块内部，用于记录场景想法、伏笔、冲突和补充说明。
 */
export interface PlotDescriptionBlock {
  /** 说明卡片稳定 ID，只在所属剧情块内部使用。 */
  id: string;

  /** 说明卡片名称，例如：药园异常、墨老隐藏目的。 */
  title: string;

  /** 说明卡片正文内容。 */
  content: string;

  /** 当前剧情块内的说明卡片展示顺序。 */
  order: number;
}

/**
 * 剧情块 JSON 文件结构。
 * 剧情块通过 parentId 形成无限层级树，内部通过 descriptionBlocks 保存自定义说明卡片。
 */
export interface PlotFile {
  /** 系统稳定 ID，用于剧情树、后续事件或章节引用，不随标题修改。 */
  id: string;

  /** 剧情块显示名称，例如：七玄门、墨老失踪。 */
  title: string;

  /** 当前剧情块简介，显示在内容区顶部。 */
  summary: string;

  /** 父剧情块 ID，根剧情块为 null。 */
  parentId: string | null;

  /** 同一父剧情块下的展示顺序。 */
  order: number;

  /** 当前剧情块内部的自定义说明卡片列表。 */
  descriptionBlocks: PlotDescriptionBlock[];

  /** 剧情文件结构版本，用于后续迁移。 */
  schemaVersion: typeof PLOT_SCHEMA_VERSION;
}

/**
 * 剧情块索引条目。
 * 索引用于页面分层懒加载，只保存列表和导航需要的轻量字段。
 */
export interface PlotIndexEntry {
  /** 系统稳定 ID，对应 `plots/{id}.json`。 */
  id: string;

  /** 剧情块显示名称。 */
  title: string;

  /** 剧情块简介摘要，用于列表预览。 */
  summary: string;

  /** 父剧情块 ID，根剧情块为 null。 */
  parentId: string | null;

  /** 同一父剧情块下的展示顺序。 */
  order: number;

  /** 直接子剧情数量，用于未展开节点的轻量提示和新建排序。 */
  childCount: number;
}

/**
 * 剧情库索引文件。
 * 持久化在 `plots/index.json`，避免进入剧情页时读取全部剧情详情 JSON。
 */
export interface PlotIndexFile {
  /** 当前小说项目内的剧情块轻量索引。 */
  entries: PlotIndexEntry[];

  /** 索引结构版本。 */
  schemaVersion: typeof PLOT_INDEX_SCHEMA_VERSION;
}

/**
 * 创建一个空说明卡片。
 * 用于在当前剧情块内新增补充说明。
 */
export function createEmptyPlotDescriptionBlock(
  id: string,
  title = '未命名说明',
  order = 0,
): PlotDescriptionBlock {
  return {
    id,
    title,
    content: '',
    order,
  };
}

/**
 * 创建一个空剧情块。
 * 用于新增根剧情或子剧情时提供稳定的默认 JSON 结构。
 */
export function createEmptyPlot(
  id: string,
  title = '未命名剧情',
  parentId: string | null = null,
  order = 0,
): PlotFile {
  return {
    id,
    title,
    summary: '',
    parentId,
    order,
    descriptionBlocks: [],
    schemaVersion: PLOT_SCHEMA_VERSION,
  };
}

/**
 * 从完整剧情文件创建索引条目。
 * @param plot 完整剧情块
 * @param childCount 直接子剧情数量
 */
export function createPlotIndexEntry(plot: PlotFile, childCount = 0): PlotIndexEntry {
  return {
    id: plot.id,
    title: plot.title,
    summary: plot.summary,
    parentId: plot.parentId,
    order: plot.order,
    childCount,
  };
}

/** 判断未知数据是否是合法剧情说明卡片。 */
export function isPlotDescriptionBlock(value: unknown): value is PlotDescriptionBlock {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<PlotDescriptionBlock>;

  return (
    typeof data.id === 'string' &&
    typeof data.title === 'string' &&
    typeof data.content === 'string' &&
    typeof data.order === 'number' &&
    Number.isFinite(data.order)
  );
}

/**
 * 判断未知数据是否满足剧情块的最小结构。
 * 这里只校验系统必要字段，具体文本内容由作者自由填写。
 */
export function isPlotFile(value: unknown): value is PlotFile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<PlotFile>;

  return (
    typeof data.id === 'string' &&
    typeof data.title === 'string' &&
    typeof data.summary === 'string' &&
    (typeof data.parentId === 'string' || data.parentId === null) &&
    typeof data.order === 'number' &&
    Number.isFinite(data.order) &&
    Array.isArray(data.descriptionBlocks) &&
    data.descriptionBlocks.every(isPlotDescriptionBlock) &&
    data.schemaVersion === PLOT_SCHEMA_VERSION
  );
}

/** 判断未知数据是否是合法剧情索引条目。 */
export function isPlotIndexEntry(value: unknown): value is PlotIndexEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<PlotIndexEntry>;

  return (
    typeof data.id === 'string' &&
    typeof data.title === 'string' &&
    typeof data.summary === 'string' &&
    (typeof data.parentId === 'string' || data.parentId === null) &&
    typeof data.order === 'number' &&
    Number.isFinite(data.order) &&
    typeof data.childCount === 'number' &&
    Number.isInteger(data.childCount) &&
    data.childCount >= 0
  );
}

/** 判断未知数据是否是合法剧情索引文件。 */
export function isPlotIndexFile(value: unknown): value is PlotIndexFile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<PlotIndexFile>;

  return (
    Array.isArray(data.entries) &&
    data.entries.every(isPlotIndexEntry) &&
    data.schemaVersion === PLOT_INDEX_SCHEMA_VERSION
  );
}
