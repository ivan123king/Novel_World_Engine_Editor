import { dirname, join, resolve } from 'node:path';
import { ensureDirectory, getDefaultBaseDirectory } from '../file-system/directory';
import { loadJsonFileAs, saveJsonFile } from '../file-system/json-file-store';
import {
  createEmptyNovelDirectoryRecordsFile,
  isNovelDirectoryRecordsFile,
  NOVEL_DIRECTORY_RECORDS_SCHEMA_VERSION,
  type CurrentProject,
  type NovelDirectoryRecord,
  type NovelDirectoryRecordsFile,
} from '../../../src/types';

/**
 * 小说目录记录服务。
 * 负责维护 data/system/novel-directory-records.json，只记录小说项目入口目录，不保存小说领域数据。
 */

/** 小说目录记录文件相对路径片段。 */
const NOVEL_DIRECTORY_RECORDS_FILE_PATH_SEGMENTS = ['system', 'novel-directory-records.json'];

/** 获取小说目录记录文件绝对路径。 */
function resolveNovelDirectoryRecordsFilePath(): string {
  return join(getDefaultBaseDirectory(), ...NOVEL_DIRECTORY_RECORDS_FILE_PATH_SEGMENTS);
}

/**
 * 读取小说目录记录文件。
 * 文件缺失或损坏时返回空记录，避免系统弹框无法打开。
 */
export async function loadNovelDirectoryRecords(): Promise<NovelDirectoryRecordsFile> {
  try {
    return await loadJsonFileAs<NovelDirectoryRecordsFile>(
      resolveNovelDirectoryRecordsFilePath(),
      isNovelDirectoryRecordsFile,
    );
  } catch {
    return createEmptyNovelDirectoryRecordsFile();
  }
}

/**
 * 保存小说目录记录文件。
 * @param recordsFile 待保存的记录文件
 */
async function saveNovelDirectoryRecords(
  recordsFile: NovelDirectoryRecordsFile,
): Promise<NovelDirectoryRecordsFile> {
  const recordsFilePath = resolveNovelDirectoryRecordsFilePath();
  await ensureDirectory(dirname(recordsFilePath));
  await saveJsonFile<NovelDirectoryRecordsFile>(recordsFilePath, recordsFile);
  return recordsFile;
}

/**
 * 添加或更新一个小说目录记录。
 * @param project 已成功打开或创建的小说项目
 */
export async function upsertNovelDirectoryRecord(project: CurrentProject): Promise<NovelDirectoryRecordsFile> {
  const recordsFile = await loadNovelDirectoryRecords();
  const normalizedFolderPath = resolve(project.baseDir);
  const now = new Date().toISOString();
  const title = project.novel.title.trim();
  const nextRecord: NovelDirectoryRecord = {
    title,
    folderPath: normalizedFolderPath,
    recordedAt: now,
    lastOpenedAt: now,
  };
  const existingRecord = recordsFile.records.find((record) => {
    return resolve(record.folderPath).toLowerCase() === normalizedFolderPath.toLowerCase();
  });

  const nextRecords = existingRecord
    ? recordsFile.records.map((record) => {
        if (resolve(record.folderPath).toLowerCase() !== normalizedFolderPath.toLowerCase()) {
          return record;
        }

        return {
          ...record,
          title,
          folderPath: normalizedFolderPath,
          lastOpenedAt: now,
        };
      })
    : [nextRecord, ...recordsFile.records];

  return saveNovelDirectoryRecords({
    schemaVersion: NOVEL_DIRECTORY_RECORDS_SCHEMA_VERSION,
    records: nextRecords,
    updatedAt: now,
  });
}

/**
 * 删除单条小说目录记录。
 * 只删除系统记录，不删除用户本地小说项目目录或 novel.json。
 * @param folderPath 待删除记录的小说项目目录
 */
export async function deleteNovelDirectoryRecord(folderPath: string): Promise<NovelDirectoryRecordsFile> {
  const recordsFile = await loadNovelDirectoryRecords();
  const normalizedFolderPath = resolve(folderPath);
  const nextRecords = recordsFile.records.filter((record) => {
    return resolve(record.folderPath).toLowerCase() !== normalizedFolderPath.toLowerCase();
  });

  return saveNovelDirectoryRecords({
    schemaVersion: NOVEL_DIRECTORY_RECORDS_SCHEMA_VERSION,
    records: nextRecords,
    updatedAt: new Date().toISOString(),
  });
}
