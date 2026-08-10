import type { JsonValue } from './json-value';

/** 当前物品文件结构版本。 */
export const ITEM_SCHEMA_VERSION = 1;

/**
 * 物品自定义字段集合。
 * 字段名由作者决定，字段值允许嵌套对象或数组，例如：{"锋利度": "极高", "来历": {"章节": 12}}。
 */
export type ItemCustomFields = Record<string, JsonValue>;

/**
 * 物品 JSON 文件结构。
 * 固定字段只保留系统需要的最小信息，其他设定全部放入 customFields。
 */
export interface ItemFile {
  /** 系统稳定 ID，用于事件、时间线、关系或归属引用，不建议随意修改。 */
  id: string;

  /** 物品显示名称，例如：屠龙刀、青云剑、密信。 */
  name: string;

  /** 作者自定义字段，承载类型、持有人、位置、来历、状态、能力等开放设定。 */
  customFields: ItemCustomFields;

  /** 物品文件结构版本，用于后续迁移。 */
  schemaVersion: typeof ITEM_SCHEMA_VERSION;
}

/**
 * 创建一个空物品对象。
 * 用于新增物品时提供稳定的默认 JSON 结构。
 */
export function createEmptyItem(id: string, name = ''): ItemFile {
  return {
    id,
    name,
    customFields: {},
    schemaVersion: ITEM_SCHEMA_VERSION,
  };
}

/**
 * 判断未知值是否是合法 JSON 值。
 * 用于校验物品自定义字段，避免函数、undefined 等无法保存到 JSON 的值进入数据层。
 */
function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) {
    return true;
  }

  const valueType = typeof value;

  if (valueType === 'string' || valueType === 'boolean') {
    return true;
  }

  if (valueType === 'number') {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (valueType === 'object') {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }

  return false;
}

/**
 * 判断未知数据是否满足物品文件的最小结构。
 * 这里只校验系统必须字段，自定义字段名和值由作者自由决定。
 */
export function isItemFile(value: unknown): value is ItemFile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<ItemFile>;

  return (
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    typeof data.customFields === 'object' &&
    data.customFields !== null &&
    !Array.isArray(data.customFields) &&
    Object.values(data.customFields).every(isJsonValue) &&
    data.schemaVersion === ITEM_SCHEMA_VERSION
  );
}
