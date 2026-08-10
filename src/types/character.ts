import type { JsonValue } from './json-value';

/** 当前人物文件结构版本。 */
export const CHARACTER_SCHEMA_VERSION = 1;

/**
 * 人物自定义字段集合。
 * 字段名由作者决定，字段值允许嵌套对象或数组，例如：{"武学": [{"名称": "青云剑法"}]}。
 */
export type CharacterCustomFields = Record<string, JsonValue>;

/**
 * 人物 JSON 文件结构。
 * 固定字段只保留最基础的人物信息，其他设定全部放入 customFields。
 */
export interface CharacterFile {
  /** 系统稳定 ID，用于关系、事件、时间线引用，不建议随意修改。 */
  id: string;

  /** 人物显示名称。 */
  name: string;

  /** 人物年龄；未知、约数或特殊年龄可用字符串表达。 */
  age: number | string | null;

  /** 性格标签，例如：谨慎、野心、重情。 */
  traits: string[];

  /** 外貌描述。 */
  appearance: string;

  /** 作者自定义字段，承载武学、身体情况、官职履历等开放设定。 */
  customFields: CharacterCustomFields;

  /** 自定义字段展示顺序；用于保留作者在表单中的 key 排列顺序。 */
  customFieldOrder?: string[];

  /** 人物文件结构版本，用于后续迁移。 */
  schemaVersion: typeof CHARACTER_SCHEMA_VERSION;
}

/**
 * 创建一个空人物对象。
 * 用于新增人物时提供稳定的默认 JSON 结构。
 */
export function createEmptyCharacter(id: string, name = ''): CharacterFile {
  return {
    id,
    name,
    age: null,
    traits: [],
    appearance: '',
    customFields: {},
    schemaVersion: CHARACTER_SCHEMA_VERSION,
  };
}

/**
 * 按人物保存的自定义字段顺序返回条目。
 * 旧文件没有 customFieldOrder 时，回退到 JSON 对象自身顺序。
 */
export function getCharacterCustomFieldEntries(character: CharacterFile | null): [string, JsonValue][] {
  if (!character) {
    return [];
  }

  const usedKeys = new Set<string>();
  const orderedEntries: [string, JsonValue][] = [];

  character.customFieldOrder?.forEach((fieldKey) => {
    if (Object.prototype.hasOwnProperty.call(character.customFields, fieldKey)) {
      usedKeys.add(fieldKey);
      orderedEntries.push([fieldKey, character.customFields[fieldKey]]);
    }
  });

  Object.entries(character.customFields).forEach(([fieldKey, fieldValue]) => {
    if (!usedKeys.has(fieldKey)) {
      orderedEntries.push([fieldKey, fieldValue]);
    }
  });

  return orderedEntries;
}

/**
 * 判断未知数据是否满足人物文件的最小结构。
 * 这里只校验系统必须字段，自定义字段内容由作者自由决定。
 */
export function isCharacterFile(value: unknown): value is CharacterFile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<CharacterFile>;
  const ageIsValid =
    typeof data.age === 'number' || typeof data.age === 'string' || data.age === null;
  const customFieldOrderIsValid =
    data.customFieldOrder === undefined ||
    (Array.isArray(data.customFieldOrder) &&
      data.customFieldOrder.every((fieldKey) => typeof fieldKey === 'string'));

  return (
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    ageIsValid &&
    Array.isArray(data.traits) &&
    data.traits.every((trait) => typeof trait === 'string') &&
    typeof data.appearance === 'string' &&
    typeof data.customFields === 'object' &&
    data.customFields !== null &&
    !Array.isArray(data.customFields) &&
    customFieldOrderIsValid &&
    data.schemaVersion === CHARACTER_SCHEMA_VERSION
  );
}
