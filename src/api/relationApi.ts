import type { RelationGraphFile } from '@/types';

/**
 * renderer 侧关系图谱 API。
 * 统一封装 preload 暴露的安全 IPC 方法，Vue 页面只依赖这里，不直接访问文件系统。
 */

/** 关系图谱模块读取结果。 */
export interface RelationGraphModuleResult {
  /** 当前使用的数据基础目录。 */
  baseDir: string;
  /** 成功读取的关系图谱列表。 */
  graphs: RelationGraphFile[];
  /** 单个 JSON 文件或排序文件读取失败时的错误信息。 */
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
 * 深拷贝可通过 Electron IPC 传输的 JSON 数据。
 * Vue 响应式对象带有 Proxy，保存前必须清理响应式包装。
 */
function cloneForIpc<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** 读取关系图谱模块数据。 */
export function listRelationGraphs(baseDirPath?: string): Promise<RelationGraphModuleResult> {
  return getNovelEngineApi().listRelationGraphs(baseDirPath);
}

/** 保存单张关系图谱。 */
export function saveRelationGraph(
  graph: RelationGraphFile,
  baseDirPath?: string,
): Promise<RelationGraphFile> {
  return getNovelEngineApi().saveRelationGraph(cloneForIpc(graph), baseDirPath);
}

/** 删除自定义关系图谱。 */
export function deleteRelationGraph(graphId: string, baseDirPath?: string): Promise<void> {
  return getNovelEngineApi().deleteRelationGraph(graphId, baseDirPath);
}

/** 保存自定义图谱下拉顺序。 */
export function saveRelationGraphOrder(
  graphIds: string[],
  baseDirPath?: string,
): Promise<void> {
  return getNovelEngineApi().saveRelationGraphOrder([...graphIds], baseDirPath);
}

/** 保存单张图谱的块列表顺序。 */
export function saveRelationGraphBlockOrder(
  graphId: string,
  nodeIds: string[],
  baseDirPath?: string,
): Promise<void> {
  return getNovelEngineApi().saveRelationGraphBlockOrder(graphId, [...nodeIds], baseDirPath);
}
