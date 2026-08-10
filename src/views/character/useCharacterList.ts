import { computed, ref } from 'vue';
import {
  deleteCharacter as deleteCharacterFile,
  listCharacters as loadCharacterFiles,
  saveCharacter,
  saveCharacterOrder,
} from '@/api/characterApi';
import {
  CHARACTER_SCHEMA_VERSION,
  createEmptyCharacter,
  getCharacterCustomFieldEntries,
  type CharacterCustomFields,
  type CharacterFile,
  type JsonValue,
} from '@/types';

/** 人物自定义属性表单行，用于在 UI 中编辑 key = value。 */
export interface CharacterCustomFieldRow {
  /** 表单行稳定 ID，用于 Vue 列表渲染。 */
  id: string;
  /** 自定义属性名。 */
  key: string;
  /** 自定义属性值的文本表达，可保存为普通文本或 JSON 值。 */
  value: string;
}

/** 人物表单字段集合。 */
export interface CharacterFormValues {
  name: string;
  age: string;
  traits: string;
  appearance: string;
  customFields: CharacterCustomFieldRow[];
}

/** 列表拖放插入位置。 */
export type CharacterDropPlacement = 'before' | 'after';

/** 自定义属性行 ID 计数器，保证同一页面会话内的行 key 稳定。 */
let customFieldRowSeed = 0;

/** 创建一行空的自定义属性表单数据。 */
export function createCustomFieldRow(key = '', value = ''): CharacterCustomFieldRow {
  customFieldRowSeed += 1;

  return {
    id: `custom_field_${Date.now()}_${customFieldRowSeed}`,
    key,
    value,
  };
}

/** 将表单年龄转换为人物结构允许的 number、string 或 null。 */
function normalizeAge(rawAge: string): number | string | null {
  const ageText = rawAge.trim();

  if (!ageText) {
    return null;
  }

  const numericAge = Number(ageText);
  return Number.isFinite(numericAge) && String(numericAge) === ageText ? numericAge : ageText;
}

/** 将性格输入拆分为 traits 数组。 */
function normalizeTraits(rawTraits: string): string[] {
  return rawTraits
    .split(/[\s,，、]+/)
    .map((trait) => trait.trim())
    .filter(Boolean);
}

/** 判断值是否可以安全保存到 JSON 自定义字段中。 */
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

/** 将已有自定义字段值转换为表单文本，保留对象和数组的 JSON 结构。 */
function stringifyCustomFieldValue(value: JsonValue): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

/** 将 value 输入转换为 JSON 值；无法解析为 JSON 时按普通字符串保存。 */
function parseCustomFieldValue(rawValue: string): JsonValue {
  const valueText = rawValue.trim();

  if (!valueText) {
    return '';
  }

  try {
    const parsedValue = JSON.parse(valueText) as unknown;
    return isJsonValue(parsedValue) ? parsedValue : valueText;
  } catch {
    return valueText;
  }
}

/** 将人物 customFields 转换为可编辑的 key/value 表单行。 */
function createCustomFieldRows(character?: CharacterFile): CharacterCustomFieldRow[] {
  const rows = getCharacterCustomFieldEntries(character ?? null).map(([key, value]) =>
    createCustomFieldRow(key, stringifyCustomFieldValue(value)),
  );

  return rows.length > 0 ? rows : [createCustomFieldRow()];
}

/** 将 key/value 表单行转换为人物 customFields 和顺序，空 key 会被忽略。 */
function normalizeCustomFields(rows: CharacterCustomFieldRow[]): {
  customFields: CharacterCustomFields;
  customFieldOrder: string[];
} {
  const customFieldOrder: string[] = [];
  const customFields = rows.reduce<CharacterCustomFields>((fields, row) => {
    const fieldKey = row.key.trim();

    if (!fieldKey) {
      return fields;
    }

    customFieldOrder.push(fieldKey);
    fields[fieldKey] = parseCustomFieldValue(row.value);
    return fields;
  }, {});

  return {
    customFields,
    customFieldOrder,
  };
}

/** 生成人物表单默认值。 */
export function createCharacterFormValues(character?: CharacterFile): CharacterFormValues {
  return {
    name: character?.name ?? '',
    age: character?.age === null || character?.age === undefined ? '' : String(character.age),
    traits: character?.traits.join('，') ?? '',
    appearance: character?.appearance ?? '',
    customFields: createCustomFieldRows(character),
  };
}

/** 生成人物文件安全 ID。 */
function createCharacterId(): string {
  return `char_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 深拷贝自定义字段，避免复制人物时共享嵌套对象引用。 */
function cloneCustomFields(customFields: CharacterCustomFields): CharacterCustomFields {
  return JSON.parse(JSON.stringify(customFields)) as CharacterCustomFields;
}

/** 将未知错误格式化成可以展示给作者的文本。 */
function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** 根据关键字匹配人物基础字段和自定义字段内容。 */
function characterMatchesKeyword(character: CharacterFile, keyword: string): boolean {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return true;
  }

  const searchableText = [
    character.id,
    character.name,
    character.age === null ? '' : String(character.age),
    character.traits.join(' '),
    character.appearance,
    JSON.stringify(character.customFields),
  ]
    .join(' ')
    .toLowerCase();

  return searchableText.includes(normalizedKeyword);
}

/**
 * 将指定实体移动到目标实体之前或之后。
 * 搜索过滤状态下仍基于完整列表重排，隐藏项会保留其相对顺序。
 */
function moveEntityNear<T extends { id: string }>(
  entities: T[],
  movedId: string,
  targetId: string,
  placement: CharacterDropPlacement,
): T[] {
  if (movedId === targetId) {
    return entities;
  }

  const sourceIndex = entities.findIndex((entity) => entity.id === movedId);
  const targetExists = entities.some((entity) => entity.id === targetId);

  if (sourceIndex < 0 || !targetExists) {
    return entities;
  }

  const nextEntities = [...entities];
  const [movedEntity] = nextEntities.splice(sourceIndex, 1);
  const targetIndex = nextEntities.findIndex((entity) => entity.id === targetId);

  if (targetIndex < 0) {
    return entities;
  }

  nextEntities.splice(placement === 'after' ? targetIndex + 1 : targetIndex, 0, movedEntity);
  return nextEntities;
}

/** 管理人物列表页的文件持久化状态和 UI 交互状态。 */
export function useCharacterList() {
  const characters = ref<CharacterFile[]>([]);
  const selectedCharacterId = ref<string | null>(null);
  const editingCharacter = ref<CharacterFile | null>(null);
  const isCreateModalOpen = ref(false);
  const isEditModalOpen = ref(false);
  const isLoading = ref(false);
  const isSaving = ref(false);
  const loadError = ref('');
  const saveError = ref('');
  const fileErrors = ref<string[]>([]);
  const dataDirectory = ref('');
  const searchKeyword = ref('');
  const draggingCharacterId = ref<string | null>(null);
  const dragOverCharacterId = ref<string | null>(null);
  const characterDropPlacement = ref<CharacterDropPlacement>('before');

  const characterCount = computed(() => characters.value.length);
  const filteredCharacters = computed(() =>
    characters.value.filter((character) => characterMatchesKeyword(character, searchKeyword.value)),
  );
  const selectedCharacter = computed(
    () =>
      filteredCharacters.value.find((character) => character.id === selectedCharacterId.value) ??
      filteredCharacters.value[0] ??
      null,
  );

  /** 保存当前人物 ID 顺序到本地排序元数据文件。 */
  async function persistCharacterOrder(nextCharacters: CharacterFile[]): Promise<void> {
    await saveCharacterOrder(nextCharacters.map((character) => character.id));
  }

  /** 从本地 JSON 文件重新读取人物列表。 */
  async function loadCharacters(): Promise<void> {
    isLoading.value = true;
    loadError.value = '';
    saveError.value = '';

    try {
      const result = await loadCharacterFiles();
      characters.value = result.characters;
      dataDirectory.value = result.baseDir;
      fileErrors.value = result.errors;

      if (
        selectedCharacterId.value !== null &&
        !characters.value.some((character) => character.id === selectedCharacterId.value)
      ) {
        selectedCharacterId.value = null;
      }
    } catch (error) {
      loadError.value = formatError(error);
      characters.value = [];
      fileErrors.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  /** 打开人物详情 Inspector。 */
  function openDetail(character: CharacterFile): void {
    selectedCharacterId.value = character.id;
  }

  /** 关闭人物详情 Inspector。 */
  function closeDetail(): void {
    selectedCharacterId.value = null;
  }

  /** 打开新建人物弹框。 */
  function openCreate(): void {
    saveError.value = '';
    isCreateModalOpen.value = true;
  }

  /** 关闭新建人物弹框。 */
  function closeCreate(): void {
    isCreateModalOpen.value = false;
  }

  /** 打开编辑人物弹框。 */
  function openEdit(character: CharacterFile): void {
    saveError.value = '';
    editingCharacter.value = character;
    isEditModalOpen.value = true;
  }

  /** 关闭编辑人物弹框。 */
  function closeEdit(): void {
    editingCharacter.value = null;
    isEditModalOpen.value = false;
  }

  /** 根据表单值构造人物对象，并保留编辑对象中的未知顶层字段。 */
  function buildCharacterFromForm(values: CharacterFormValues, original?: CharacterFile): CharacterFile {
    const nextCharacter = original
      ? { ...original }
      : createEmptyCharacter(createCharacterId(), values.name.trim() || '未命名人物');

    nextCharacter.name = values.name.trim() || '未命名人物';
    nextCharacter.age = normalizeAge(values.age);
    nextCharacter.traits = normalizeTraits(values.traits);
    nextCharacter.appearance = values.appearance.trim();
    const { customFields, customFieldOrder } = normalizeCustomFields(values.customFields);
    nextCharacter.customFields = customFields;
    nextCharacter.customFieldOrder = customFieldOrder;
    nextCharacter.schemaVersion = original?.schemaVersion ?? CHARACTER_SCHEMA_VERSION;

    return nextCharacter;
  }

  /** 根据表单值创建人物，保存到 JSON 文件后更新页面状态。 */
  async function createCharacter(values: CharacterFormValues): Promise<void> {
    isSaving.value = true;
    saveError.value = '';

    try {
      const nextCharacter = buildCharacterFromForm(values);
      const savedCharacter = await saveCharacter(nextCharacter);
      const nextCharacters = [...characters.value, savedCharacter];

      characters.value = nextCharacters;
      selectedCharacterId.value = savedCharacter.id;
      closeCreate();
      await persistCharacterOrder(nextCharacters);
    } catch (error) {
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  /** 根据表单值更新人物，保存到 JSON 文件后替换页面状态。 */
  async function updateCharacter(characterId: string, values: CharacterFormValues): Promise<void> {
    const currentCharacter = characters.value.find((character) => character.id === characterId);

    if (!currentCharacter) {
      saveError.value = '要更新的人物不存在';
      return;
    }

    isSaving.value = true;
    saveError.value = '';

    try {
      const nextCharacter = buildCharacterFromForm(values, currentCharacter);
      const savedCharacter = await saveCharacter(nextCharacter);

      characters.value = characters.value
        .map((character) => (character.id === characterId ? savedCharacter : character));
      selectedCharacterId.value = savedCharacter.id;
      closeEdit();
    } catch (error) {
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  /** 删除人物 JSON 文件，并同步移除页面状态。 */
  async function deleteCharacter(characterId: string): Promise<void> {
    isSaving.value = true;
    saveError.value = '';

    try {
      await deleteCharacterFile(characterId);
      const nextCharacters = characters.value.filter((character) => character.id !== characterId);

      characters.value = nextCharacters;

      if (selectedCharacterId.value === characterId) {
        selectedCharacterId.value = null;
      }

      if (editingCharacter.value?.id === characterId) {
        closeEdit();
      }

      await persistCharacterOrder(nextCharacters);
    } catch (error) {
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  /** 复制当前人物为一个新的 JSON 文件。 */
  async function duplicateCharacter(character: CharacterFile): Promise<void> {
    isSaving.value = true;
    saveError.value = '';

    try {
      const nextCharacter: CharacterFile = {
        ...character,
        id: createCharacterId(),
        name: `${character.name} 副本`,
        customFields: cloneCustomFields(character.customFields),
        schemaVersion: CHARACTER_SCHEMA_VERSION,
      };
      const savedCharacter = await saveCharacter(nextCharacter);
      const nextCharacters = [...characters.value, savedCharacter];

      characters.value = nextCharacters;
      selectedCharacterId.value = savedCharacter.id;
      await persistCharacterOrder(nextCharacters);
    } catch (error) {
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  /** 开始拖动人物列表项。 */
  function startCharacterDrag(characterId: string): void {
    if (isSaving.value || isLoading.value) {
      return;
    }

    draggingCharacterId.value = characterId;
    dragOverCharacterId.value = characterId;
  }

  /** 记录当前拖动悬停的人物，用于高亮潜在插入位置。 */
  function hoverCharacterDropTarget(
    characterId: string,
    placement: CharacterDropPlacement,
  ): void {
    if (!draggingCharacterId.value || draggingCharacterId.value === characterId) {
      dragOverCharacterId.value = null;
      return;
    }

    dragOverCharacterId.value = characterId;
    characterDropPlacement.value = placement;
  }

  /** 清理人物拖拽状态。 */
  function resetCharacterDrag(): void {
    draggingCharacterId.value = null;
    dragOverCharacterId.value = null;
    characterDropPlacement.value = 'before';
  }

  /**
   * 完成人物拖放并立即写入排序文件。
   * 保存失败时回滚本次视觉顺序，避免界面和 JSON 元数据不一致。
   */
  async function dropCharacterOn(
    targetCharacterId: string,
    placement: CharacterDropPlacement,
  ): Promise<void> {
    const movedCharacterId = draggingCharacterId.value;
    resetCharacterDrag();

    if (!movedCharacterId || movedCharacterId === targetCharacterId) {
      return;
    }

    const previousCharacters = characters.value;
    const nextCharacters = moveEntityNear(
      previousCharacters,
      movedCharacterId,
      targetCharacterId,
      placement,
    );

    if (nextCharacters === previousCharacters) {
      return;
    }

    isSaving.value = true;
    saveError.value = '';
    characters.value = nextCharacters;
    selectedCharacterId.value = movedCharacterId;

    try {
      await persistCharacterOrder(nextCharacters);
    } catch (error) {
      characters.value = previousCharacters;
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  return {
    characters,
    filteredCharacters,
    characterCount,
    selectedCharacter,
    editingCharacter,
    isCreateModalOpen,
    isEditModalOpen,
    isLoading,
    isSaving,
    loadError,
    saveError,
    fileErrors,
    dataDirectory,
    searchKeyword,
    draggingCharacterId,
    dragOverCharacterId,
    characterDropPlacement,
    loadCharacters,
    openDetail,
    closeDetail,
    openCreate,
    closeCreate,
    openEdit,
    closeEdit,
    deleteCharacter,
    duplicateCharacter,
    createCharacter,
    updateCharacter,
    startCharacterDrag,
    hoverCharacterDropTarget,
    resetCharacterDrag,
    dropCharacterOn,
  };
}
