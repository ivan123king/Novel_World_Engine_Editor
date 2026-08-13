import { computed, ref } from 'vue';
import type { CurrentProject } from '@/types';
import { getCurrentProject, onCurrentProjectChanged, saveProjectOverview } from '@/api/projectApi';

/**
 * 小说项目状态 store。
 * 使用轻量 Vue 响应式单例保存当前项目，供主工作台顶部项目栏和后续模块复用。
 */

/** 当前已打开的小说项目。 */
const currentProject = ref<CurrentProject | null>(null);

/** 是否已经注册 main process 项目变化监听。 */
let hasRegisteredProjectListener = false;

/** 当前小说名。 */
const currentProjectTitle = computed(() => currentProject.value?.novel.title ?? '未选择');

/** 当前小说项目目录。 */
const currentProjectPath = computed(() => currentProject.value?.baseDir ?? '');

/** 是否已经打开小说项目。 */
const hasCurrentProject = computed(() => currentProject.value !== null);

/** 设置当前小说项目。 */
function setCurrentProject(project: CurrentProject | null): void {
  currentProject.value = project;
}

/**
 * 保存项目首页可编辑字段，并同步 renderer 中的当前项目状态。
 * @param title 小说名
 * @param description 小说简介
 */
async function updateProjectOverview(title: string, description: string): Promise<CurrentProject> {
  const project = await saveProjectOverview(title, description);
  setCurrentProject(project);
  return project;
}

/** 初始化当前项目状态并注册变化监听。 */
async function initializeProjectStore(): Promise<void> {
  if (!hasRegisteredProjectListener) {
    onCurrentProjectChanged(setCurrentProject);
    hasRegisteredProjectListener = true;
  }

  setCurrentProject(await getCurrentProject());
}

/** 暴露小说项目状态和操作。 */
export function useProjectStore() {
  return {
    currentProject,
    currentProjectTitle,
    currentProjectPath,
    hasCurrentProject,
    setCurrentProject,
    initializeProjectStore,
    updateProjectOverview,
  };
}
