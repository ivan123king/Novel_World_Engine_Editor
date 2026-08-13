import { app, type BrowserWindow, type MenuItemConstructorOptions } from 'electron';

/**
 * 窗口菜单模块。
 * 管理窗口最小化、重载、开发者工具和退出等桌面外壳操作。
 */

/**
 * 创建窗口菜单。
 * @param getMainWindow 获取当前主窗口的函数
 */
export function createWindowMenu(
  getMainWindow: () => BrowserWindow | null,
): MenuItemConstructorOptions {
  return {
    label: '窗口',
    submenu: [
      { role: 'minimize', label: '最小化' },
      { role: 'reload', label: '重新加载' },
      {
        label: '开发者工具',
        accelerator: 'F12',
        click: () => {
          const mainWindow = getMainWindow();

          if (!mainWindow) {
            return;
          }

          mainWindow.webContents.toggleDevTools();
        },
      },
      { type: 'separator' },
      { role: 'quit', label: process.platform === 'darwin' ? `退出 ${app.name}` : '退出' },
    ],
  };
}
