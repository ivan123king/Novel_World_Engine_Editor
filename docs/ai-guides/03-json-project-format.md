# JSON 项目格式

## 原则

不要把整部小说全部存进一个 `data.json`。应该使用多个小 JSON 文件，这样项目在写了几年以后仍然便于阅读、对比和维护。

JSON schema 只应该固定系统运行所需的最小字段，例如 `id`、`name`、`schemaVersion` 和跨文件引用字段。小说设定本身必须开放，作者应该可以为人物、物品、地点等实体自由增加属性，例如“身体情况”“灵根”“官职履历”“心理阴影”“秘密身份”等。

实现时不要把人物、物品、地点做成固定字段表单。应支持动态属性编辑，并且读取 JSON 后必须保留未知字段，不能因为当前版本 UI 不认识某个字段就把它删除。

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

人物文件不要理解为下面这些字段的全集。下面只是建议的基础结构。

系统字段：

- `id`：稳定 ID，用于关系、事件、章节引用。
- `name`：显示名称。
- `schemaVersion`：结构版本。

建议字段：

- `identity`：身份或定位。
- `age`：年龄。
- `traits`：性格标签。
- `status`：当前状态。这里也应允许扩展，不限于地点、职位、财富。
- `customFields`：作者自定义属性。key 由作者输入，不要在代码中写死白名单。
- `history`：历史变化记录。
- `notes`：备注。

示例：

```json
{
  "id": "char_linchen",
  "name": "林辰",
  "identity": "穿越者",
  "age": 18,
  "traits": ["谨慎", "野心", "重情"],
  "status": {
    "location": "location_capital",
    "position": "七品县令",
    "wealth": "1000两",
    "bodyCondition": "左肩旧伤未愈"
  },
  "customFields": {
    "身体情况": "左肩旧伤未愈，雨天会疼",
    "武学境界": "三品",
    "秘密": "真实来历不能公开",
    "心理状态": "对朝堂权斗保持高度戒备"
  },
  "history": [
    {
      "chapter": 20,
      "eventId": "event_qingyun_sword",
      "summary": "获得青云剑"
    }
  ],
  "notes": "",
  "schemaVersion": 1
}
```

## 动态属性规则

- 作者可以自由新增、重命名、删除 `customFields` 中的字段。
- `customFields` 的 key 可以是中文，例如“身体情况”“修为”“阵营立场”。
- `customFields` 的 value 可以先支持字符串、数字、布尔值、数组和普通对象。
- UI 应提供“新增属性”能力，而不是只提供固定字段。
- 保存时必须保留当前版本不认识的字段。
- 搜索和 AI 上下文导出应能读取自定义字段。
- 如果后续需要字段类型、排序、分组，可以增加 `fieldMeta`，不要破坏已有 `customFields`。

可选的字段元信息示例：

```json
{
  "customFields": {
    "身体情况": "左肩旧伤未愈",
    "武学境界": "三品"
  },
  "fieldMeta": {
    "身体情况": {
      "type": "text",
      "group": "身体",
      "order": 10
    },
    "武学境界": {
      "type": "text",
      "group": "能力",
      "order": 20
    }
  }
}
```

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

事件的 `impact` 不应只支持固定几种类型。后续应允许 AI 或作者描述对人物状态、自定义字段、关系、物品归属、地点状态等多种影响。

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

迁移时要特别注意：不要删除用户自定义字段；不能因为字段不在当前 TypeScript 类型里，就在保存时丢弃它。
