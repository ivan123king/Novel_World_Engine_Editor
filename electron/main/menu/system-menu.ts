import type { BrowserWindow, MenuItemConstructorOptions } from 'electron';

/**
 * 系统菜单模块。
 * 只负责应用级设置入口，不承载小说项目数据操作。
 */

/**
 * 创建系统菜单。
 * @param getMainWindow 获取当前主窗口的函数
 */
export function createSystemMenu(
  getMainWindow: () => BrowserWindow | null,
): MenuItemConstructorOptions {
  return {
    label: '系统',
    submenu: [
      {
        label: '系统配置',
        click: () => {
          const mainWindow = getMainWindow();

          if (!mainWindow) {
            return;
          }

          mainWindow.webContents.send('system-config:open-editor');
        },
      },
    ],
  };
}
