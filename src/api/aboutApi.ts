/**
 * renderer 侧关于弹框 API。
 * 统一封装 preload 暴露的菜单事件，Vue 组件不直接依赖 Electron IPC 名称。
 */

/** 确保当前运行环境已经注入 Electron preload API。 */
function getNovelEngineApi(): Window['novelEngine'] {
  if (!window.novelEngine) {
    throw new Error('当前环境没有可用的 Electron 关于弹框接口');
  }

  return window.novelEngine;
}

/**
 * 监听关于弹框打开事件。
 * @param listener 用户点击“系统 / 关于佳依创式”后的回调
 */
export function onOpenAboutDialog(listener: () => void): () => void {
  return getNovelEngineApi().onOpenAboutDialog(listener);
}
