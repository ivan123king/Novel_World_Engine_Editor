import { readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { ensureDirectory } from './directory';

/**
 * 本地 JSON 文件读写工具。
 * 只处理通用文件能力，不包含人物、物品、关系或 AI 分析等业务逻辑。
 */

/**
 * 将对象保存为 JSON 文件。
 * 会自动创建父目录，使用 UTF-8 和 2 空格缩进，默认覆盖已有文件。
 */
export async function saveJsonFile<T>(filePath: string, data: T): Promise<void> {
  await ensureDirectory(dirname(filePath));

  try {
    const jsonContent = JSON.stringify(data, null, 2);

    if (jsonContent === undefined) {
      throw new Error('传入数据无法序列化为 JSON');
    }

    await writeFile(filePath, `${jsonContent}\n`, 'utf8');
  } catch (error) {
    throw new Error(`保存 JSON 文件失败：${filePath}`, { cause: error });
  }
}

/**
 * 读取 JSON 文件并解析为 unknown。
 * 业务层必须在后续使用 validator 将 unknown 收窄成具体类型。
 */
export async function loadJsonFile(filePath: string): Promise<unknown> {
  let fileContent: string;

  try {
    fileContent = await readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`读取 JSON 文件失败，文件可能不存在：${filePath}`, { cause: error });
  }

  try {
    return JSON.parse(fileContent) as unknown;
  } catch (error) {
    throw new Error(`JSON 文件格式错误：${filePath}`, { cause: error });
  }
}

/**
 * 读取 JSON 文件，并使用调用方传入的校验函数恢复成目标类型。
 * 校验函数由具体业务类型提供，例如 isCharacterFile。
 */
export async function loadJsonFileAs<T>(
  filePath: string,
  validator: (value: unknown) => value is T,
): Promise<T> {
  const value = await loadJsonFile(filePath);

  if (!validator(value)) {
    throw new Error(`JSON 文件结构校验失败：${filePath}`);
  }

  return value;
}
