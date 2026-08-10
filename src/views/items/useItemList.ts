import { computed, reactive, ref } from 'vue';
import {
  deleteItem as deleteItemFile,
  listItems as loadItemFiles,
  saveItem,
} from '@/api/itemApi';
import {
  createEmptyItem,
  ITEM_SCHEMA_VERSION,
  type ItemCustomFields,
  type ItemFile,
  type JsonValue,
} from '@/types';

/** 物品自定义属性表单行。 */
export interface ItemCustomFieldRow {
  /** 表单行稳定 ID，用于 Vue 列表渲染。 */
  id: string;
  /** 自定义属性名。 */
  key: string;
  /** 自定义属性值的文本表达。 */
  value: string;
}

/** 物品表单字段集合。 */
export interface ItemFormValues {
  /** 物品名称。 */
  name: string;
  /** 自定义属性行。 */
  customFields: ItemCustomFieldRow[];
}

/** 自定义属性行 ID 计数器，保证同一页面会话内的行 key 稳定。 */
let itemFieldRowSeed = 0;

/** 创建一条空的自定义属性行。 */
function createFieldRow(key = '', value = ''): ItemCustomFieldRow {
  itemFieldRowSeed += 1;

  return {
    id: `item_field_${Date.now()}_${itemFieldRowSeed}`,
    key,
    value,
  };
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

/**
 * 将自定义字段值转换为表单文本。
 * @param value 自定义字段值
 */
function stringifyFieldValue(value: JsonValue): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

/**
 * 将表单文本转换成 JSON 值。
 * 解析失败时按普通字符串保留，和人物自定义属性保持一致。
 */
function parseFieldValue(rawValue: string): JsonValue {
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

/**
 * 将物品自定义属性转换为表单行。
 * @param item 物品数据，可为空
 */
function createFormValues(item?: ItemFile | null): ItemFormValues {
  const rows = Object.entries(item?.customFields ?? {}).map(([key, value]) =>
    createFieldRow(key, stringifyFieldValue(value)),
  );

  return {
    name: item?.name ?? '',
    customFields: rows.length > 0 ? rows : [createFieldRow()],
  };
}

/**
 * 找出表单中的重复 key。
 * 空 key 不参与重复判断。
 */
function findDuplicateFieldKeys(rows: ItemCustomFieldRow[]): string[] {
  const keyCount = new Map<string, number>();

  rows.forEach((row) => {
    const fieldKey = row.key.trim();

    if (!fieldKey) {
      return;
    }

    keyCount.set(fieldKey, (keyCount.get(fieldKey) ?? 0) + 1);
  });

  return Array.from(keyCount.entries())
    .filter(([, count]) => count > 1)
    .map(([key]) => key);
}

/**
 * 将表单行转换为 customFields。
 * 重复 key 已在提交前拦截，这里只负责忽略空 key。
 */
function rowsToCustomFields(rows: ItemCustomFieldRow[]): ItemCustomFields {
  return rows.reduce<ItemCustomFields>((fields, row) => {
    const fieldKey = row.key.trim();

    if (!fieldKey) {
      return fields;
    }

    fields[fieldKey] = parseFieldValue(row.value);
    return fields;
  }, {});
}

/** 生成物品文件安全 ID。 */
function createItemId(): string {
  return `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 深拷贝自定义字段，避免复制物品时共享嵌套对象引用。 */
function cloneCustomFields(customFields: ItemCustomFields): ItemCustomFields {
  return JSON.parse(JSON.stringify(customFields)) as ItemCustomFields;
}

/** 将未知错误格式化成可以展示给作者的文本。 */
function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * 判断物品是否匹配搜索关键字。
 * @param item 物品数据
 * @param keyword 搜索关键字
 */
function itemMatchesKeyword(item: ItemFile, keyword: string): boolean {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return true;
  }

  return [item.id, item.name, JSON.stringify(item.customFields)]
    .join(' ')
    .toLowerCase()
    .includes(normalizedKeyword);
}

/** 管理物品列表页的文件持久化状态和 UI 交互状态。 */
export function useItemList() {
  const items = ref<ItemFile[]>([]);
  const searchKeyword = ref('');
  const selectedItemId = ref<string | null>(null);
  const editingItem = ref<ItemFile | null>(null);
  const isCreateModalOpen = ref(false);
  const isEditModalOpen = ref(false);
  const isLoading = ref(false);
  const isSaving = ref(false);
  const loadError = ref('');
  const saveError = ref('');
  const fileErrors = ref<string[]>([]);
  const dataDirectory = ref('');

  const formValues = reactive<ItemFormValues>({
    name: '',
    customFields: [],
  });

  const formMode = computed(() => (editingItem.value ? 'edit' : 'create'));
  const filteredItems = computed(() =>
    items.value.filter((item) => itemMatchesKeyword(item, searchKeyword.value)),
  );
  const selectedItem = computed(
    () =>
      filteredItems.value.find((item) => item.id === selectedItemId.value) ??
      filteredItems.value[0] ??
      null,
  );
  const selectedCustomFields = computed(() => Object.entries(selectedItem.value?.customFields ?? {}));
  const duplicateFieldKeys = computed(() => findDuplicateFieldKeys(formValues.customFields));
  const hasDuplicateKeys = computed(() => duplicateFieldKeys.value.length > 0);
  const canSubmitForm = computed(() => formValues.name.trim().length > 0 && !hasDuplicateKeys.value);
  const isEmpty = computed(() => !isLoading.value && items.value.length === 0);
  const isSearchEmpty = computed(
    () => !isLoading.value && items.value.length > 0 && filteredItems.value.length === 0,
  );
  const hasErrorMessage = computed(() =>
    Boolean(loadError.value || saveError.value || fileErrors.value.length),
  );

  /** 从本地 JSON 文件重新读取物品列表。 */
  async function loadItems(): Promise<void> {
    isLoading.value = true;
    loadError.value = '';
    saveError.value = '';

    try {
      const result = await loadItemFiles();
      items.value = result.items;
      dataDirectory.value = result.baseDir;
      fileErrors.value = result.errors;

      if (
        selectedItemId.value !== null &&
        !items.value.some((item) => item.id === selectedItemId.value)
      ) {
        selectedItemId.value = null;
      }
    } catch (error) {
      loadError.value = formatError(error);
      items.value = [];
      fileErrors.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 判断某一行 key 是否重复。
   * @param key 当前行 key
   */
  function isDuplicateFieldKey(key: string): boolean {
    return duplicateFieldKeys.value.includes(key.trim());
  }

  /** 根据当前模式重置表单。 */
  function resetForm(): void {
    const nextValues = createFormValues(editingItem.value);
    formValues.name = nextValues.name;
    formValues.customFields = nextValues.customFields;
  }

  /** 打开新建物品弹框。 */
  function openCreate(): void {
    saveError.value = '';
    editingItem.value = null;
    isCreateModalOpen.value = true;
    resetForm();
  }

  /** 打开编辑物品弹框。 */
  function openEdit(item: ItemFile): void {
    saveError.value = '';
    editingItem.value = item;
    isEditModalOpen.value = true;
    resetForm();
  }

  /** 关闭当前物品表单弹框。 */
  function closeForm(): void {
    isCreateModalOpen.value = false;
    isEditModalOpen.value = false;
    editingItem.value = null;
  }

  /** 增加一行自定义属性。 */
  function addCustomField(): void {
    formValues.customFields.push(createFieldRow());
  }

  /**
   * 删除一行自定义属性。
   * @param index 行索引
   */
  function removeCustomField(index: number): void {
    formValues.customFields.splice(index, 1);
  }

  /** 根据表单值构造物品对象，并保留编辑对象中的未知顶层字段。 */
  function buildItemFromForm(original?: ItemFile): ItemFile {
    const nextItem = original
      ? { ...original }
      : createEmptyItem(createItemId(), formValues.name.trim() || '未命名物品');

    nextItem.name = formValues.name.trim() || '未命名物品';
    nextItem.customFields = rowsToCustomFields(formValues.customFields);
    nextItem.schemaVersion = original?.schemaVersion ?? ITEM_SCHEMA_VERSION;

    return nextItem;
  }

  /** 提交当前表单，保存到 JSON 文件后更新页面状态。 */
  async function submitForm(): Promise<void> {
    if (!canSubmitForm.value) {
      return;
    }

    isSaving.value = true;
    saveError.value = '';

    try {
      const nextItem = buildItemFromForm(editingItem.value ?? undefined);
      const savedItem = await saveItem(nextItem);

      if (editingItem.value) {
        items.value = items.value.map((item) => (item.id === savedItem.id ? savedItem : item));
      } else {
        items.value = [...items.value, savedItem];
      }

      items.value = items.value.sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'));
      selectedItemId.value = savedItem.id;
      closeForm();
    } catch (error) {
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  /**
   * 删除物品 JSON 文件，并同步移除页面状态。
   * @param itemId 待删除物品 ID
   */
  async function deleteItem(itemId: string): Promise<void> {
    isSaving.value = true;
    saveError.value = '';

    try {
      await deleteItemFile(itemId);
      items.value = items.value.filter((item) => item.id !== itemId);

      if (selectedItemId.value === itemId) {
        selectedItemId.value = items.value[0]?.id ?? null;
      }

      if (editingItem.value?.id === itemId) {
        closeForm();
      }
    } catch (error) {
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  /**
   * 复制物品为一个新的 JSON 文件。
   * @param item 待复制物品
   */
  async function duplicateItem(item: ItemFile): Promise<void> {
    isSaving.value = true;
    saveError.value = '';

    try {
      const nextItem: ItemFile = {
        ...item,
        id: createItemId(),
        name: `${item.name} 副本`,
        customFields: cloneCustomFields(item.customFields),
        schemaVersion: ITEM_SCHEMA_VERSION,
      };
      const savedItem = await saveItem(nextItem);

      items.value = [...items.value, savedItem].sort((left, right) =>
        left.name.localeCompare(right.name, 'zh-Hans-CN'),
      );
      selectedItemId.value = savedItem.id;
    } catch (error) {
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  return {
    items,
    filteredItems,
    selectedItem,
    selectedItemId,
    selectedCustomFields,
    editingItem,
    searchKeyword,
    formValues,
    formMode,
    isCreateModalOpen,
    isEditModalOpen,
    isLoading,
    isSaving,
    loadError,
    saveError,
    fileErrors,
    dataDirectory,
    duplicateFieldKeys,
    hasDuplicateKeys,
    canSubmitForm,
    isEmpty,
    isSearchEmpty,
    hasErrorMessage,
    loadItems,
    isDuplicateFieldKey,
    openCreate,
    openEdit,
    closeForm,
    addCustomField,
    removeCustomField,
    submitForm,
    deleteItem,
    duplicateItem,
  };
}
