<script setup lang="ts">
/**
 * 关系图谱顶部工具栏。
 * 负责展示模块标题、系统人物图谱入口、自定义图谱切换和图谱管理按钮。
 */
import type { RelationGraphFile } from '@/types';

const props = defineProps<{
  /** 当前选中的图谱 ID。 */
  currentGraphId: string;
  /** 当前图谱对象。 */
  currentGraph: RelationGraphFile | null;
  /** 自定义图谱列表。 */
  customGraphs: RelationGraphFile[];
  /** 是否正在读取图谱数据。 */
  isLoading: boolean;
  /** 是否正在保存图谱数据。 */
  isSaving: boolean;
  /** 当前图谱是否为系统默认人物图谱。 */
  isCharacterDefaultGraph: boolean;
}>();

const emit = defineEmits<{
  /** 更新当前图谱 ID。 */
  'update:currentGraphId': [graphId: string];
  /** 刷新图谱数据。 */
  refresh: [];
  /** 打开重命名图谱弹窗。 */
  rename: [];
  /** 打开新建图谱弹窗。 */
  create: [];
  /** 删除当前图谱。 */
  delete: [];
}>();

/** 系统默认人物图谱 ID。 */
const DEFAULT_CHARACTER_GRAPH_ID = 'graph_default_characters';

/**
 * 切换当前图谱。
 * @param graphId 图谱 ID
 */
function updateCurrentGraph(graphId: string): void {
  emit('update:currentGraphId', graphId);
}
</script>

<template>
  <header class="relation-toolbar">
    <div class="relation-title-group">
      <h2 class="relation-title">关系图谱</h2>
      <n-text depth="3" class="relation-subtitle">
        以当前选中块为根查看关系树。
      </n-text>
    </div>

    <div class="graph-switcher" aria-label="图谱选择栏">
      <button
        class="default-graph-button"
        :class="{ 'is-active': props.currentGraph?.kind === 'character-default' }"
        type="button"
        @click="updateCurrentGraph(DEFAULT_CHARACTER_GRAPH_ID)"
      >
        人物图谱
        <span>系统默认</span>
      </button>

      <select
        class="graph-select"
        aria-label="自定义图谱"
        :value="props.currentGraphId"
        @change="updateCurrentGraph(($event.target as HTMLSelectElement).value)"
      >
        <option disabled value="">自定义图谱</option>
        <option v-for="graph in props.customGraphs" :key="graph.id" :value="graph.id">
          {{ graph.name }}
        </option>
      </select>

      <div class="graph-tool-group">
        <n-button size="small" :loading="props.isLoading" @click="emit('refresh')">
          刷新
        </n-button>
        <n-button size="small" :disabled="props.isCharacterDefaultGraph || props.isSaving" @click="emit('rename')">
          重命名
        </n-button>
        <n-button size="small" :disabled="props.isSaving" @click="emit('create')">
          新建
        </n-button>
        <n-button
          size="small"
          type="error"
          :disabled="props.isCharacterDefaultGraph || props.isSaving"
          @click="emit('delete')"
        >
          删除
        </n-button>
      </div>
    </div>
  </header>
</template>

<style scoped>
/** 顶部工具栏，承载模块标题和多图谱切换入口。 */
.relation-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 42px;
}

/** 页面标题区域。 */
.relation-title-group {
  display: grid;
  gap: 4px;
  min-width: 0;
}

/** 页面标题。 */
.relation-title {
  color: #17212b;
  font-size: 22px;
  line-height: 1.25;
}

/** 页面说明。 */
.relation-subtitle {
  max-width: 760px;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/** 图谱切换控件组。 */
.graph-switcher {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

/** 系统默认人物图谱入口。 */
.default-graph-button {
  display: grid;
  gap: 2px;
  min-width: 120px;
  padding: 7px 12px;
  color: #2a3441;
  text-align: left;
  background: #ffffff;
  border: 1px solid #cfd9e5;
  border-radius: 7px;
  cursor: pointer;
}

.default-graph-button span {
  color: #6a7786;
  font-size: 11px;
  line-height: 1.2;
}

.default-graph-button.is-active {
  color: #0f4f8f;
  background: #eef7ff;
  border-color: #6ea8dd;
}

/** 自定义图谱原生下拉，后续可替换为组件化菜单。 */
.graph-select {
  width: 190px;
  height: 34px;
  padding: 0 10px;
  color: #24313d;
  background: #ffffff;
  border: 1px solid #cfd9e5;
  border-radius: 7px;
  outline: none;
}

.graph-select:focus {
  border-color: #2f80ed;
  box-shadow: 0 0 0 2px rgba(47, 128, 237, 0.12);
}

/** 图谱管理工具组，降低顶栏按钮的视觉存在感。 */
.graph-tool-group {
  display: flex;
  gap: 6px;
  align-items: center;
  padding-left: 10px;
  border-left: 1px solid #dce4ee;
}
</style>
