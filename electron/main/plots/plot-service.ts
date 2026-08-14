import { readdir, rm } from 'node:fs/promises';
import { extname } from 'node:path';
import {
  ensureBaseDirectory,
  ensureDirectory,
  resolvePathInBaseDirectory,
} from '../file-system/directory';
import { loadJsonFileAs, saveJsonFile } from '../file-system/json-file-store';
import {
  PLOT_INDEX_SCHEMA_VERSION,
  createPlotIndexEntry,
  isPlotFile,
  isPlotIndexFile,
  type PlotFile,
  type PlotIndexEntry,
  type PlotIndexFile,
} from '../../../src/types/plot';

/**
 * 剧情库 JSON 文件服务。
 * 负责在 Electron 主进程中管理 `plots/*.json` 和 `plots/index.json`，
 * renderer 只按层请求轻量索引和单个剧情详情。
 */

/** 剧情块文件目录名称。 */
const PLOT_DIRECTORY_NAME = 'plots';

/** 剧情库轻量索引文件名。 */
const PLOT_INDEX_FILE_NAME = 'index.json';

/** 剧情块 ID 同时作为文件名使用，只允许稳定且安全的字符。 */
const PLOT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/** 剧情库全量读取结果，保留给旧调用兼容。 */
export interface PlotListResult {
  /** 当前使用的数据基础目录。 */
  baseDir: string;
  /** 成功读取并通过校验的剧情块列表。 */
  plots: PlotFile[];
  /** 单个剧情文件读取失败时的错误信息，不阻断其他文件加载。 */
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
  /** 索引重建或单个 JSON 文件读取失败时的非致命错误。 */
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
  /** 当前剧情块的祖先路径和自身。 */
  breadcrumb: PlotIndexEntry[];
  /** 索引重建或单个 JSON 文件读取失败时的非致命错误。 */
  errors: string[];
}

/** 剧情子树删除结果。 */
export interface PlotDeleteResult {
  /** 当前使用的数据基础目录。 */
  baseDir: string;
  /** 实际删除的剧情块 ID，包含目标和全部后代。 */
  deletedIds: string[];
  /** 被删除子树原本所在的父剧情 ID。 */
  parentId: string | null;
  /** 删除后同一父节点下剩余的直接子剧情索引。 */
  siblings: PlotIndexEntry[];
}

/**
 * 校验剧情块 ID 是否可以安全用于文件名。
 * @param plotId 剧情块稳定 ID
 */
function assertSafePlotId(plotId: string): void {
  if (!PLOT_ID_PATTERN.test(plotId)) {
    throw new Error(`剧情块 ID 只能包含字母、数字、下划线和短横线：${plotId}`);
  }
}

/**
 * 获取剧情块目录的绝对路径，并确保目录存在。
 * @param baseDirPath 可选的数据基础目录
 */
async function resolvePlotDirectory(baseDirPath?: string): Promise<{
  baseDir: string;
  plotDirectory: string;
}> {
  const baseDir = await ensureBaseDirectory(baseDirPath);
  const plotDirectory = resolvePathInBaseDirectory(baseDir, PLOT_DIRECTORY_NAME);

  await ensureDirectory(plotDirectory);

  return {
    baseDir,
    plotDirectory,
  };
}

/**
 * 根据剧情块 ID 解析剧情文件路径。
 * @param plotId 剧情块稳定 ID
 * @param baseDirPath 可选的数据基础目录
 */
function resolvePlotFilePath(plotId: string, baseDirPath?: string): string {
  assertSafePlotId(plotId);
  return resolvePathInBaseDirectory(baseDirPath, PLOT_DIRECTORY_NAME, `${plotId}.json`);
}

/**
 * 解析剧情索引文件路径。
 * @param baseDirPath 可选的数据基础目录
 */
function resolvePlotIndexFilePath(baseDirPath?: string): string {
  return resolvePathInBaseDirectory(baseDirPath, PLOT_DIRECTORY_NAME, PLOT_INDEX_FILE_NAME);
}

/** 判断目录项是否是剧情详情 JSON 文件。 */
function isPlotDetailFileName(fileName: string): boolean {
  return fileName !== PLOT_INDEX_FILE_NAME && extname(fileName).toLowerCase() === '.json';
}

/** 按剧情排序字段稳定排序索引条目。 */
function sortPlotIndexEntries(left: PlotIndexEntry, right: PlotIndexEntry): number {
  if (left.order !== right.order) {
    return left.order - right.order;
  }

  return left.title.localeCompare(right.title, 'zh-CN');
}

/** 按剧情排序字段稳定排序完整剧情块。 */
function sortPlotsByOrder(left: PlotFile, right: PlotFile): number {
  if (left.order !== right.order) {
    return left.order - right.order;
  }

  return left.title.localeCompare(right.title, 'zh-CN');
}

/** 为索引条目重新计算直接子剧情数量。 */
function normalizeIndexChildCounts(entries: PlotIndexEntry[]): PlotIndexEntry[] {
  const childCountByParentId = new Map<string, number>();

  entries.forEach((entry) => {
    if (!entry.parentId) {
      return;
    }

    childCountByParentId.set(entry.parentId, (childCountByParentId.get(entry.parentId) ?? 0) + 1);
  });

  return entries.map((entry) => ({
    ...entry,
    childCount: childCountByParentId.get(entry.id) ?? 0,
  }));
}

/**
 * 为指定父剧情下的直接子节点重写连续排序。
 * @param entries 当前索引条目
 * @param parentId 需要归一化的父剧情 ID
 */
function normalizeSiblingEntryOrder(
  entries: PlotIndexEntry[],
  parentId: string | null,
): PlotIndexEntry[] {
  const orderedSiblingIds = entries
    .filter((entry) => entry.parentId === parentId)
    .sort(sortPlotIndexEntries)
    .map((entry) => entry.id);

  return entries.map((entry) => {
    if (entry.parentId !== parentId) {
      return entry;
    }

    const order = orderedSiblingIds.indexOf(entry.id);
    return order >= 0 ? { ...entry, order } : entry;
  });
}

/** 创建标准剧情索引文件结构。 */
function createPlotIndexFile(entries: PlotIndexEntry[]): PlotIndexFile {
  return {
    entries: normalizeIndexChildCounts(entries),
    schemaVersion: PLOT_INDEX_SCHEMA_VERSION,
  };
}

/** 从完整剧情块列表构建轻量索引。 */
function buildPlotIndexFromPlots(plots: PlotFile[]): PlotIndexFile {
  const childCountByParentId = new Map<string, number>();

  plots.forEach((plot) => {
    if (!plot.parentId) {
      return;
    }

    childCountByParentId.set(plot.parentId, (childCountByParentId.get(plot.parentId) ?? 0) + 1);
  });

  return createPlotIndexFile(
    plots.map((plot) => createPlotIndexEntry(plot, childCountByParentId.get(plot.id) ?? 0)),
  );
}

/**
 * 读取所有剧情详情文件。
 * 只在旧兼容接口或索引缺失/损坏时使用，正常页面加载不会走这条路径。
 */
async function loadAllPlotFiles(
  baseDir: string,
  plotDirectory: string,
): Promise<{
  plots: PlotFile[];
  errors: string[];
}> {
  const entries = await readdir(plotDirectory, { withFileTypes: true });
  const plotFileEntries = entries.filter(
    (entry) => entry.isFile() && isPlotDetailFileName(entry.name),
  );
  const plots: PlotFile[] = [];
  const errors: string[] = [];
  let cursor = 0;

  /** 首次补建索引时限制并发，避免大量小文件同时打开导致句柄压力。 */
  async function readNextPlotFile(): Promise<void> {
    while (cursor < plotFileEntries.length) {
      const entry = plotFileEntries[cursor];
      cursor += 1;
      const filePath = resolvePathInBaseDirectory(baseDir, PLOT_DIRECTORY_NAME, entry.name);

      try {
        plots.push(await loadJsonFileAs(filePath, isPlotFile));
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(64, plotFileEntries.length) }, () => readNextPlotFile()),
  );

  plots.sort(sortPlotsByOrder);

  return {
    plots,
    errors,
  };
}

/**
 * 保存剧情库索引文件。
 * @param baseDir 当前小说项目目录
 * @param index 剧情索引数据
 */
async function savePlotIndex(baseDir: string, index: PlotIndexFile): Promise<void> {
  await saveJsonFile(resolvePlotIndexFilePath(baseDir), index);
}

/**
 * 重新扫描剧情详情文件并写入索引。
 * 旧项目第一次打开或索引损坏时会触发一次。
 */
async function rebuildPlotIndex(
  baseDir: string,
  plotDirectory: string,
): Promise<{
  index: PlotIndexFile;
  errors: string[];
}> {
  const { plots, errors } = await loadAllPlotFiles(baseDir, plotDirectory);
  const index = buildPlotIndexFromPlots(plots);

  await savePlotIndex(baseDir, index);

  return {
    index,
    errors,
  };
}

/**
 * 读取现有索引；如果索引缺失或损坏，则从详情文件补建索引。
 * @param baseDir 当前小说项目目录
 * @param plotDirectory 剧情目录
 */
async function ensurePlotIndex(
  baseDir: string,
  plotDirectory: string,
): Promise<{
  index: PlotIndexFile;
  errors: string[];
}> {
  try {
    return {
      index: await loadJsonFileAs(resolvePlotIndexFilePath(baseDir), isPlotIndexFile),
      errors: [],
    };
  } catch {
    return rebuildPlotIndex(baseDir, plotDirectory);
  }
}

/** 根据索引收集指定剧情块及其全部后代 ID。 */
function collectSubtreeIds(plotId: string, entries: PlotIndexEntry[]): Set<string> {
  const deletedIds = new Set<string>([plotId]);
  const childrenByParentId = new Map<string, PlotIndexEntry[]>();

  entries.forEach((entry) => {
    if (!entry.parentId) {
      return;
    }

    const children = childrenByParentId.get(entry.parentId) ?? [];
    children.push(entry);
    childrenByParentId.set(entry.parentId, children);
  });

  function visit(parentId: string): void {
    const children = childrenByParentId.get(parentId) ?? [];

    children.forEach((child) => {
      deletedIds.add(child.id);
      visit(child.id);
    });
  }

  visit(plotId);
  return deletedIds;
}

/** 根据索引解析某剧情块的面包屑路径。 */
function resolveBreadcrumb(plotId: string, entries: PlotIndexEntry[]): PlotIndexEntry[] {
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const breadcrumb: PlotIndexEntry[] = [];
  let cursor: string | null = plotId;
  const visitedIds = new Set<string>();

  while (cursor) {
    if (visitedIds.has(cursor)) {
      break;
    }

    visitedIds.add(cursor);
    const entry = entryById.get(cursor);

    if (!entry) {
      break;
    }

    breadcrumb.unshift(entry);
    cursor = entry.parentId;
  }

  return breadcrumb;
}

/**
 * 将索引条目的 order 同步回对应剧情详情文件。
 * @param baseDir 当前小说项目目录
 * @param entries 已改变排序的索引条目
 */
async function savePlotOrdersToDetailFiles(
  baseDir: string,
  entries: PlotIndexEntry[],
): Promise<void> {
  await Promise.all(
    entries.map(async (entry) => {
      const filePath = resolvePlotFilePath(entry.id, baseDir);
      const plot = await loadJsonFileAs(filePath, isPlotFile);

      if (plot.order === entry.order) {
        return;
      }

      await saveJsonFile(filePath, {
        ...plot,
        order: entry.order,
      });
    }),
  );
}

/**
 * 读取全部剧情块 JSON 文件。
 * 兼容旧调用；剧情页性能路径应使用 `listPlotRoots` 和 `loadPlotLayer`。
 * @param baseDirPath 可选的数据基础目录
 */
export async function listPlots(baseDirPath?: string): Promise<PlotListResult> {
  const { baseDir, plotDirectory } = await resolvePlotDirectory(baseDirPath);
  const { plots, errors } = await loadAllPlotFiles(baseDir, plotDirectory);

  return {
    baseDir,
    plots,
    errors,
  };
}

/**
 * 只读取一级剧情块索引。
 * @param baseDirPath 可选的数据基础目录
 */
export async function listPlotRoots(baseDirPath?: string): Promise<PlotRootListResult> {
  const { baseDir, plotDirectory } = await resolvePlotDirectory(baseDirPath);
  const { index, errors } = await ensurePlotIndex(baseDir, plotDirectory);
  const roots = index.entries
    .filter((entry) => entry.parentId === null)
    .sort(sortPlotIndexEntries);

  return {
    baseDir,
    roots,
    totalCount: index.entries.length,
    errors,
  };
}

/**
 * 读取指定剧情块详情和直接子剧情索引。
 * @param plotId 当前剧情块 ID
 * @param baseDirPath 可选的数据基础目录
 */
export async function loadPlotLayer(
  plotId: string,
  baseDirPath?: string,
): Promise<PlotLayerResult> {
  assertSafePlotId(plotId);

  const { baseDir, plotDirectory } = await resolvePlotDirectory(baseDirPath);
  let { index, errors } = await ensurePlotIndex(baseDir, plotDirectory);
  let targetEntry = index.entries.find((entry) => entry.id === plotId);

  if (!targetEntry) {
    const rebuilt = await rebuildPlotIndex(baseDir, plotDirectory);
    index = rebuilt.index;
    errors = rebuilt.errors;
    targetEntry = index.entries.find((entry) => entry.id === plotId);
  }

  if (!targetEntry) {
    throw new Error(`未找到剧情块：${plotId}`);
  }

  const plot = await loadJsonFileAs(resolvePlotFilePath(plotId, baseDir), isPlotFile);
  const children = index.entries
    .filter((entry) => entry.parentId === plotId)
    .sort(sortPlotIndexEntries);

  return {
    baseDir,
    plot,
    children,
    breadcrumb: resolveBreadcrumb(plotId, index.entries),
    errors,
  };
}

/**
 * 保存单个剧情块 JSON 文件，并同步更新剧情索引。
 * @param plot 待保存的剧情块数据
 * @param baseDirPath 可选的数据基础目录
 */
export async function savePlot(plot: PlotFile, baseDirPath?: string): Promise<PlotFile> {
  if (!isPlotFile(plot)) {
    throw new Error('剧情块数据结构校验失败，未写入 JSON 文件');
  }

  const { baseDir, plotDirectory } = await resolvePlotDirectory(baseDirPath);
  const filePath = resolvePlotFilePath(plot.id, baseDir);

  await saveJsonFile(filePath, plot);

  const { index } = await ensurePlotIndex(baseDir, plotDirectory);
  const existingChildCount = index.entries.filter((entry) => entry.parentId === plot.id).length;
  const nextEntries = normalizeIndexChildCounts([
    ...index.entries.filter((entry) => entry.id !== plot.id),
    createPlotIndexEntry(plot, existingChildCount),
  ]);

  await savePlotIndex(baseDir, createPlotIndexFile(nextEntries));

  return plot;
}

/**
 * 保存同一父剧情下的剧情块排序。
 * @param parentId 父剧情 ID，根剧情传 null
 * @param orderedPlotIds 排好序的同级剧情 ID
 * @param baseDirPath 可选的数据基础目录
 */
export async function savePlotOrder(
  parentId: string | null,
  orderedPlotIds: string[],
  baseDirPath?: string,
): Promise<PlotIndexEntry[]> {
  if (parentId !== null) {
    assertSafePlotId(parentId);
  }

  orderedPlotIds.forEach(assertSafePlotId);

  const { baseDir, plotDirectory } = await resolvePlotDirectory(baseDirPath);
  const { index } = await ensurePlotIndex(baseDir, plotDirectory);
  const siblings = index.entries.filter((entry) => entry.parentId === parentId);

  if (siblings.length !== orderedPlotIds.length) {
    throw new Error('剧情排序保存失败：提交的同级剧情数量和索引不一致');
  }

  const siblingIdSet = new Set(siblings.map((entry) => entry.id));

  if (orderedPlotIds.some((plotId) => !siblingIdSet.has(plotId))) {
    throw new Error('剧情排序保存失败：包含不属于当前父剧情的 ID');
  }

  const previousEntryById = new Map(index.entries.map((entry) => [entry.id, entry]));
  const orderById = new Map(orderedPlotIds.map((plotId, order) => [plotId, order]));
  const nextEntries = normalizeIndexChildCounts(
    index.entries.map((entry) =>
      entry.parentId === parentId ? { ...entry, order: orderById.get(entry.id) ?? entry.order } : entry,
    ),
  );
  const changedEntries = nextEntries.filter((entry) => {
    const previousEntry = previousEntryById.get(entry.id);
    return previousEntry ? previousEntry.order !== entry.order : false;
  });

  await savePlotOrdersToDetailFiles(baseDir, changedEntries);
  await savePlotIndex(baseDir, createPlotIndexFile(nextEntries));

  return nextEntries
    .filter((entry) => entry.parentId === parentId)
    .sort(sortPlotIndexEntries);
}

/**
 * 删除指定剧情块及其全部后代。
 * 子树计算放在 main process，避免 renderer 必须预先加载完整剧情树。
 * @param plotId 待删除剧情块 ID
 * @param baseDirPath 可选的数据基础目录
 */
export async function deletePlotFile(
  plotId: string,
  baseDirPath?: string,
): Promise<PlotDeleteResult> {
  assertSafePlotId(plotId);

  const { baseDir, plotDirectory } = await resolvePlotDirectory(baseDirPath);
  const { index } = await ensurePlotIndex(baseDir, plotDirectory);
  const targetEntry = index.entries.find((entry) => entry.id === plotId);

  if (!targetEntry) {
    throw new Error(`未找到剧情块：${plotId}`);
  }

  const deletedIds = collectSubtreeIds(plotId, index.entries);
  const parentId = targetEntry.parentId;
  const remainingEntries = index.entries.filter((entry) => !deletedIds.has(entry.id));
  const normalizedEntries = normalizeIndexChildCounts(
    normalizeSiblingEntryOrder(remainingEntries, parentId),
  );
  const previousEntryById = new Map(remainingEntries.map((entry) => [entry.id, entry]));
  const changedSiblingEntries = normalizedEntries.filter((entry) => {
    if (entry.parentId !== parentId) {
      return false;
    }

    const previousEntry = previousEntryById.get(entry.id);
    return previousEntry ? previousEntry.order !== entry.order : false;
  });

  await Promise.all(
    Array.from(deletedIds).map((deletedId) =>
      rm(resolvePlotFilePath(deletedId, baseDir), { force: true }),
    ),
  );
  await savePlotOrdersToDetailFiles(baseDir, changedSiblingEntries);
  await savePlotIndex(baseDir, createPlotIndexFile(normalizedEntries));

  return {
    baseDir,
    deletedIds: Array.from(deletedIds),
    parentId,
    siblings: normalizedEntries
      .filter((entry) => entry.parentId === parentId)
      .sort(sortPlotIndexEntries),
  };
}
