import { computed, ref } from 'vue';
import { deleteSetting, listSettings, saveSetting } from '@/api/settingApi';
import {
  SETTING_SCHEMA_VERSION,
  createEmptySetting,
  type SettingFile,
} from '@/types';

/** 设定表单字段集合。 */
export interface SettingFormValues {
  /** 设定标题。 */
  title: string;
  /** 设定纯文本内容。 */
  content: string;
}

/** 生成设定表单默认值。 */
function createSettingFormValues(setting?: SettingFile): SettingFormValues {
  return {
    title: setting?.title ?? '',
    content: setting?.content ?? '',
  };
}

/** 生成设定文件安全 ID。 */
function createSettingId(): string {
  return `setting_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 将未知错误格式化成可以展示给作者的文本。 */
function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** 根据关键字匹配设定标题；第一阶段搜索范围只固定为标题。 */
function settingMatchesKeyword(setting: SettingFile, keyword: string): boolean {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return true;
  }

  return setting.title.toLowerCase().includes(normalizedKeyword);
}

/** 生成用于列表摘要的短内容，避免长设定正文挤压列表布局。 */
function createSettingExcerpt(content: string): string {
  const normalizedContent = content.replace(/\s+/g, ' ').trim();

  if (!normalizedContent) {
    return '未填写内容';
  }

  return normalizedContent.length > 44 ? `${normalizedContent.slice(0, 44)}...` : normalizedContent;
}

/** 管理设定列表页的本地 JSON 数据状态和 UI 交互状态。 */
export function useSettingList() {
  const settings = ref<SettingFile[]>([]);
  const selectedSettingId = ref<string | null>(null);
  const editingSetting = ref<SettingFile | null>(null);
  const formValues = ref<SettingFormValues>(createSettingFormValues());
  const formMode = ref<'create' | 'edit'>('create');
  const isCreateModalOpen = ref(false);
  const isEditModalOpen = ref(false);
  const isLoading = ref(false);
  const isSaving = ref(false);
  const loadError = ref('');
  const saveError = ref('');
  const fileErrors = ref<string[]>([]);
  const dataDirectory = ref('');
  const searchKeyword = ref('');
  const formError = ref('');

  const settingCount = computed(() => settings.value.length);
  const filteredSettings = computed(() =>
    settings.value.filter((setting) => settingMatchesKeyword(setting, searchKeyword.value)),
  );
  const selectedSetting = computed(
    () =>
      filteredSettings.value.find((setting) => setting.id === selectedSettingId.value) ??
      filteredSettings.value[0] ??
      null,
  );
  const isEmpty = computed(() => !isLoading.value && settingCount.value === 0);
  const isSearchEmpty = computed(
    () => !isLoading.value && settingCount.value > 0 && filteredSettings.value.length === 0,
  );
  const hasErrorMessage = computed(() => Boolean(loadError.value || saveError.value || fileErrors.value.length));
  const canSubmitForm = computed(() => formValues.value.title.trim().length > 0 && !isSaving.value);

  /** 通过设定 API 重新读取设定列表。 */
  async function loadSettings(): Promise<void> {
    isLoading.value = true;
    loadError.value = '';
    saveError.value = '';

    try {
      const result = await listSettings();
      settings.value = result.settings;
      dataDirectory.value = result.baseDir;
      fileErrors.value = result.errors;

      if (
        selectedSettingId.value !== null &&
        !settings.value.some((setting) => setting.id === selectedSettingId.value)
      ) {
        selectedSettingId.value = null;
      }
    } catch (error) {
      loadError.value = formatError(error);
      settings.value = [];
      fileErrors.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  /** 打开设定详情 Inspector。 */
  function openDetail(setting: SettingFile): void {
    selectedSettingId.value = setting.id;
  }

  /** 打开新建设定弹框。 */
  function openCreate(): void {
    saveError.value = '';
    formError.value = '';
    formMode.value = 'create';
    formValues.value = createSettingFormValues();
    isCreateModalOpen.value = true;
  }

  /** 打开编辑设定弹框。 */
  function openEdit(setting: SettingFile): void {
    saveError.value = '';
    formError.value = '';
    formMode.value = 'edit';
    editingSetting.value = setting;
    formValues.value = createSettingFormValues(setting);
    isEditModalOpen.value = true;
  }

  /** 关闭当前表单弹框并清理编辑状态。 */
  function closeForm(): void {
    isCreateModalOpen.value = false;
    isEditModalOpen.value = false;
    editingSetting.value = null;
    formError.value = '';
  }

  /** 根据表单值构造设定对象，并保留编辑对象中的未知顶层字段。 */
  function buildSettingFromForm(values: SettingFormValues, original?: SettingFile): SettingFile {
    const nextSetting = original
      ? { ...original }
      : createEmptySetting(createSettingId(), values.title.trim());

    nextSetting.title = values.title.trim();
    nextSetting.content = values.content;
    nextSetting.schemaVersion = original?.schemaVersion ?? SETTING_SCHEMA_VERSION;

    return nextSetting;
  }

  /** 提交新建或编辑表单，成功后写入当前小说项目的 settings/*.json。 */
  async function submitForm(): Promise<void> {
    if (!canSubmitForm.value) {
      formError.value = '标题不能为空';
      return;
    }

    isSaving.value = true;
    saveError.value = '';
    formError.value = '';

    try {
      const currentEditingSetting = formMode.value === 'edit' ? editingSetting.value ?? undefined : undefined;
      const nextSetting = buildSettingFromForm(formValues.value, currentEditingSetting);
      const savedSetting = await saveSetting(nextSetting);
      const existingIndex = settings.value.findIndex((setting) => setting.id === savedSetting.id);

      if (existingIndex >= 0) {
        settings.value = settings.value.map((setting) =>
          setting.id === savedSetting.id ? savedSetting : setting,
        );
      } else {
        settings.value = [savedSetting, ...settings.value];
      }

      selectedSettingId.value = savedSetting.id;
      closeForm();
    } catch (error) {
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  /** 删除设定并同步移除页面状态。 */
  async function removeSetting(settingId: string): Promise<void> {
    isSaving.value = true;
    saveError.value = '';

    try {
      await deleteSetting(settingId);
      settings.value = settings.value.filter((setting) => setting.id !== settingId);

      if (selectedSettingId.value === settingId) {
        selectedSettingId.value = null;
      }

      if (editingSetting.value?.id === settingId) {
        closeForm();
      }
    } catch (error) {
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  return {
    settings,
    filteredSettings,
    selectedSetting,
    selectedSettingId,
    settingCount,
    editingSetting,
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
    searchKeyword,
    formError,
    isEmpty,
    isSearchEmpty,
    hasErrorMessage,
    canSubmitForm,
    loadSettings,
    openDetail,
    openCreate,
    openEdit,
    closeForm,
    submitForm,
    removeSetting,
    createSettingExcerpt,
  };
}
