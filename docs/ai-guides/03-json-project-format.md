# JSON 项目格式

## 原则

不要把整部小说全部存进一个 `data.json`。应该使用多个小 JSON 文件，这样项目在写了几年以后仍然便于阅读、对比和维护。

JSON schema 只固定系统运行需要的最小字段。小说设定本身必须开放，作者可以为人物、物品、地点等实体自由增加属性。

实现时不要把人物、物品、地点做成固定字段表单。读取 JSON 后必须保留未知字段，不能因为当前版本 UI 不认识某个字段就删除它。

## 推荐的小说项目结构

```text
novel-project/
  novel.json
  characters/
    char_001.json
    char_002.json
  items/
    item_001.json
  locations/
    location_001.json
  factions/
    faction_001.json
  relations/
    relations.json
  events/
    event_001.json
  timeline/
    timeline.json
  world/
    world-state.json
  chapters/
    chapter001.json
```

## `novel.json`

```json
{
  "id": "novel_001",
  "title": "大乾风云",
  "author": "",
  "genre": "historical-fantasy",
  "currentChapter": 50,
  "createdAt": "2026-08-07T00:00:00.000Z",
  "updatedAt": "2026-08-07T00:00:00.000Z",
  "schemaVersion": 1
}
```

## 人物文件

人物固定字段保持极简，只保留：

- `id`：系统稳定 ID，用于关系、事件、时间线引用。
- `name`：人物名称。
- `age`：年龄，可用数字、字符串或 `null`。
- `traits`：性格标签数组。
- `appearance`：外貌描述。
- `customFields`：作者自定义字段，其他人物设定全部放这里。
- `schemaVersion`：结构版本。

示例：

```json
{
  "id": "char_linchen",
  "name": "林辰",
  "age": 18,
  "traits": ["谨慎", "野心", "重情"],
  "appearance": "身形清瘦，左肩有旧伤，常穿青色官袍",
  "customFields": {
    "身体情况": {
      "左肩旧伤": "雨天会疼",
      "体力": "中等"
    },
    "武学": [
      {
        "名称": "青云剑法",
        "境界": "小成",
        "来源": "第20章青云山夺剑"
      },
      {
        "名称": "轻身术",
        "境界": "入门"
      }
    ],
    "官职履历": [
      {
        "章节": 1,
        "官职": "七品县令"
      },
      {
        "章节": 50,
        "官职": "五品知府"
      }
    ],
    "秘密": "真实身份是穿越者"
  },
  "schemaVersion": 1
}
```

## `customFields` 规则

- 字段名由作者输入，可以是中文。
- 字段值允许字符串、数字、布尔值、`null`、对象、数组。
- 可以出现 `{ "武学": [{}, {}] }` 这类结构。
- UI 应提供“新增自定义字段”，不要把设定字段写死。
- 搜索和 AI 上下文导出必须能读取 `customFields`。
- 保存人物文件时必须保留未知字段。

## 关系文件

```json
[
  {
    "id": "rel_linchen_zhaoxiang",
    "from": "char_linchen",
    "to": "char_zhaoxiang",
    "type": "enemy",
    "score": 80,
    "reason": "第20章盐税事件",
    "history": [
      {
        "chapter": 20,
        "change": "成为敌人",
        "scoreDelta": 80
      }
    ]
  }
]
```

关系也可以根据需要增加自定义字段，例如“公开关系”和“真实关系”不同。

## 事件文件

```json
{
  "id": "event_qingyun_sword",
  "title": "青云山夺剑",
  "chapter": 20,
  "participants": ["char_linchen", "char_suqin"],
  "locations": ["location_qingyun_mountain"],
  "result": ["获得青云剑"],
  "impact": [
    {
      "target": "char_suqin",
      "kind": "relation",
      "change": "hate+20"
    }
  ],
  "schemaVersion": 1
}
```

事件的 `impact` 不应只支持固定几种类型。后续应允许 AI 或作者描述对人物自定义字段、关系、物品归属、地点状态等多种影响。

## 世界状态

```json
{
  "currentChapter": 50,
  "politicalState": [],
  "activeConflicts": [],
  "openPlotThreads": [],
  "globalFacts": [],
  "schemaVersion": 1
}
```

世界状态也应允许扩展字段，例如“天灾状态”“战争状态”“灵气浓度”“朝堂派系格局”等。

## ID 规则

- 引用其他实体时使用稳定 ID，不要使用显示名称。
- 显示名称应该可以修改，且不破坏关系和事件引用。
- 如果可读性允许，优先使用 `char_linchen` 这类可读 ID。
- 章节序号用数字保存。

## 迁移规则

任何持久化 schema 变更都必须包含：

- 更新后的 `schemaVersion`
- 迁移说明
- 向后兼容的加载器，或明确的迁移函数

迁移时不要删除用户自定义字段；不能因为字段不在当前 TypeScript 类型里，就在保存时丢弃它。