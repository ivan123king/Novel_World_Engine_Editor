/// <reference types="vite/client" />

import type { CharacterFile, ItemFile } from './src/types';

declare global {
  /** 人物列表读取结果，和 preload 暴露的数据结构保持一致。 */
  interface CharacterListResult {
    /** 当前使用的数据基础目录。 */
    baseDir: string;
    /** 已成功读取的人物列表。 */
    characters: CharacterFile[];
    /** 单个文件读取失败时的非致命错误。 */
    errors: string[];
  }

  /** 物品列表读取结果，和 preload 暴露的数据结构保持一致。 */
  interface ItemListResult {
    /** 当前使用的数据基础目录。 */
    baseDir: string;
    /** 已成功读取的物品列表。 */
    items: ItemFile[];
    /** 单个文件读取失败时的非致命错误。 */
    errors: string[];
  }

  interface Window {
    novelEngine: {
      getAppInfo: () => Promise<{
        name: string;
        version: string;
        storage: string;
      }>;
      listCharacters: (baseDirPath?: string) => Promise<CharacterListResult>;
      saveCharacter: (character: CharacterFile, baseDirPath?: string) => Promise<CharacterFile>;
      deleteCharacter: (characterId: string, baseDirPath?: string) => Promise<void>;
      listItems: (baseDirPath?: string) => Promise<ItemListResult>;
      saveItem: (item: ItemFile, baseDirPath?: string) => Promise<ItemFile>;
      deleteItem: (itemId: string, baseDirPath?: string) => Promise<void>;
    };
  }
}

export {};
