import { contextBridge, ipcRenderer } from 'electron';
import type { CharacterFile } from '../../src/types';

/**
 * Electron preload 安全桥接。
 * 只暴露应用需要的类型化 IPC 方法，不把 Node.js 能力直接交给 renderer。
 */
contextBridge.exposeInMainWorld('novelEngine', {
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  listCharacters: (baseDirPath?: string) => ipcRenderer.invoke('characters:list', baseDirPath),
  saveCharacter: (character: CharacterFile, baseDirPath?: string) =>
    ipcRenderer.invoke('characters:save', character, baseDirPath),
  deleteCharacter: (characterId: string, baseDirPath?: string) =>
    ipcRenderer.invoke('characters:delete', characterId, baseDirPath),
});
