import type { CurrentProject } from '@/types';

/**
 * renderer 侧小说项目 API。
 * 统一封装 preload 暴露的项目 IPC 方法，Vue 页面不直接访问 Electron 或文件系统。
 */

/** 确保当前运行环境已经注入 Electron preload API。 */
function getNovelEngineApi(): Window['novelEngine'] {
  if (!window.novelEngine) {
    throw new Error('当前环境没有可用的 Electron 项目接口');
  }

  return window.novelEngine;
}

/** 获取当前已打开的小说项目。 */
export function getCurrentProject(): Promise<CurrentProject | null> {
  return getNovelEngineApi().getCurrentProject();
}

/** 请求 main process 恢复上一次打开的小说项目。 */
export function restoreLastOpenedProject(): Promise<CurrentProject | null> {
  return getNovelEngineApi().restoreLastOpenedProject();
}

/** 打开系统目录选择框并创建小说项目。 */
export function createProject(): Promise<CurrentProject | null> {
  return getNovelEngineApi().createProject();
}

/** 打开系统目录选择框并加载小说项目。 */
export function openProject(): Promise<CurrentProject | null> {
  return getNovelEngineApi().openProject();
}

/**
 * 保存项目首页中的小说名和简介。
 * @param title 小说名
 * @param description 小说简介
 */
export function saveProjectOverview(title: string, description: string): Promise<CurrentProject> {
  return getNovelEngineApi().saveProjectOverview(title, description);
}

/**
 * 监听当前项目变化。
 * @param listener 当前项目变化回调
 */
export function onCurrentProjectChanged(
  listener: (project: CurrentProject | null) => void,
): () => void {
  return getNovelEngineApi().onCurrentProjectChanged(listener);
}
