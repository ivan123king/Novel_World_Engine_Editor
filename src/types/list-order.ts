/** 当前列表排序元数据结构版本。 */
export const LIST_ORDER_SCHEMA_VERSION = 1;

/** 支持保存用户自定义列表顺序的实体类型。 */
export type ListOrderEntityType = 'characters' | 'items';

/**
 * 列表排序元数据文件结构。
 * 只保存实体 ID 的展示顺序，不写入人物或物品题材字段，便于作者直接检查和版本管理。
 */
export interface ListOrderFile {
  /** 排序所属的实体类型。 */
  entityType: ListOrderEntityType;

  /** 用户当前确认的列表展示顺序。 */
  ids: string[];

  /** 排序元数据结构版本，用于后续迁移。 */
  schemaVersion: typeof LIST_ORDER_SCHEMA_VERSION;
}

/**
 * 创建列表排序元数据对象。
 * @param entityType 排序所属实体类型
 * @param ids 当前实体 ID 顺序
 */
export function createListOrderFile(
  entityType: ListOrderEntityType,
  ids: string[],
): ListOrderFile {
  return {
    entityType,
    ids,
    schemaVersion: LIST_ORDER_SCHEMA_VERSION,
  };
}

/**
 * 判断未知数据是否满足列表排序元数据结构。
 * 排序文件只接受 characters/items 两类，避免其他文件误用同一格式。
 */
export function isListOrderFile(value: unknown): value is ListOrderFile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<ListOrderFile>;

  return (
    (data.entityType === 'characters' || data.entityType === 'items') &&
    Array.isArray(data.ids) &&
    data.ids.every((id) => typeof id === 'string') &&
    data.schemaVersion === LIST_ORDER_SCHEMA_VERSION
  );
}
