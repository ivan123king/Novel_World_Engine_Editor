/**
 * JSON 基础类型定义。
 * 用于描述作者自定义字段，允许字符串、数字、布尔值、空值、对象和数组递归嵌套。
 */
export type JsonPrimitive = string | number | boolean | null;

/** JSON 对象结构，key 由用户或系统定义。 */
export interface JsonObject {
  [key: string]: JsonValue;
}

/** 可保存到 JSON 文件中的通用值类型。 */
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];