<script setup lang="ts">
/**
 * 人物模块列表视图。
 * 使用 Naive UI 的 NCard、NButton、NSpace、NText、NGrid 等组件，
 * 组装人物卡片列表、新建弹框、详情弹框和编辑弹框。
 */
import mockCharacters from '../../mock_data/characters.json';
import CharacterCard from '@/views/character/CharacterCard.vue';
import CharacterDetailModal from '@/views/character/CharacterDetailModal.vue';
import CharacterFormModal from '@/views/character/CharacterFormModal.vue';
import { useCharacterList } from '@/views/character/useCharacterList';

const {
  characters,
  characterCount,
  selectedCharacter,
  editingCharacter,
  isCreateModalOpen,
  isEditModalOpen,
  openDetail,
  closeDetail,
  openCreate,
  closeCreate,
  openEdit,
  closeEdit,
  deleteCharacter,
  createCharacter,
  updateCharacter,
} = useCharacterList(mockCharacters);
</script>

<template>
  <n-card title="人物管理" :bordered="true" content-style="padding: 22px">
    <!-- 顶部工具栏：新建按钮 + 统计信息 -->
    <template #header-extra>
      <n-space align="center">
        <n-text depth="3" style="font-size: 14px">
          共 {{ characterCount }} 个人物
        </n-text>
        <n-button type="primary" size="medium" @click="openCreate">
          新建人物
        </n-button>
      </n-space>
    </template>

    <!-- 人物卡片网格：有数据时展示自适应网格，无数据时展示空状态 -->
    <!-- 使用原生 CSS Grid + auto-fill，根据容器宽度自动排列多列，每列最小 214px -->
    <div
      v-if="characters.length > 0"
      class="character-grid"
      aria-label="人物列表"
    >
      <CharacterCard
        v-for="character in characters"
        :key="character.id"
        :character="character"
        @detail="openDetail"
        @edit="openEdit"
        @delete="deleteCharacter"
      />
    </div>

    <!-- 空状态：暂无人物数据时展示 -->
    <n-empty v-else description="暂无人物，点击右上角「新建人物」开始创建" />

    <!-- 详情弹框 -->
    <CharacterDetailModal
      :open="selectedCharacter !== null"
      :character="selectedCharacter"
      @close="closeDetail"
    />

    <!-- 新建弹框 -->
    <CharacterFormModal
      :open="isCreateModalOpen"
      mode="create"
      @close="closeCreate"
      @submit="createCharacter"
    />

    <!-- 编辑弹框 -->
    <CharacterFormModal
      :open="isEditModalOpen"
      mode="edit"
      :character="editingCharacter"
      @close="closeEdit"
      @submit="editingCharacter && updateCharacter(editingCharacter.id, $event)"
    />
  </n-card>
</template>

<style scoped>
/**
 * 人物卡片自适应网格布局。
 * 使用 CSS Grid 的 auto-fill + minmax 实现：
 * - 每列最小宽度 214px，最大占满可用空间
 * - 列与列间距 36px，行与行间距 28px
 * - 容器越宽，自动排列的列数越多；容器变窄时自动换行
 */
.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(214px, 1fr));
  gap: 28px 36px;
  align-items: start;
}

/**
 * 确保每个 CharacterCard 内部的 NCard 占满网格单元宽度。
 * 由于 Naive UI 的 NCard 默认宽度为 auto，这里显式设置为 100%。
 */
.character-grid > :deep(.n-card) {
  width: 100%;
}
</style>
