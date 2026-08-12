import { readdir, rm, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import {
  ensureBaseDirectory,
  ensureDirectory,
  resolvePathInBaseDirectory,
} from '../file-system/directory';
import { loadJsonFileAs, saveJsonFile } from '../file-system/json-file-store';
import {
  deleteTimelineTimeBlockListOrder,
  loadTimelineTimeBlockOrder,
  saveTimelineTimeBlockListOrder,
} from '../list-order/list-order-service';
import {
  createEmptyTimelineIndex,
  createListOrderFile,
  isTimelineFile,
  isTimelineIndexFile,
  type ListOrderFile,
  type TimelineFile,
  type TimelineIndexEntry,
  type TimelineIndexFile,
} from '../../../src/types';

/**
 * 时间线 JSON 文件服务。
 * 负责在 Electron 主进程中管理 `timeline/*.json` 与对应的时间块排序元数据。
 */

/** 时间线文件目录名称。 */
const TIMELINE_DIRECTORY_NAME = 'timeline';

/** 多时间线索引文件名。 */
const TIMELINE_INDEX_FILE_NAME = 'timelines.json';

/** 时间线 ID 同时作为文件名使用，只允许稳定且安全的字符。 */
const TIMELINE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/** 时间线模块读取结果，包含索引、时间线文件和非致命错误。 */
export interface TimelineModuleResult {
  /** 当前使用的数据基础目录。 */
  baseDir: string;
  /** 时间线索引文件。 */
  index: TimelineIndexFile;
  /** 成功读取并通过校验的时间线列表。 */
  timelines: TimelineFile[];
  /** 每条时间线的时间块排序元数据，key 为时间线 ID。 */
  timeBlockOrders: Record<string, ListOrderFile>;
  /** 单个 JSON 文件或排序元数据读取失败时的错误信息。 */
  errors: string[];
}

/**
 * 判断文件是否存在。
 * @param filePath 待检查路径
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

/**
 * 校验时间线 ID 是否可以安全用于文件名。
 * @param timelineId 时间线稳定 ID
 */
function assertSafeTimelineId(timelineId: string): void {
  if (!TIMELINE_ID_PATTERN.test(timelineId)) {
    throw new Error(`时间线 ID 只能包含字母、数字、下划线和短横线：${timelineId}`);
  }
}

/**
 * 获取时间线目录，并确保目录存在。
 * @param baseDirPath 小说项目目录
 */
async function resolveTimelineDirectory(baseDirPath?: string): Promise<{
  baseDir: string;
  timelineDirectory: string;
}> {
  const baseDir = await ensureBaseDirectory(baseDirPath);
  const timelineDirectory = resolvePathInBaseDirectory(baseDir, TIMELINE_DIRECTORY_NAME);

  await ensureDirectory(timelineDirectory);

  return {
    baseDir,
    timelineDirectory,
  };
}

/**
 * 解析时间线索引文件路径。
 * @param baseDirPath 小说项目目录
 */
function resolveTimelineIndexFilePath(baseDirPath?: string): string {
  return resolvePathInBaseDirectory(baseDirPath, TIMELINE_DIRECTORY_NAME, TIMELINE_INDEX_FILE_NAME);
}

/**
 * 根据时间线 ID 解析单条时间线文件路径。
 * @param timelineId 时间线稳定 ID
 * @param baseDirPath 小说项目目录
 */
function resolveTimelineFilePath(timelineId: string, baseDirPath?: string): string {
  assertSafeTimelineId(timelineId);
  return resolvePathInBaseDirectory(baseDirPath, TIMELINE_DIRECTORY_NAME, `${timelineId}.json`);
}

/**
 * 校验时间线索引中的 ID 是否安全。
 * @param index 时间线索引文件
 */
function assertSafeTimelineIndex(index: TimelineIndexFile): void {
  if (index.activeTimelineId) {
    assertSafeTimelineId(index.activeTimelineId);
  }

  index.timelines.forEach((timeline) => {
    assertSafeTimelineId(timeline.id);
  });
}

/**
 * 读取时间线索引文件；缺失时创建空索引。
 * @param baseDir 小说项目目录
 * @param errors 非致命错误收集数组
 */
async function loadTimelineIndex(baseDir: string, errors: string[]): Promise<TimelineIndexFile> {
  const indexFilePath = resolveTimelineIndexFilePath(baseDir);

  if (!(await fileExists(indexFilePath))) {
    const emptyIndex = createEmptyTimelineIndex(null);
    await saveJsonFile(indexFilePath, emptyIndex);
    return emptyIndex;
  }

  try {
    const index = await loadJsonFileAs(indexFilePath, isTimelineIndexFile);
    assertSafeTimelineIndex(index);
    return index;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return createEmptyTimelineIndex(null);
  }
}

/**
 * 读取时间线目录下的全部单条时间线文件。
 * @param baseDir 小说项目目录
 * @param timelineDirectory 时间线目录
 */
async function loadTimelineFiles(
  baseDir: string,
  timelineDirectory: string,
): Promise<{
  timelines: TimelineFile[];
  errors: string[];
}> {
  const entries = await readdir(timelineDirectory, { withFileTypes: true });
  const timelines: TimelineFile[] = [];
  const errors: string[] = [];

  for (const entry of entries) {
    if (
      !entry.isFile() ||
      entry.name === TIMELINE_INDEX_FILE_NAME ||
      extname(entry.name).toLowerCase() !== '.json'
    ) {
      continue;
    }

    const filePath = resolvePathInBaseDirectory(baseDir, TIMELINE_DIRECTORY_NAME, entry.name);

    try {
      const timeline = await loadJsonFileAs(filePath, isTimelineFile);
      assertSafeTimelineId(timeline.id);
      timelines.push(timeline);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return {
    timelines,
    errors,
  };
}

/**
 * 让索引和已存在的时间线文件保持一致。
 * 缺失索引条目会自动补齐，指向不存在文件的索引条目会被移除。
 */
function syncTimelineIndex(
  index: TimelineIndexFile,
  timelines: TimelineFile[],
): TimelineIndexFile {
  const timelineById = new Map(timelines.map((timeline) => [timeline.id, timeline]));
  const seenIds = new Set<string>();
  const entries: TimelineIndexEntry[] = [];

  index.timelines.forEach((entry) => {
    if (!timelineById.has(entry.id) || seenIds.has(entry.id)) {
      return;
    }

    seenIds.add(entry.id);
    entries.push({
      id: entry.id,
      name: timelineById.get(entry.id)?.name ?? entry.name,
    });
  });

  timelines.forEach((timeline) => {
    if (seenIds.has(timeline.id)) {
      return;
    }

    seenIds.add(timeline.id);
    entries.push({
      id: timeline.id,
      name: timeline.name,
    });
  });

  return {
    ...index,
    activeTimelineId:
      index.activeTimelineId && seenIds.has(index.activeTimelineId)
        ? index.activeTimelineId
        : entries[0]?.id ?? null,
    timelines: entries,
  };
}

/**
 * 读取某条时间线的时间块排序元数据。
 * @param timeline 时间线文件
 * @param baseDir 小说项目目录
 */
async function loadTimeBlockOrderForTimeline(
  timeline: TimelineFile,
  baseDir: string,
): Promise<{
  orderFile: ListOrderFile;
  error?: string;
}> {
  const orderResult = await loadTimelineTimeBlockOrder(timeline.id, baseDir);
  const ids = orderResult.ids.length > 0
    ? orderResult.ids
    : timeline.timeBlocks.map((timeBlock) => timeBlock.id);

  return {
    orderFile: createListOrderFile('timeline-time-blocks', ids),
    error: orderResult.error,
  };
}

/**
 * 读取时间线模块全部数据。
 * @param baseDirPath 小说项目目录
 */
export async function listTimelineModule(baseDirPath?: string): Promise<TimelineModuleResult> {
  const { baseDir, timelineDirectory } = await resolveTimelineDirectory(baseDirPath);
  const errors: string[] = [];
  const index = await loadTimelineIndex(baseDir, errors);
  const timelineResult = await loadTimelineFiles(baseDir, timelineDirectory);
  const syncedIndex = syncTimelineIndex(index, timelineResult.timelines);
  const timeBlockOrders: Record<string, ListOrderFile> = {};

  errors.push(...timelineResult.errors);

  if (JSON.stringify(index) !== JSON.stringify(syncedIndex)) {
    await saveJsonFile(resolveTimelineIndexFilePath(baseDir), syncedIndex);
  }

  for (const timeline of timelineResult.timelines) {
    const orderResult = await loadTimeBlockOrderForTimeline(timeline, baseDir);

    timeBlockOrders[timeline.id] = orderResult.orderFile;

    if (orderResult.error) {
      errors.push(orderResult.error);
    }
  }

  return {
    baseDir,
    index: syncedIndex,
    timelines: timelineResult.timelines,
    timeBlockOrders,
    errors,
  };
}

/**
 * 保存时间线索引文件。
 * @param index 待保存索引
 * @param baseDirPath 小说项目目录
 */
export async function saveTimelineIndex(
  index: TimelineIndexFile,
  baseDirPath?: string,
): Promise<TimelineIndexFile> {
  if (!isTimelineIndexFile(index)) {
    throw new Error('时间线索引结构校验失败，未写入 JSON 文件');
  }

  assertSafeTimelineIndex(index);
  await resolveTimelineDirectory(baseDirPath);
  await saveJsonFile(resolveTimelineIndexFilePath(baseDirPath), index);

  return index;
}

/**
 * 保存单条时间线文件。
 * @param timeline 待保存时间线
 * @param baseDirPath 小说项目目录
 */
export async function saveTimeline(
  timeline: TimelineFile,
  baseDirPath?: string,
): Promise<TimelineFile> {
  if (!isTimelineFile(timeline)) {
    throw new Error('时间线数据结构校验失败，未写入 JSON 文件');
  }

  assertSafeTimelineId(timeline.id);
  await resolveTimelineDirectory(baseDirPath);
  await saveJsonFile(resolveTimelineFilePath(timeline.id, baseDirPath), timeline);

  return timeline;
}

/**
 * 删除单条时间线文件，并清理其时间块排序元数据。
 * @param timelineId 待删除时间线 ID
 * @param baseDirPath 小说项目目录
 */
export async function deleteTimelineFile(
  timelineId: string,
  baseDirPath?: string,
): Promise<void> {
  await resolveTimelineDirectory(baseDirPath);
  await rm(resolveTimelineFilePath(timelineId, baseDirPath), { force: true });
  await deleteTimelineTimeBlockListOrder(timelineId, baseDirPath);
}

/**
 * 保存某条时间线的时间块展示顺序。
 * @param timelineId 时间线 ID
 * @param timeBlockIds 时间块 ID 顺序
 * @param baseDirPath 小说项目目录
 */
export async function saveTimelineTimeBlockOrder(
  timelineId: string,
  timeBlockIds: string[],
  baseDirPath?: string,
): Promise<ListOrderFile> {
  return saveTimelineTimeBlockListOrder(timelineId, timeBlockIds, baseDirPath);
}
