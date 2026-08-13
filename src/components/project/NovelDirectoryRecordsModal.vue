<script setup lang="ts">
/**
 * 小说目录记录弹框组件。
 * 监听 Electron 小说菜单事件，展示已记录的小说项目目录，并提供快捷打开和删除记录能力。
 */
import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
  deleteNovelDirectoryRecord,
  listNovelDirectoryRecords,
  onOpenNovelDirectoryRecordsModal,
  openNovelDirectoryRecord,
} from '@/api/novelDirectoryRecordsApi';
import type { NovelDirectoryRecord } from '@/types';

const isVisible = ref(false);
const isLoading = ref(false);
const activeFolderPath = ref('');
const errorMessage = ref('');
const records = ref<NovelDirectoryRecord[]>([]);

let removeOpenListener: (() => void) | null = null;

/** 是否存在小说目录记录。 */
const hasRecords = computed(() => records.value.length > 0);

/** 从目录路径中取最后一级名称，作为小说名为空时的展示兜底。 */
function getFolderName(folderPath: string): string {
  const normalizedPath = folderPath.replace(/\\/g, '/').replace(/\/+$/, '');
  const segments = normalizedPath.split('/');
  return segments.at(-1) || folderPath;
}

/**
 * 获取记录展示标题。
 * @param record 小说目录记录
 */
function getRecordTitle(record: NovelDirectoryRecord): string {
  return record.title.trim() || getFolderName(record.folderPath);
}

/** 读取小说目录记录列表。 */
async function loadRecords(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    const recordsFile = await listNovelDirectoryRecords();
    records.value = recordsFile.records;
  } catch (error) {
    records.value = [];
    errorMessage.value =
      error instanceof Error ? error.message : '小说目录记录读取失败，请稍后重试。';
  } finally {
    isLoading.value = false;
  }
}

/** 打开小说目录记录弹框并加载列表。 */
async function openModal(): Promise<void> {
  isVisible.value = true;
  await loadRecords();
}

/** 关闭小说目录记录弹框。 */
function closeModal(): void {
  if (activeFolderPath.value) {
    return;
  }

  isVisible.value = false;
  errorMessage.value = '';
}

/**
 * 快捷打开某条小说目录记录。
 * @param folderPath 已记录的小说项目目录
 */
async function handleOpenRecord(folderPath: string): Promise<void> {
  activeFolderPath.value = folderPath;
  errorMessage.value = '';

  try {
    await openNovelDirectoryRecord(folderPath);
    isVisible.value = false;
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'novel.json 文件结构无效，无法打开该小说项目。';
  } finally {
    activeFolderPath.value = '';
  }
}

/**
 * 删除某条小说目录记录。
 * @param folderPath 待删除记录的小说项目目录
 */
async function handleDeleteRecord(folderPath: string): Promise<void> {
  activeFolderPath.value = folderPath;
  errorMessage.value = '';

  try {
    const recordsFile = await deleteNovelDirectoryRecord(folderPath);
    records.value = recordsFile.records;
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '删除小说目录记录失败，请稍后重试。';
  } finally {
    activeFolderPath.value = '';
  }
}

onMounted(() => {
  try {
    removeOpenListener = onOpenNovelDirectoryRecordsModal(() => {
      void openModal();
    });
  } catch {
    // preload 未就绪时不注册小说目录菜单事件，保持普通浏览器环境可加载。
  }
});

onUnmounted(() => {
  removeOpenListener?.();
  removeOpenListener = null;
});
</script>

<template>
  <n-modal
    v-model:show="isVisible"
    preset="card"
    title="小说目录"
    style="width: min(740px, calc(100vw - 48px))"
    :mask-closable="!activeFolderPath"
    @close="closeModal"
  >
    <div class="novel-directory-records">
      <n-text v-if="errorMessage" type="error" class="novel-directory-records__error">
        {{ errorMessage }}
      </n-text>

      <n-empty
        v-if="!isLoading && !hasRecords"
        description="还没有记录小说目录。通过“小说 > 新建”或“小说 > 打开”添加。"
      />

      <n-scrollbar v-else class="novel-directory-records__scroll">
        <ul class="novel-directory-records__list">
          <li
            v-for="record in records"
            :key="record.folderPath"
            class="novel-directory-records__item"
          >
            <div class="novel-directory-records__info">
              <strong class="novel-directory-records__title">
                {{ getRecordTitle(record) }}
              </strong>
              <span class="novel-directory-records__path">
                {{ record.folderPath }}
              </span>
            </div>

            <div class="novel-directory-records__actions">
              <n-button
                size="small"
                type="primary"
                :loading="activeFolderPath === record.folderPath"
                :disabled="Boolean(activeFolderPath) && activeFolderPath !== record.folderPath"
                @click="handleOpenRecord(record.folderPath)"
              >
                打开
              </n-button>
              <n-button
                size="small"
                type="error"
                secondary
                :disabled="Boolean(activeFolderPath)"
                @click="handleDeleteRecord(record.folderPath)"
              >
                删除记录
              </n-button>
            </div>
          </li>
        </ul>
      </n-scrollbar>
    </div>
  </n-modal>
</template>

<style scoped>
/** 小说目录弹框主体采用紧凑列表布局，适合重复打开和检查路径。 */
.novel-directory-records {
  display: grid;
  gap: 14px;
}

/** 错误信息独立显示，避免和目录路径混淆。 */
.novel-directory-records__error {
  display: block;
}

/** 列表过多时只让弹框内容区滚动，不影响主工作台。 */
.novel-directory-records__scroll {
  max-height: min(56vh, 520px);
}

.novel-directory-records__list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.novel-directory-records__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #e5e7eb;
}

.novel-directory-records__item:last-child {
  border-bottom: none;
}

.novel-directory-records__info {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.novel-directory-records__title {
  color: #1f2937;
  font-size: 15px;
  line-height: 1.45;
}

.novel-directory-records__path {
  min-width: 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.novel-directory-records__actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

@media (max-width: 680px) {
  .novel-directory-records__item {
    grid-template-columns: 1fr;
  }

  .novel-directory-records__actions {
    justify-content: flex-end;
  }
}
</style>
