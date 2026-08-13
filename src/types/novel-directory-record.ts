/**
 * 小说目录记录类型。
 * 记录用户曾经通过本软件成功新建或打开过的小说项目目录，属于应用系统数据。
 */

/** 小说目录记录文件 schema 版本。 */
export const NOVEL_DIRECTORY_RECORDS_SCHEMA_VERSION = 1;

/** 单条小说目录记录。 */
export interface NovelDirectoryRecord {
  /** 小说名，优先来自对应目录下 novel.json 的 title 字段。 */
  title: string;
  /** 小说项目目录绝对路径。 */
  folderPath: string;
  /** 第一次记录该目录的时间，ISO 字符串。 */
  recordedAt: string;
  /** 最近一次成功打开该目录的时间，ISO 字符串。 */
  lastOpenedAt: string;
}

/** 小说目录记录文件。 */
export interface NovelDirectoryRecordsFile {
  /** 结构版本。 */
  schemaVersion: number;
  /** 已记录的小说项目目录列表。 */
  records: NovelDirectoryRecord[];
  /** 记录文件最近更新时间，ISO 字符串。 */
  updatedAt: string;
}

/** 判断 unknown 是否为普通对象。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 判断 unknown 是否为单条小说目录记录。 */
export function isNovelDirectoryRecord(value: unknown): value is NovelDirectoryRecord {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.title === 'string' &&
    typeof value.folderPath === 'string' &&
    typeof value.recordedAt === 'string' &&
    typeof value.lastOpenedAt === 'string'
  );
}

/** 判断 unknown 是否为小说目录记录文件。 */
export function isNovelDirectoryRecordsFile(value: unknown): value is NovelDirectoryRecordsFile {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.schemaVersion === 'number' &&
    Array.isArray(value.records) &&
    value.records.every(isNovelDirectoryRecord) &&
    typeof value.updatedAt === 'string'
  );
}

/** 创建空的小说目录记录文件。 */
export function createEmptyNovelDirectoryRecordsFile(): NovelDirectoryRecordsFile {
  return {
    schemaVersion: NOVEL_DIRECTORY_RECORDS_SCHEMA_VERSION,
    records: [],
    updatedAt: new Date().toISOString(),
  };
}
