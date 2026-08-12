<script setup lang="ts">
/**
 * 剧情库模块页面。
 * 提供真实 JSON 文件驱动的剧情块分层浏览、说明卡片编辑和前端模拟右键菜单。
 */
import { computed, nextTick, onMounted, reactive } from 'vue';
import type {
  PlotContextMenuAction,
  PlotContextTarget,
  PlotDropPlacement,
} from '@/views/plot/usePlotLibrary';
import { usePlotLibrary } from '@/views/plot/usePlotLibrary';

const {
  plots,
  rootPlots,
  currentPlot,
  inspectedPlot,
  breadcrumbPlots,
  childPlots,
  currentDescriptionBlocks,
  saveMessage,
  errorMessage,
  fileErrors,
  isLoading,
  isSaving,
  draggingPlotId,
  dragOverPlotId,
  plotDropPlacement,
  draggingDescriptionId,
  dragOverDescriptionId,
  hasRootPlots,
  hasChildPlots,
  hasDescriptionBlocks,
  hasErrorMessage,
  loadPlots,
  openPlot,
  inspectPlot,
  updateCurrentPlotField,
  createRootPlot,
  createChildPlot,
  deletePlot,
  createDescriptionBlock,
  updateDescriptionBlock,
  deleteDescriptionBlock,
  startPlotDrag,
  hoverPlotDropTarget,
  resetPlotDrag,
  dropPlotOn,
  startDescriptionDrag,
  hoverDescriptionDropTarget,
  resetDescriptionDrag,
  dropDescriptionOn,
  handleContextMenuAction,
} = usePlotLibrary();

/** 前端模拟右键菜单状态；后续可替换为 Electron 原生菜单。 */
const contextMenu = reactive<{
  show: boolean;
  x: number;
  y: number;
  target: PlotContextTarget | null;
}>({
  show: false,
  x: 0,
  y: 0,
  target: null,
});

/** 根据右键命中区域生成对应菜单项。 */
const contextMenuOptions = computed(() => {
  const targetType = contextMenu.target?.targetType;

  if (targetType === 'rootPlot') {
    return [
      { label: '新建同级剧情', key: 'createSiblingPlot' },
      { label: '新建子剧情', key: 'createChildPlot' },
      { label: '重命名', key: 'renamePlot' },
      { label: '删除', key: 'deletePlot' },
    ];
  }

  if (targetType === 'childPlot') {
    return [
      { label: '进入剧情', key: 'openPlot' },
      { label: '新建同级剧情', key: 'createSiblingPlot' },
      { label: '新建子剧情', key: 'createChildPlot' },
      { label: '重命名', key: 'renamePlot' },
      { label: '删除', key: 'deletePlot' },
    ];
  }

  if (targetType === 'descriptionCard') {
    return [
      { label: '编辑说明', key: 'editDescription' },
      { label: '上移', key: 'moveDescriptionUp' },
      { label: '下移', key: 'moveDescriptionDown' },
      { label: '删除', key: 'deleteDescription' },
    ];
  }

  return [
    { label: '新建子剧情', key: 'createChildPlot' },
    { label: '新建说明卡片', key: 'createDescription' },
  ];
});

/**
 * 打开前端模拟右键菜单。
 * @param event 鼠标右键事件
 * @param target 右键命中的剧情库目标
 */
function openContextMenu(event: MouseEvent, target: PlotContextTarget): void {
  event.preventDefault();
  contextMenu.show = false;
  contextMenu.target = target;
  contextMenu.x = event.clientX;
  contextMenu.y = event.clientY;

  void nextTick(() => {
    contextMenu.show = true;
  });
}

/**
 * 执行右键菜单动作。
 * @param key 菜单项 key
 */
function handleContextMenuSelect(key: string | number): void {
  if (!contextMenu.target) {
    return;
  }

  void handleContextMenuAction(key as PlotContextMenuAction, contextMenu.target);
  contextMenu.show = false;
}

/**
 * 根据鼠标在剧情块卡片中的纵向位置判断插入前后。
 * @param event 拖拽事件
 */
function resolvePlotDropPlacement(event: DragEvent): PlotDropPlacement {
  const target = event.currentTarget;

  if (!(target instanceof HTMLElement)) {
    return 'before';
  }

  const targetRect = target.getBoundingClientRect();
  return event.clientY > targetRect.top + targetRect.height / 2 ? 'after' : 'before';
}

/** 页面挂载后从当前小说项目目录读取剧情块文件。 */
onMounted(() => {
  void loadPlots();
});
</script>

<template>
  <section class="plot-page">
    <!-- 前端模拟右键菜单：后续接入 Electron 后可迁移为原生菜单。 -->
    <n-dropdown
      trigger="manual"
      placement="bottom-start"
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :options="contextMenuOptions"
      @select="handleContextMenuSelect"
      @clickoutside="contextMenu.show = false"
    />

    <!-- 页面顶部：标题和当前数据状态。 -->
    <header class="plot-toolbar">
      <div class="plot-title-group">
        <h2 class="plot-title">剧情库</h2>
      </div>

      <n-space align="center" size="small">
        <n-tag size="small" round>{{ plots.length }} 个剧情块</n-tag>
        <n-button size="small" :loading="isLoading" @click="loadPlots">
          刷新
        </n-button>
        <n-button
          size="small"
          type="primary"
          :disabled="isSaving || isLoading"
          @click="createRootPlot"
        >
          新建剧情块
        </n-button>
      </n-space>
    </header>

    <div v-if="hasErrorMessage || saveMessage" class="plot-message-panel">
      <p v-if="errorMessage" class="plot-error-message">{{ errorMessage }}</p>
      <p v-for="fileError in fileErrors" :key="fileError" class="plot-error-message">
        {{ fileError }}
      </p>
      <p v-if="saveMessage" class="plot-save-message">{{ saveMessage }}</p>
    </div>

    <!-- 顶部面包屑：表达当前剧情层级路径。 -->
    <nav class="plot-breadcrumb" aria-label="剧情层级导航">
      <n-text depth="3">当前剧情</n-text>
      <div class="breadcrumb-path">
        <template v-if="breadcrumbPlots.length > 0">
          <template v-for="(plot, index) in breadcrumbPlots" :key="plot.id">
            <button class="breadcrumb-button" type="button" @click="openPlot(plot.id)">
              {{ plot.title || '未命名剧情' }}
            </button>
            <span v-if="index < breadcrumbPlots.length - 1" class="breadcrumb-separator">/</span>
          </template>
        </template>
        <n-text v-else depth="3">暂无剧情块</n-text>
      </div>
    </nav>

    <div class="plot-workspace">
      <!-- 左侧一级剧情块列表。 -->
      <aside class="plot-root-panel" aria-label="一级剧情块列表">
        <div class="panel-heading">
          <n-text strong>剧情块</n-text>
        </div>

        <div class="root-block-list">
          <button
            v-for="plot in rootPlots"
            :key="plot.id"
            class="root-block"
            :class="{
              'is-active': breadcrumbPlots[0]?.id === plot.id,
              'is-dragging': draggingPlotId === plot.id,
              'is-drop-target': dragOverPlotId === plot.id,
              'is-drop-before': dragOverPlotId === plot.id && plotDropPlacement === 'before',
              'is-drop-after': dragOverPlotId === plot.id && plotDropPlacement === 'after',
            }"
            type="button"
            :disabled="isSaving"
            :draggable="!isSaving && !isLoading"
            @click="openPlot(plot.id)"
            @dragstart="startPlotDrag(plot.id)"
            @dragenter="hoverPlotDropTarget(plot.id, resolvePlotDropPlacement($event))"
            @dragover.prevent="hoverPlotDropTarget(plot.id, resolvePlotDropPlacement($event))"
            @drop.prevent="dropPlotOn(plot.id, resolvePlotDropPlacement($event))"
            @dragend="resetPlotDrag"
            @contextmenu="openContextMenu($event, { targetType: 'rootPlot', plotId: plot.id })"
          >
            <span class="root-block-title">{{ plot.title || '未命名剧情' }}</span>
            <span class="root-block-summary">{{ plot.summary || '暂无简介' }}</span>
          </button>

          <n-empty v-if="!isLoading && !hasRootPlots" description="暂无一级剧情块" />
        </div>

      </aside>

      <!-- 当前剧情层工作区：左侧直接子节点，右侧当前剧情内容。 -->
      <section
        class="plot-current-layer"
        aria-label="当前剧情层"
        @contextmenu.self="openContextMenu($event, { targetType: 'workspace', plotId: currentPlot?.id })"
      >
        <aside class="child-node-panel" aria-label="直接子节点区域">
          <div class="panel-heading">
            <n-text strong>子剧情块</n-text>
          </div>

          <div class="child-node-list">
            <button
              v-for="plot in childPlots"
              :key="plot.id"
              class="child-node"
              :class="{
                'is-dragging': draggingPlotId === plot.id,
                'is-active': inspectedPlot?.id === plot.id,
                'is-drop-target': dragOverPlotId === plot.id,
                'is-drop-before': dragOverPlotId === plot.id && plotDropPlacement === 'before',
                'is-drop-after': dragOverPlotId === plot.id && plotDropPlacement === 'after',
              }"
              type="button"
              :disabled="isSaving"
              :draggable="!isSaving && !isLoading"
              @click="inspectPlot(plot.id)"
              @dblclick="openPlot(plot.id)"
              @dragstart="startPlotDrag(plot.id)"
              @dragenter="hoverPlotDropTarget(plot.id, resolvePlotDropPlacement($event))"
              @dragover.prevent="hoverPlotDropTarget(plot.id, resolvePlotDropPlacement($event))"
              @drop.prevent="dropPlotOn(plot.id, resolvePlotDropPlacement($event))"
              @dragend="resetPlotDrag"
              @contextmenu="openContextMenu($event, { targetType: 'childPlot', plotId: plot.id })"
            >
              <span class="child-node-title">{{ plot.title || '未命名剧情' }}</span>
              <span class="child-node-summary">{{ plot.summary || '暂无简介' }}</span>
            </button>

            <n-empty v-if="currentPlot && !hasChildPlots" description="暂无直接子剧情" />
            <n-empty v-if="!currentPlot" description="请先创建或选择剧情块" />
          </div>

          <n-button block :disabled="!currentPlot || isSaving || isLoading" @click="createChildPlot()">
            新建子剧情
          </n-button>
        </aside>

        <section class="plot-content-panel" aria-label="当前剧情内容">
          <div v-if="inspectedPlot" class="plot-content">
            <!-- 右侧 Inspector 展示的剧情简介区域。 -->
            <div class="summary-block">
              <div class="summary-header">
                <n-input
                  :value="inspectedPlot.title"
                  placeholder="剧情块名称"
                  @update:value="updateCurrentPlotField('title', $event)"
                />
                <n-button type="error" :disabled="isSaving" @click="deletePlot(inspectedPlot.id)">
                  删除剧情块
                </n-button>
              </div>

              <n-input
                :value="inspectedPlot.summary"
                type="textarea"
                placeholder="剧情简介"
                :autosize="{ minRows: 3, maxRows: 6 }"
                @update:value="updateCurrentPlotField('summary', $event)"
              />
            </div>

            <div class="description-toolbar">
              <div class="panel-heading">
                <n-text strong>自定义说明</n-text>
                <n-text depth="3">{{ currentDescriptionBlocks.length }} 项</n-text>
              </div>
              <n-button size="small" :disabled="isSaving" @click="createDescriptionBlock()">
                新建说明卡片
              </n-button>
            </div>

            <!-- 自定义说明卡片列表。 -->
            <div class="description-card-list">
              <article
                v-for="description in currentDescriptionBlocks"
                :key="description.id"
                class="description-card"
                :class="{
                  'is-dragging': draggingDescriptionId === description.id,
                  'is-drop-target': dragOverDescriptionId === description.id,
                }"
                :draggable="!isSaving"
                @dragstart="startDescriptionDrag(description.id)"
                @dragenter="hoverDescriptionDropTarget(description.id)"
                @dragover.prevent="hoverDescriptionDropTarget(description.id)"
                @drop.prevent="dropDescriptionOn(description.id)"
                @dragend="resetDescriptionDrag"
                @contextmenu="openContextMenu($event, {
                  targetType: 'descriptionCard',
                  plotId: inspectedPlot.id,
                  descriptionId: description.id,
                })"
              >
                <div class="description-card-header">
                  <n-input
                    :value="description.title"
                    placeholder="说明名称"
                    @update:value="updateDescriptionBlock(description.id, { title: $event })"
                  />
                  <n-button
                    size="small"
                    quaternary
                    type="error"
                    :disabled="isSaving"
                    @click="deleteDescriptionBlock(description.id)"
                  >
                    删除
                  </n-button>
                </div>

                <n-input
                  :value="description.content"
                  type="textarea"
                  placeholder="说明内容"
                  :autosize="{ minRows: 4, maxRows: 8 }"
                  @update:value="updateDescriptionBlock(description.id, { content: $event })"
                />
              </article>

              <n-empty v-if="!hasDescriptionBlocks" description="暂无说明卡片，点击右上角新建" />
            </div>

          </div>

          <n-empty v-else description="从左侧选择剧情块，或新建一个剧情块" />
        </section>
      </section>
    </div>
  </section>
</template>

<style scoped>
/** 剧情库页面整体布局，保持桌面编辑器的信息密度。 */
.plot-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  color: #172033;
}

/** 页面顶部工具栏。 */
.plot-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

/** 标题组容器。 */
.plot-title-group {
  display: grid;
  gap: 4px;
  min-width: 0;
}

/** 页面标题。 */
.plot-title {
  margin: 0;
  color: #17212b;
  font-size: 22px;
  line-height: 1.25;
}

/** 页面说明文本。 */
.plot-subtitle {
  font-size: 12px;
  line-height: 1.4;
}

/** 页面状态消息区。 */
.plot-message-panel {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  background: #ffffff;
  border: 1px solid #d9e1ea;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.5;
}

/** 错误消息文本。 */
.plot-error-message {
  color: #9f3a2f;
}

/** 成功消息文本。 */
.plot-save-message {
  color: #1f6f43;
}

/** 面包屑导航区域。 */
.plot-breadcrumb {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 10px 14px;
  background: #ffffff;
  border: 1px solid #d9e1ea;
  border-radius: 8px;
}

/** 面包屑路径容器。 */
.breadcrumb-path {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  align-items: center;
  min-width: 0;
}

/** 面包屑按钮。 */
.breadcrumb-button {
  padding: 4px 8px;
  color: #24313d;
  background: #f8fafc;
  border: 1px solid #dce4ee;
  border-radius: 5px;
  cursor: pointer;
}

.breadcrumb-button:hover {
  background: #eef6ff;
  border-color: #7aa7d9;
}

/** 面包屑分隔符。 */
.breadcrumb-separator {
  color: #8a98a8;
}

/** 剧情库主工作区。 */
.plot-workspace {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 16px;
  flex: 1;
  min-height: 0;
}

/** 左侧一级剧情块面板。 */
.plot-root-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  min-height: 0;
  padding: 14px;
  background: #ffffff;
  border: 1px solid #d9e1ea;
  border-radius: 8px;
}

/** 面板标题行。 */
.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

/** 一级剧情块列表。 */
.root-block-list {
  display: grid;
  align-content: start;
  gap: 10px;
  min-height: 0;
  overflow: auto;
}

/** 一级剧情块按钮。 */
.root-block,
.child-node {
  display: grid;
  gap: 6px;
  width: 100%;
  padding: 12px;
  color: #24313d;
  text-align: left;
  background: #f8fafc;
  border: 1px solid #dce4ee;
  border-radius: 6px;
  cursor: pointer;
}

.root-block:hover,
.root-block.is-active,
.child-node.is-active,
.child-node:hover {
  background: #eef6ff;
  border-color: #7aa7d9;
}

.root-block.is-dragging,
.child-node.is-dragging {
  opacity: 0.52;
}

.root-block.is-drop-target,
.child-node.is-drop-target {
  background: #e5f1ff;
  border-color: #2f80ed;
}

.root-block.is-drop-before,
.child-node.is-drop-before {
  box-shadow: inset 0 3px 0 #2f80ed;
}

.root-block.is-drop-after,
.child-node.is-drop-after {
  box-shadow: inset 0 -3px 0 #2f80ed;
}

/** 一级剧情块标题。 */
.root-block-title,
.child-node-title {
  overflow: hidden;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/** 一级剧情块简介。 */
.root-block-summary,
.child-node-summary {
  display: -webkit-box;
  overflow: hidden;
  color: #687684;
  font-size: 12px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

/** 当前层工作区。 */
.plot-current-layer {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 16px;
  min-width: 0;
  min-height: 0;
  padding: 14px;
  background: #ffffff;
  border: 1px solid #d9e1ea;
  border-radius: 8px;
}

/** 直接子节点区域。 */
.child-node-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 12px;
  min-height: 0;
}

/** 直接子节点列表。 */
.child-node-list {
  display: grid;
  align-content: start;
  gap: 10px;
  min-height: 0;
  overflow: auto;
}

/** 当前剧情内容面板。 */
.plot-content-panel {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  border-left: 1px solid #e6edf5;
  padding-left: 16px;
}

/** 当前剧情内容布局。 */
.plot-content {
  display: grid;
  gap: 16px;
}

/** 剧情简介区域。 */
.summary-block {
  display: grid;
  gap: 10px;
}

/** 简介顶部操作行。 */
.summary-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

/** 说明卡片工具栏。 */
.description-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/** 说明卡片列表。 */
.description-card-list {
  display: grid;
  gap: 12px;
}

/** 单张说明卡片。 */
.description-card {
  display: grid;
  gap: 10px;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #dce4ee;
  border-radius: 6px;
  cursor: grab;
}

.description-card.is-dragging {
  opacity: 0.52;
}

.description-card.is-drop-target {
  background: #e5f1ff;
  border-color: #2f80ed;
}

/** 说明卡片顶部。 */
.description-card-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}
</style>
