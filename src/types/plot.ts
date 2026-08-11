/** 当前剧情节点文件结构版本。 */
export const PLOT_SCHEMA_VERSION = 1;

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
