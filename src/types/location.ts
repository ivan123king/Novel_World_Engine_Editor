import type { JsonValue } from './json-value';

/** 当前地点文件结构版本。 */
export const LOCATION_SCHEMA_VERSION = 1;

/**
 * 地点自定义字段集合。
 * 字段名由作者决定，用于保存风土、人情、资源、治安等题材相关设定。
 */
export type LocationCustomFields = Record<string, JsonValue>;

/**
 * 地点 JSON 文件结构。
 * 固定字段只保存地图模块第一阶段真正需要的信息，其他设定进入 customFields。
 */
export interface LocationFile {
  /** 系统稳定 ID，用于地图 pin、事件、人物、物品等后续引用。 */
  id: string;

  /** 地点显示名称，例如：南京、秦淮河畔。 */
  name: string;

  /** 地点类型，例如：世界、地区、城市、街区、建筑。 */
  type?: string;

  /** 上级地点 ID；顶层地点可以为 null 或省略。 */
  parentLocationId?: string | null;

  /** 地点介绍。 */
  description?: string;

  /** 作者自定义字段，承载开放设定。 */
  customFields: LocationCustomFields;

  /** 自定义字段展示顺序；用于保留作者在表单中的 key 排列顺序。 */
  customFieldOrder?: string[];

  /** 地点文件结构版本，用于后续迁移。 */
  schemaVersion: typeof LOCATION_SCHEMA_VERSION;
}

/**
 * 创建一个空地点对象。
 * @param id 地点稳定 ID
 * @param name 地点显示名称
 */
export function createEmptyLocation(id: string, name = ''): LocationFile {
  return {
    id,
    name,
    type: '',
    parentLocationId: null,
    description: '',
    customFields: {},
    schemaVersion: LOCATION_SCHEMA_VERSION,
  };
}

/**
 * 判断未知值是否是可保存的 JSON 值。
 * @param value 待校验的未知值
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
 * 判断未知数据是否满足地点文件的最小结构。
 * 这里只校验系统必须字段，未知顶层字段允许保留给后续版本。
 */
export function isLocationFile(value: unknown): value is LocationFile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<LocationFile>;
  const typeIsValid = data.type === undefined || typeof data.type === 'string';
  const parentIsValid =
    data.parentLocationId === undefined ||
    data.parentLocationId === null ||
    typeof data.parentLocationId === 'string';
  const descriptionIsValid =
    data.description === undefined || typeof data.description === 'string';
  const customFieldOrderIsValid =
    data.customFieldOrder === undefined ||
    (Array.isArray(data.customFieldOrder) &&
      data.customFieldOrder.every((fieldKey) => typeof fieldKey === 'string'));

  return (
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    typeIsValid &&
    parentIsValid &&
    descriptionIsValid &&
    typeof data.customFields === 'object' &&
    data.customFields !== null &&
    !Array.isArray(data.customFields) &&
    Object.values(data.customFields).every(isJsonValue) &&
    customFieldOrderIsValid &&
    data.schemaVersion === LOCATION_SCHEMA_VERSION
  );
}
