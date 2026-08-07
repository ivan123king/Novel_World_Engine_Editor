<script setup lang="ts">
/**
 * 人物模块列表视图。
 * 负责组装人物卡片列表、新建弹框、详情弹框和编辑弹框。
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
  <section class="module-page character-page">
    <header class="character-toolbar">
      <button class="create-button" type="button" @click="openCreate">新建</button>
      <span class="character-count">{{ characterCount }} 个人物</span>
    </header>

    <div v-if="characters.length > 0" class="character-grid" aria-label="人物列表">
      <CharacterCard
        v-for="character in characters"
        :key="character.id"
        :character="character"
        @detail="openDetail"
        @edit="openEdit"
        @delete="deleteCharacter"
      />
    </div>

    <div v-else class="empty-state">暂无人物</div>

    <CharacterDetailModal
      :open="selectedCharacter !== null"
      :character="selectedCharacter"
      @close="closeDetail"
    />

    <CharacterFormModal
      :open="isCreateModalOpen"
      mode="create"
      @close="closeCreate"
      @submit="createCharacter"
    />

    <CharacterFormModal
      :open="isEditModalOpen"
      mode="edit"
      :character="editingCharacter"
      @close="closeEdit"
      @submit="editingCharacter && updateCharacter(editingCharacter.id, $event)"
    />
  </section>
</template>

<style scoped>
.character-page {
  display: grid;
  align-content: start;
  gap: 34px;
}

.character-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
}

.create-button {
  min-width: 150px;
  border: 2px solid #222b35;
  border-radius: 0;
  background: #ffffff;
  color: #27313c;
  cursor: pointer;
  padding: 12px 22px;
}

.create-button:hover {
  background: #edf3f8;
}

.character-count {
  color: #607080;
  font-size: 14px;
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(214px, 214px));
  gap: 28px 36px;
  align-items: start;
}

.empty-state {
  display: grid;
  min-height: 220px;
  place-items: center;
  border: 1px dashed #bfccd8;
  border-radius: 8px;
  color: #607080;
}
</style>
