import type { PlotFile, PlotIndexEntry } from '@/types';

/**
 * renderer 侧剧情库数据 API。
 * 统一封装 preload 暴露的安全 IPC 方法，Vue 页面只依赖这里，不直接访问文件系统。
 */

/** 剧情库读取结果。 */
export interface PlotListResult {
  /** 当前使用的数据基础目录。 */
  baseDir: string;
  /** 成功读取的剧情块列表。 */
  plots: PlotFile[];
  /** 单个 JSON 文件读取失败时的错误信息。 */
  errors: string[];
}

/** 剧情库根节点读取结果。 */
export interface PlotRootListResult {
  /** 当前使用的数据基础目录。 */
  baseDir: string;
  /** 一级剧情块轻量索引。 */
  roots: PlotIndexEntry[];
  /** 当前索引中的剧情块总数。 */
  totalCount: number;
  /** 索引重建或单个文件读取失败时的非致命错误。 */
  errors: string[];
}

/** 单个剧情层级读取结果。 */
export interface PlotLayerResult {
  /** 当前使用的数据基础目录。 */
  baseDir: string;
  /** 当前剧情块完整详情。 */
  plot: PlotFile;
  /** 当前剧情块的直接子剧情轻量索引。 */
  children: PlotIndexEntry[];
  /** 当前剧情块的面包屑路径。 */
  breadcrumb: PlotIndexEntry[];
  /** 索引重建或单个文件读取失败时的非致命错误。 */
  errors: string[];
}

/** 剧情子树删除结果。 */
export interface PlotDeleteResult {
  /** 当前使用的数据基础目录。 */
  baseDir: string;
  /** 实际删除的剧情块 ID。 */
  deletedIds: string[];
  /** 被删除子树原本所在的父剧情 ID。 */
  parentId: string | null;
  /** 删除后同一父节点下剩余的直接子剧情。 */
  siblings: PlotIndexEntry[];
}

/** 确保当前运行环境已经注入 Electron preload API。 */
function getNovelEngineApi(): Window['novelEngine'] {
  if (!window.novelEngine) {
    throw new Error('当前环境没有可用的 Electron 数据接口');
  }

  return window.novelEngine;
}

/**
 * 将 Vue 响应式剧情块对象转成可通过 Electron IPC 传输的纯 JSON 对象。
 * Electron 的结构化克隆不能处理 Proxy，因此保存前必须清理响应式包装。
 */
function clonePlotForIpc(plot: PlotFile): PlotFile {
  return JSON.parse(JSON.stringify(plot)) as PlotFile;
}

/** 读取剧情块列表。 */
export function listPlots(baseDirPath?: string): Promise<PlotListResult> {
  return getNovelEngineApi().listPlots(baseDirPath);
}

/** 读取一级剧情块轻量索引。 */
export function listPlotRoots(baseDirPath?: string): Promise<PlotRootListResult> {
  return getNovelEngineApi().listPlotRoots(baseDirPath);
}

/** 读取指定剧情块详情和直接子剧情。 */
export function loadPlotLayer(plotId: string, baseDirPath?: string): Promise<PlotLayerResult> {
  return getNovelEngineApi().loadPlotLayer(plotId, baseDirPath);
}

/** 保存剧情块文件。 */
export function savePlot(plot: PlotFile, baseDirPath?: string): Promise<PlotFile> {
  return getNovelEngineApi().savePlot(clonePlotForIpc(plot), baseDirPath);
}

/** 保存同一父剧情下的剧情排序。 */
export function savePlotOrder(
  parentId: string | null,
  orderedPlotIds: string[],
  baseDirPath?: string,
): Promise<PlotIndexEntry[]> {
  return getNovelEngineApi().savePlotOrder(parentId, [...orderedPlotIds], baseDirPath);
}

/** 删除剧情块文件。 */
export function deletePlot(plotId: string, baseDirPath?: string): Promise<PlotDeleteResult> {
  return getNovelEngineApi().deletePlot(plotId, baseDirPath);
}
