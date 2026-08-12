import {
  createEmptyTimelineFile,
  type ListOrderFile,
  type TimelineFile,
  type TimelineIndexFile,
} from '@/types';

/**
 * renderer 侧时间线数据 API。
 * 只负责调用 preload 暴露的安全接口，不直接读取 mock 数据或访问本地文件系统。
 */

/** 时间线模块读取结果。 */
export interface TimelineModuleResult {
  /** 当前使用的数据基础目录。 */
  baseDir: string;
  /** 时间线索引文件。 */
  index: TimelineIndexFile;
  /** 单条时间线文件列表。 */
  timelines: TimelineFile[];
  /** 每条时间线的时间块排序元数据，key 为时间线 ID。 */
  timeBlockOrders: Record<string, ListOrderFile>;
  /** 单个 JSON 文件或排序元数据读取失败时的错误信息。 */
  errors: string[];
}

/** 获取 preload 暴露的小说引擎 API。 */
function getNovelEngineApi(): Window['novelEngine'] {
  if (!window.novelEngine) {
    throw new Error('当前运行环境未暴露小说引擎 API，请在 Electron 应用中打开此页面');
  }

  return window.novelEngine;
}

/**
 * 深拷贝时间线文件，避免 Vue 响应式代理对象进入 IPC。
 * @param timeline 待发送的时间线文件
 */
function cloneTimelineFileForIpc(timeline: TimelineFile): TimelineFile {
  return JSON.parse(JSON.stringify(timeline)) as TimelineFile;
}

/**
 * 深拷贝时间线索引文件，避免 Vue 响应式代理对象进入 IPC。
 * @param index 待发送的时间线索引
 */
function cloneTimelineIndexForIpc(index: TimelineIndexFile): TimelineIndexFile {
  return JSON.parse(JSON.stringify(index)) as TimelineIndexFile;
}

/**
 * 读取时间线模块数据。
 * @param baseDirPath 可选小说项目目录，通常由主进程当前项目状态提供
 */
export async function listTimelineModule(baseDirPath?: string): Promise<TimelineModuleResult> {
  return getNovelEngineApi().listTimelineModule(baseDirPath);
}

/**
 * 保存时间线索引。
 * @param index 待保存索引
 * @param baseDirPath 可选小说项目目录
 */
export async function saveTimelineIndex(
  index: TimelineIndexFile,
  baseDirPath?: string,
): Promise<TimelineIndexFile> {
  return getNovelEngineApi().saveTimelineIndex(cloneTimelineIndexForIpc(index), baseDirPath);
}

/**
 * 保存单条时间线文件。
 * @param timeline 待保存时间线
 * @param baseDirPath 可选小说项目目录
 */
export async function saveTimeline(
  timeline: TimelineFile,
  baseDirPath?: string,
): Promise<TimelineFile> {
  return getNovelEngineApi().saveTimeline(cloneTimelineFileForIpc(timeline), baseDirPath);
}

/**
 * 删除单条时间线文件。
 * @param timelineId 时间线 ID
 * @param baseDirPath 可选小说项目目录
 */
export async function deleteTimeline(timelineId: string, baseDirPath?: string): Promise<void> {
  await getNovelEngineApi().deleteTimeline(timelineId, baseDirPath);
}

/**
 * 创建并保存一条空时间线。
 * @param timelineId 时间线 ID
 * @param name 时间线名称
 */
export async function createTimelineFile(
  timelineId: string,
  name = '新时间线',
): Promise<TimelineFile> {
  return saveTimeline(createEmptyTimelineFile(timelineId, name));
}

/**
 * 保存某条时间线的时间块顺序。
 * @param timelineId 时间线 ID
 * @param timeBlockIds 时间块 ID 顺序
 * @param baseDirPath 可选小说项目目录
 */
export async function saveTimelineTimeBlockOrder(
  timelineId: string,
  timeBlockIds: string[],
  baseDirPath?: string,
): Promise<ListOrderFile> {
  return getNovelEngineApi().saveTimelineTimeBlockOrder(
    timelineId,
    [...timeBlockIds],
    baseDirPath,
  );
}
