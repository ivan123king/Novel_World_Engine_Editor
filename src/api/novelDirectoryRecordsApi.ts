import type { CurrentProject, NovelDirectoryRecordsFile } from '@/types';

/**
 * renderer 侧小说目录记录 API。
 * 封装 preload 暴露的 IPC 方法，Vue 组件不直接访问 Electron 或文件系统。
 */

/** 确保当前运行环境已经注入 Electron preload API。 */
function getNovelEngineApi(): Window['novelEngine'] {
  if (!window.novelEngine) {
    throw new Error('当前环境没有可用的 Electron 小说目录记录接口');
  }

  return window.novelEngine;
}

/** 读取已经记录的小说目录列表。 */
export function listNovelDirectoryRecords(): Promise<NovelDirectoryRecordsFile> {
  return getNovelEngineApi().listNovelDirectoryRecords();
}

/**
 * 按记录中的目录路径快捷打开小说项目。
 * @param folderPath 已记录的小说项目目录
 */
export function openNovelDirectoryRecord(folderPath: string): Promise<CurrentProject> {
  return getNovelEngineApi().openNovelDirectoryRecord(folderPath);
}

/**
 * 删除一条小说目录记录。
 * @param folderPath 待删除记录的小说项目目录
 */
export function deleteNovelDirectoryRecord(folderPath: string): Promise<NovelDirectoryRecordsFile> {
  return getNovelEngineApi().deleteNovelDirectoryRecord(folderPath);
}

/**
 * 监听小说目录弹框打开事件。
 * @param listener 用户点击“小说 / 小说目录”后的回调
 */
export function onOpenNovelDirectoryRecordsModal(listener: () => void): () => void {
  return getNovelEngineApi().onOpenNovelDirectoryRecordsModal(listener);
}
