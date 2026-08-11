import type { PlotFile } from '@/types';

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

/** 保存剧情块文件。 */
export function savePlot(plot: PlotFile, baseDirPath?: string): Promise<PlotFile> {
  return getNovelEngineApi().savePlot(clonePlotForIpc(plot), baseDirPath);
}

/** 删除剧情块文件。 */
export function deletePlot(plotId: string, baseDirPath?: string): Promise<void> {
  return getNovelEngineApi().deletePlot(plotId, baseDirPath);
}
