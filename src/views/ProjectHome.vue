<script setup lang="ts">
/**
 * 项目首页视图。
 * 使用 Naive UI 的 NCard、NGrid、NText 等组件，
 * 提供友好的仪表盘式入口，当前阶段作为主工作台右侧的欢迎页面。
 */
import mockNovel from '../../mock_data/novel.json';
import mockCharacters from '../../mock_data/characters.json';
import mockEvents from '../../mock_data/events.json';
import mockLocations from '../../mock_data/locations.json';
import mockItems from '../../mock_data/items.json';
</script>

<template>
  <div style="display: grid; gap: 20px">
    <!-- 欢迎卡片：展示项目基本信息 -->
    <n-card :title="`欢迎使用 ${mockNovel.title}`" :bordered="true">
      <n-text style="font-size: 15px; line-height: 1.7">
        这里是你的小说世界编辑器。你可以在左侧导航栏中选择不同的模块来管理你的世界观要素。
        <br />
        所有数据都会以 JSON 格式保存在你的本地项目目录中，确保数据的可携带性和可版本管理。
      </n-text>
    </n-card>

    <!-- 数据概览：各模块统计卡片 -->
    <n-grid :cols="2" :x-gap="20" :y-gap="20" responsive="screen" item-responsive>
      <n-grid-item>
        <n-card hoverable size="small" title="人物统计" :bordered="true">
          <div style="display: flex; align-items: baseline; gap: 10px">
            <n-tag type="info" size="large" round>
              <n-text strong style="font-size: 24px">
                {{ mockCharacters.length }}
              </n-text>
            </n-tag>
            <n-text depth="2">
              个人物已创建
            </n-text>
          </div>
        </n-card>
      </n-grid-item>

      <n-grid-item>
        <n-card hoverable size="small" title="剧情事件" :bordered="true">
          <div style="display: flex; align-items: baseline; gap: 10px">
            <n-tag type="success" size="large" round>
              <n-text strong style="font-size: 24px">
                {{ mockEvents.length }}
              </n-text>
            </n-tag>
            <n-text depth="2">
              个剧情事件
            </n-text>
          </div>
        </n-card>
      </n-grid-item>

      <n-grid-item>
        <n-card hoverable size="small" title="地点场景" :bordered="true">
          <div style="display: flex; align-items: baseline; gap: 10px">
            <n-tag type="warning" size="large" round>
              <n-text strong style="font-size: 24px">
                {{ mockLocations.length }}
              </n-text>
            </n-tag>
            <n-text depth="2">
              个地点场景
            </n-text>
          </div>
        </n-card>
      </n-grid-item>

      <n-grid-item>
        <n-card hoverable size="small" title="物品道具" :bordered="true">
          <div style="display: flex; align-items: baseline; gap: 10px">
            <n-tag type="error" size="large" round>
              <n-text strong style="font-size: 24px">
                {{ mockItems.length }}
              </n-text>
            </n-tag>
            <n-text depth="2">
              件物品道具
            </n-text>
          </div>
        </n-card>
      </n-grid-item>
    </n-grid>
  </div>
</template>
