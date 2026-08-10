import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'node:path';
import {
  deleteCharacterFile,
  listCharacters,
  saveCharacter,
} from './characters/character-service';

/** Electron 主进程入口，负责窗口创建和安全 IPC 注册。 */

const isDev = Boolean(process.env.ELECTRON_RENDERER_URL);

/** 创建主窗口并加载 renderer 页面。 */
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: 'Novel World Engine Editor',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL!);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

ipcMain.handle('app:get-info', () => ({
  name: 'Novel World Engine Editor',
  version: app.getVersion(),
  storage: '本地 JSON 文件',
}));

ipcMain.handle('characters:list', (_event, baseDirPath?: string) => listCharacters(baseDirPath));

ipcMain.handle('characters:save', (_event, character, baseDirPath?: string) =>
  saveCharacter(character, baseDirPath),
);

ipcMain.handle('characters:delete', (_event, characterId: string, baseDirPath?: string) =>
  deleteCharacterFile(characterId, baseDirPath),
);

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
