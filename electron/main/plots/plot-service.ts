import { readdir, rm } from 'node:fs/promises';
import { extname } from 'node:path';
import {
  ensureBaseDirectory,
  ensureDirectory,
  resolvePathInBaseDirectory,
} from '../file-system/directory';
import { loadJsonFileAs, saveJsonFile } from '../file-system/json-file-store';
import { isPlotFile, type PlotFile } from '../../../src/types/plot';

/**
 * 剧情库 JSON 文件服务。
 * 负责在 Electron 主进程中管理 `plots/*.json`，避免 renderer 直接访问文件系统。
 */

/** 剧情块文件目录名称。 */
const PLOT_DIRECTORY_NAME = 'plots';

/** 剧情块 ID 同时作为文件名使用，只允许稳定且安全的字符。 */
const PLOT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/** 剧情库读取结果，包含成功数据和非致命文件错误。 */
export interface PlotListResult {
  /** 当前使用的数据基础目录。 */
  baseDir: string;
  /** 成功读取并通过校验的剧情块列表。 */
  plots: PlotFile[];
  /** 单个剧情文件读取失败时的错误信息，不阻断其他文件加载。 */
  errors: string[];
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
 * 读取全部剧情块 JSON 文件。
 * 单个文件损坏时记录错误并继续读取其他剧情块，避免一个坏文件拖垮整个页面。
 * @param baseDirPath 可选的数据基础目录
 */
export async function listPlots(baseDirPath?: string): Promise<PlotListResult> {
  const { baseDir, plotDirectory } = await resolvePlotDirectory(baseDirPath);
  const entries = await readdir(plotDirectory, { withFileTypes: true });
  const plots: PlotFile[] = [];
  const errors: string[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || extname(entry.name).toLowerCase() !== '.json') {
      continue;
    }

    const filePath = resolvePathInBaseDirectory(baseDir, PLOT_DIRECTORY_NAME, entry.name);

    try {
      plots.push(await loadJsonFileAs(filePath, isPlotFile));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return {
    baseDir,
    plots,
    errors,
  };
}

/**
 * 保存单个剧情块 JSON 文件。
 * @param plot 待保存的剧情块数据
 * @param baseDirPath 可选的数据基础目录
 */
export async function savePlot(plot: PlotFile, baseDirPath?: string): Promise<PlotFile> {
  if (!isPlotFile(plot)) {
    throw new Error('剧情块数据结构校验失败，未写入 JSON 文件');
  }

  await resolvePlotDirectory(baseDirPath);
  const filePath = resolvePlotFilePath(plot.id, baseDirPath);
  await saveJsonFile(filePath, plot);

  return plot;
}

/**
 * 删除单个剧情块 JSON 文件。
 * 删除子树由 renderer 根据已加载的剧情层级计算后逐个调用，保持 main service 单一职责。
 * @param plotId 待删除剧情块 ID
 * @param baseDirPath 可选的数据基础目录
 */
export async function deletePlotFile(plotId: string, baseDirPath?: string): Promise<void> {
  await resolvePlotDirectory(baseDirPath);
  const filePath = resolvePlotFilePath(plotId, baseDirPath);

  await rm(filePath, { force: true });
}
