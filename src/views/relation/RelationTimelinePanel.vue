<script setup lang="ts">
/**
 * 关系图谱右侧时间轴面板。
 * 负责展示当前关系状态、历史记录，并提供关系和历史记录操作入口。
 */
import type { RelationGraphEdge, RelationGraphNode, RelationHistoryRecord } from '@/types';
import type { RelationSelectionMode } from '@/views/relation/useRelationGraphEditor';

const props = defineProps<{
  /** 当前右侧面板选择模式。 */
  selectionMode: RelationSelectionMode;
  /** 当前选中的关系。 */
  selectedEdge: RelationGraphEdge | null;
  /** 当前选中的块。 */
  selectedNode: RelationGraphNode | null;
  /** 当前关系的历史记录。 */
  selectedEdgeHistory: RelationHistoryRecord[];
  /** 是否正在保存。 */
  isSaving: boolean;
  /** 根据 ID 取得关系起点块。 */
  getEdgeFromNode: (edge: RelationGraphEdge) => RelationGraphNode | null;
  /** 根据 ID 取得关系终点块。 */
  getEdgeToNode: (edge: RelationGraphEdge) => RelationGraphNode | null;
  /** 格式化关系强度。 */
  formatScore: (score?: number) => string;
}>();

const emit = defineEmits<{
  /** 打开编辑关系弹窗。 */
  editEdge: [];
  /** 删除当前关系。 */
  deleteEdge: [];
  /** 打开新增历史记录弹窗。 */
  createHistory: [];
  /** 打开编辑历史记录弹窗。 */
  editHistory: [record: RelationHistoryRecord];
  /** 删除历史记录。 */
  deleteHistory: [recordId: string];
}>();
</script>

<template>
  <aside class="timeline-panel" aria-label="关系时间轴">
    <div class="panel-header">
      <div>
        <h3 class="panel-title">关系时间轴</h3>
        <n-text depth="3" class="panel-meta">
          当前状态与历史变化分开维护
        </n-text>
      </div>
    </div>

    <div v-if="props.selectionMode === 'edge' && props.selectedEdge" class="timeline-content">
      <section class="relation-current">
        <div class="section-header">
          <h4>{{ props.selectedEdge.current.type }}</h4>
        </div>

        <dl class="current-fields">
          <div>
            <dt>关系两端</dt>
            <dd>{{ props.getEdgeFromNode(props.selectedEdge)?.label }} -> {{ props.getEdgeToNode(props.selectedEdge)?.label }}</dd>
          </div>
          <div>
            <dt>关系强度</dt>
            <dd>{{ props.formatScore(props.selectedEdge.current.score) }}</dd>
          </div>
          <div>
            <dt>当前原因</dt>
            <dd>{{ props.selectedEdge.current.reason || '未填写' }}</dd>
          </div>
        </dl>

        <div class="timeline-actions">
          <n-button size="small" :disabled="props.isSaving" @click="emit('editEdge')">
            编辑关系
          </n-button>
          <n-button size="small" type="error" :disabled="props.isSaving" @click="emit('deleteEdge')">
            删除关系
          </n-button>
        </div>
      </section>

      <section class="history-section">
        <div class="section-header">
          <h4>关系变化记录</h4>
        </div>

        <div class="history-create-bar">
          <n-button size="small" type="primary" :disabled="props.isSaving" @click="emit('createHistory')">
            新增记录
          </n-button>
        </div>

        <n-empty v-if="props.selectedEdgeHistory.length === 0" description="暂无变化记录，可点击上方新增" />

        <ol v-else class="history-list">
          <li v-for="record in props.selectedEdgeHistory" :key="record.id" class="history-item">
            <span class="history-dot" aria-hidden="true"></span>
            <div class="history-card">
              <div class="history-heading">
                <strong>{{ record.label }}</strong>
                <span>{{ record.type }} / {{ props.formatScore(record.score) }}</span>
              </div>
              <p>{{ record.reason }}</p>
              <div class="history-actions">
                <n-button size="tiny" :disabled="props.isSaving" @click="emit('editHistory', record)">
                  编辑
                </n-button>
                <n-button
                  size="tiny"
                  type="error"
                  :disabled="props.isSaving"
                  @click="emit('deleteHistory', record.id)"
                >
                  删除
                </n-button>
              </div>
            </div>
          </li>
        </ol>
      </section>
    </div>

    <div v-else-if="props.selectionMode === 'node' && props.selectedNode" class="empty-inspector">
      <h4>{{ props.selectedNode.label }}</h4>
      <p>已选中块。点击中间画布中的关系线，可查看当前关系状态和变化记录。</p>
      <n-tag size="small">
        {{ props.selectedNode.kind === 'entity-ref' ? '实体引用节点' : '自定义图谱块' }}
      </n-tag>
    </div>

    <n-empty v-else description="请选择一条关系线查看时间轴" />
  </aside>
</template>

<style scoped>
/** 右侧关系时间轴面板。 */
.timeline-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  min-height: 0;
  padding: 14px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #d9e1ea;
  border-radius: 8px;
}

/** 面板标题栏。 */
.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

/** 面板标题。 */
.panel-title {
  color: #1d2936;
  font-size: 15px;
  line-height: 1.3;
}

/** 面板辅助信息。 */
.panel-meta {
  font-size: 12px;
  line-height: 1.35;
}

/** 右侧时间轴内容滚动区。 */
.timeline-content {
  display: grid;
  gap: 14px;
  min-height: 0;
  overflow: auto;
}

/** 当前关系面板。 */
.relation-current {
  display: grid;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e0e7ef;
  border-radius: 8px;
}

/** 区块标题栏。 */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.section-header h4 {
  color: #1d2936;
  font-size: 14px;
  line-height: 1.3;
}

/** 当前关系字段列表。 */
.current-fields {
  display: grid;
  gap: 10px;
  margin: 0;
}

.current-fields div {
  display: grid;
  gap: 4px;
}

.current-fields dt {
  color: #6c7987;
  font-size: 12px;
  line-height: 1.3;
}

.current-fields dd {
  margin: 0;
  color: #23303d;
  font-size: 13px;
  line-height: 1.55;
  word-break: break-word;
}

/** 当前关系操作区。 */
.timeline-actions {
  display: flex;
  gap: 8px;
}

/** 历史记录区。 */
.history-section {
  display: grid;
  gap: 12px;
}

/** 时间轴新增入口，固定放在记录列表上方。 */
.history-create-bar {
  display: flex;
  justify-content: flex-end;
  padding: 8px 10px;
  background: #f8fafc;
  border: 1px dashed #cbd8e6;
  border-radius: 8px;
}

/** 关系历史时间轴。 */
.history-list {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

/** 单条历史记录。 */
.history-item {
  position: relative;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 10px;
  padding-bottom: 12px;
}

.history-item::before {
  position: absolute;
  top: 17px;
  bottom: -2px;
  left: 6px;
  width: 2px;
  content: '';
  background: #d6e0eb;
}

.history-item:last-child::before {
  display: none;
}

/** 时间轴节点。 */
.history-dot {
  z-index: 1;
  width: 14px;
  height: 14px;
  margin-top: 4px;
  background: #ffffff;
  border: 3px solid #2f80ed;
  border-radius: 999px;
}

/** 历史记录内容框。 */
.history-card {
  display: grid;
  gap: 7px;
  padding: 10px 11px;
  background: #ffffff;
  border: 1px solid #dce4ee;
  border-radius: 8px;
}

/** 历史记录标题行。 */
.history-heading {
  display: grid;
  gap: 3px;
}

.history-heading strong {
  color: #1e2a36;
  font-size: 13px;
  line-height: 1.35;
}

.history-heading span {
  color: #697789;
  font-size: 12px;
  line-height: 1.35;
}

.history-card p {
  color: #344456;
  font-size: 12px;
  line-height: 1.55;
}

/** 历史记录编辑按钮组。 */
.history-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

/** 选中节点但未选中关系时的提示。 */
.empty-inspector {
  display: grid;
  align-content: start;
  gap: 10px;
  min-height: 0;
  padding: 12px;
  overflow: auto;
  background: #f8fafc;
  border: 1px solid #e0e7ef;
  border-radius: 8px;
}

.empty-inspector h4 {
  color: #1d2936;
  font-size: 16px;
  line-height: 1.35;
}

.empty-inspector p {
  color: #5e6d7e;
  font-size: 13px;
  line-height: 1.6;
}
</style>
