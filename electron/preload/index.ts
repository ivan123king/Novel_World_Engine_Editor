import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('novelEngine', {
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
});
