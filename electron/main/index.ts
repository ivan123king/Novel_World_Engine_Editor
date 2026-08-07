import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'node:path';

const isDev = Boolean(process.env.ELECTRON_RENDERER_URL);

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
