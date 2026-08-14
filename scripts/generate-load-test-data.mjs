import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * 小说项目压测数据生成脚本。
 * 按当前 Electron/Vue 应用已实现的 JSON schema，向用户选择的小说项目目录写入大批量测试数据。
 */

const projectDir = resolve(process.argv[2] ?? 'E:/tmp/我的第二本');
const batch = 'loadtest_20260814';
const now = new Date().toISOString();

if (!existsSync(join(projectDir, 'novel.json'))) {
  throw new Error(`目标目录不是有效小说项目，未找到 novel.json：${projectDir}`);
}

/** 确保目录存在。 */
function ensureDir(...segments) {
  const dir = join(projectDir, ...segments);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** 将对象保存为易读的 UTF-8 JSON。 */
function saveJson(...args) {
  const value = args.pop();
  const filePath = join(projectDir, ...args);
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

/** 读取 JSON 文件，缺失或损坏时返回 fallback。 */
function readJsonOrFallback(pathSegments, fallback) {
  const filePath = join(projectDir, ...pathSegments);

  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

/** 生成不重复且保持原顺序的 ID 列表。 */
function uniqueIds(ids) {
  const seen = new Set();
  const result = [];

  for (const id of ids) {
    if (typeof id !== 'string' || id.length === 0 || seen.has(id)) {
      continue;
    }

    seen.add(id);
    result.push(id);
  }

  return result;
}

/** 构造确定性的伪随机数，保证每次生成结果稳定。 */
function createRandom(seed) {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/** 从数组中按确定性随机取一项。 */
function pick(values, random) {
  return values[Math.floor(random() * values.length) % values.length];
}

/** 读取当前项目人物，优先使用人物列表排序文件中的顺序。 */
function loadCharactersInOrder() {
  const characterDir = ensureDir('characters');
  const files = readdirSync(characterDir).filter((name) => name.endsWith('.json'));
  const characters = files.map((fileName) => readJsonOrFallback(['characters', fileName], null)).filter(Boolean);
  const byId = new Map(characters.map((character) => [character.id, character]));
  const order = readJsonOrFallback(['list-orders', 'characters.json'], { ids: [] });
  const ordered = [];
  const used = new Set();

  for (const id of order.ids ?? []) {
    const character = byId.get(id);

    if (character) {
      ordered.push(character);
      used.add(id);
    }
  }

  for (const character of characters) {
    if (!used.has(character.id)) {
      ordered.push(character);
    }
  }

  return ordered;
}

/** 生成 200 个人物测试文件和人物排序。 */
function generateCharacters() {
  ensureDir('characters');
  ensureDir('list-orders');

  const surnames = ['沈', '林', '顾', '陆', '苏', '叶', '秦', '谢', '楚', '傅', '姜', '许', '温', '韩', '赵', '萧', '白', '周', '唐', '宋'];
  const givenNames = ['云舟', '清衡', '知夏', '怀瑾', '明棠', '星阑', '若澜', '景行', '青辞', '照影', '远岚', '南枝', '听雪', '映微', '长风', '砚秋', '疏桐', '承曜', '兰因', '归鸿'];
  const roles = ['游侠', '医者', '书院弟子', '盐商管事', '边军斥候', '皇城暗探', '机关师', '账房先生', '镖师', '县衙捕快', '织坊掌柜', '水师校尉', '茶馆说书人', '药铺学徒', '铸剑匠', '驿站信使', '画舫琴师', '山寨谋士', '宗门外门弟子', '商队护卫'];
  const factions = ['青岚盟', '赤鸢卫', '镜湖书院', '玄都司', '北境军', '南市商会', '白塔寺', '浮梁水帮', '无所属', '暗线组织'];
  const traitsPool = ['谨慎', '果断', '重情', '多疑', '沉稳', '好奇', '急躁', '守信', '圆滑', '冷静', '倔强', '温和', '野心', '幽默', '敏锐', '寡言'];
  const appearances = [
    '眉目清朗，常穿素色短袍，腰间挂旧铜牌',
    '身形高瘦，左手有薄茧，说话时很少直视他人',
    '眼神明亮，衣袖总带药草气味，步伐轻快',
    '肤色偏深，肩背挺直，佩一柄无鞘短刀',
    '常戴灰色斗笠，衣摆磨损，靴底沾着远路尘土',
    '衣着整洁，袖中藏账册，笑意克制',
    '发间束银簪，声音温和，右眉有浅痣',
    '披深色外袍，行动安静，习惯站在门侧',
  ];
  const ids = [];

  for (let index = 1; index <= 200; index += 1) {
    const id = `char_${batch}_${String(index).padStart(3, '0')}`;
    const chapter = 1 + ((index * 3) % 80);
    const customFields = {
      身份: {
        阵营: factions[(index * 3) % factions.length],
        职业: roles[(index * 5) % roles.length],
        公开身份: `${factions[(index * 3) % factions.length]} 的${roles[(index * 5) % roles.length]}`,
        可信度: (index * 11) % 100,
      },
      当前状态: {
        所在地点: `location_${batch}_world_${String((index % 50) + 1).padStart(3, '0')}`,
        登场章节: chapter,
        活跃: index % 7 !== 0,
        最近变化: `第 ${chapter} 章后进入测试人物池，供列表滚动和 Inspector 展示压测。`,
      },
      能力: [
        {
          名称: ['剑术', '医术', '潜行', '算学', '机关', '谈判'][index % 6],
          等级: ['入门', '熟练', '精通', '小成', '大成'][index % 5],
          来源: `测试生成-${index}`,
        },
        {
          名称: ['骑术', '水性', '追踪', '鉴宝', '阵法', '情报'][(index + 2) % 6],
          等级: ['入门', '熟练', '精通', '小成', '大成'][(index + 2) % 5],
          来源: `支线记录-${chapter}`,
        },
      ],
      关系线索: {
        盟友: index > 1 ? `char_${batch}_${String(index - 1).padStart(3, '0')}` : '',
        潜在冲突: index < 200 ? `char_${batch}_${String(index + 1).padStart(3, '0')}` : '',
        备注: '用于测试人物列表、搜索、自定义字段渲染和大批量 JSON 读取性能。',
      },
      测试批次: batch,
    };

    ids.push(id);
    saveJson('characters', `${id}.json`, {
      id,
      name: `${surnames[(index - 1) % surnames.length]}${givenNames[((index - 1) * 7) % givenNames.length]}${String(index).padStart(3, '0')}`,
      age: 16 + (index % 43),
      traits: [
        traitsPool[index % traitsPool.length],
        traitsPool[(index + 5) % traitsPool.length],
        traitsPool[(index + 9) % traitsPool.length],
      ],
      appearance: appearances[index % appearances.length],
      customFields,
      customFieldOrder: Object.keys(customFields),
      schemaVersion: 1,
    });
  }

  const previousOrder = readJsonOrFallback(['list-orders', 'characters.json'], { ids: [] });
  saveJson('list-orders', 'characters.json', {
    entityType: 'characters',
    ids: uniqueIds([...(previousOrder.ids ?? []), ...ids]),
    schemaVersion: 1,
  });

  return ids.length;
}

/** 生成 200 个物品测试文件和物品排序。 */
function generateItems() {
  ensureDir('items');
  ensureDir('list-orders');

  const categories = ['武器', '药材', '密信', '法器', '账册', '令牌', '地图', '机关零件'];
  const states = ['完好', '破损', '封印中', '待鉴定', '正在流通', '遗失传闻'];
  const owners = loadCharactersInOrder().map((character) => character.id);
  const ids = [];

  for (let index = 1; index <= 200; index += 1) {
    const id = `item_${batch}_${String(index).padStart(3, '0')}`;
    ids.push(id);
    saveJson('items', `${id}.json`, {
      id,
      name: `压测物品${String(index).padStart(3, '0')}`,
      customFields: {
        类型: categories[index % categories.length],
        当前状态: states[index % states.length],
        当前持有人: owners.length > 0 ? owners[(index * 7) % owners.length] : '',
        所在地点: `location_${batch}_world_${String((index % 50) + 1).padStart(3, '0')}`,
        稀有度: ['普通', '少见', '稀有', '传说'][index % 4],
        来历: {
          登场章节: (index % 120) + 1,
          线索: `用于物品列表、搜索和 Inspector 自定义字段压测-${index}`,
        },
        测试批次: batch,
      },
      schemaVersion: 1,
    });
  }

  const previousOrder = readJsonOrFallback(['list-orders', 'items.json'], { ids: [] });
  saveJson('list-orders', 'items.json', {
    entityType: 'items',
    ids: uniqueIds([...(previousOrder.ids ?? []), ...ids]),
    schemaVersion: 1,
  });

  return ids.length;
}

/** 生成地点实体。 */
function createLocation(id, name, type, parentLocationId, description, customFields) {
  saveJson('locations', `${id}.json`, {
    id,
    name,
    type,
    parentLocationId,
    description,
    customFields,
    customFieldOrder: Object.keys(customFields),
    schemaVersion: 1,
  });
}

/** 生成一张主地图、50 个主点位、25 张子地图和每张子地图 20 个点位。 */
function generateMaps() {
  ensureDir('locations');
  ensureDir('maps');

  const rootLocationId = `location_${batch}_world_root`;
  const rootMapId = `map_${batch}_world`;
  const colors = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2'];
  const icons = ['city', 'mountain', 'building', 'forest', 'water', 'gate'];
  const rootPins = [];

  createLocation(rootLocationId, '压测世界地图根地点', '世界', null, '压测地图的顶层范围。', {
    用途: '承载 50 个主地图点位和 25 个子地图入口。',
    测试批次: batch,
  });

  for (let index = 1; index <= 50; index += 1) {
    const locationId = `location_${batch}_world_${String(index).padStart(3, '0')}`;
    const hasChildMap = index <= 25;

    createLocation(locationId, `主地图点位${String(index).padStart(3, '0')}`, hasChildMap ? '区域入口' : '地点', rootLocationId, `主地图上的第 ${index} 个压测点位。`, {
      资源: ['矿脉', '港口', '书院', '关隘', '集市'][index % 5],
      治安: ['稳定', '紧张', '混乱'][index % 3],
      子地图入口: hasChildMap,
      测试批次: batch,
    });

    rootPins.push({
      id: `pin_${batch}_world_${String(index).padStart(3, '0')}`,
      locationId,
      x: 120 + ((index - 1) % 10) * 105,
      y: 100 + Math.floor((index - 1) / 10) * 92,
      color: colors[index % colors.length],
      icon: hasChildMap ? 'map' : icons[index % icons.length],
      showLabel: true,
    });

    if (hasChildMap) {
      const childMapId = `map_${batch}_child_${String(index).padStart(3, '0')}`;
      const childPins = [];

      for (let childIndex = 1; childIndex <= 20; childIndex += 1) {
        const childLocationId = `location_${batch}_child_${String(index).padStart(3, '0')}_${String(childIndex).padStart(3, '0')}`;

        createLocation(childLocationId, `子地图${String(index).padStart(2, '0')}点位${String(childIndex).padStart(2, '0')}`, '子地点', locationId, `第 ${index} 张子地图中的第 ${childIndex} 个点位。`, {
          风土: ['临水而居', '山路险峻', '商旅密集', '戒备森严'][childIndex % 4],
          可见度: ['公开', '隐秘', '传闻'][childIndex % 3],
          测试批次: batch,
        });

        childPins.push({
          id: `pin_${batch}_child_${String(index).padStart(3, '0')}_${String(childIndex).padStart(3, '0')}`,
          locationId: childLocationId,
          x: 95 + ((childIndex - 1) % 5) * 150,
          y: 90 + Math.floor((childIndex - 1) / 5) * 115,
          color: colors[(index + childIndex) % colors.length],
          icon: icons[childIndex % icons.length],
          showLabel: true,
        });
      }

      saveJson('maps', `${childMapId}.json`, {
        id: childMapId,
        name: `压测子地图${String(index).padStart(2, '0')}`,
        rootLocationId: locationId,
        parentMapId: rootMapId,
        parentLocationId: locationId,
        background: null,
        viewport: { x: 0, y: 0, scale: 1 },
        pins: childPins,
        schemaVersion: 1,
      });
    }
  }

  saveJson('maps', `${rootMapId}.json`, {
    id: rootMapId,
    name: '压测主地图',
    rootLocationId,
    parentMapId: null,
    parentLocationId: null,
    background: null,
    viewport: { x: 0, y: 0, scale: 1 },
    pins: rootPins,
    schemaVersion: 1,
  });

  return {
    locations: 1 + 50 + 25 * 20,
    maps: 1 + 25,
  };
}

/** 生成剧情说明卡片，避免剧情文件只有空节点。 */
function createDescriptionBlocks(prefix, count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}_desc_${String(index + 1).padStart(2, '0')}`,
    title: `说明卡片${index + 1}`,
    content: `压测说明内容 ${index + 1}，用于验证剧情库 Inspector 和说明卡片渲染。`,
    order: index,
  }));
}

/** 生成 100 个主剧情块、3000 个子剧情块和 20000 个三级剧情块。 */
function generatePlots() {
  ensureDir('plots');
  let count = 0;

  for (let mainIndex = 1; mainIndex <= 100; mainIndex += 1) {
    const mainId = `plot_${batch}_main_${String(mainIndex).padStart(3, '0')}`;

    saveJson('plots', `${mainId}.json`, {
      id: mainId,
      title: `压测主剧情块${String(mainIndex).padStart(3, '0')}`,
      summary: `第 ${mainIndex} 条主剧情线，用于大规模剧情树加载压测。`,
      parentId: null,
      order: mainIndex - 1,
      descriptionBlocks: createDescriptionBlocks(mainId, 3),
      schemaVersion: 1,
    });
    count += 1;

    for (let childIndex = 1; childIndex <= 30; childIndex += 1) {
      const childId = `${mainId}_child_${String(childIndex).padStart(2, '0')}`;

      saveJson('plots', `${childId}.json`, {
        id: childId,
        title: `主${String(mainIndex).padStart(3, '0')}子剧情${String(childIndex).padStart(2, '0')}`,
        summary: `主剧情 ${mainIndex} 下的第 ${childIndex} 个子剧情块。`,
        parentId: mainId,
        order: childIndex - 1,
        descriptionBlocks: createDescriptionBlocks(childId, 2),
        schemaVersion: 1,
      });
      count += 1;

      if (childIndex <= 10) {
        for (let leafIndex = 1; leafIndex <= 20; leafIndex += 1) {
          const leafId = `${childId}_leaf_${String(leafIndex).padStart(2, '0')}`;

          saveJson('plots', `${leafId}.json`, {
            id: leafId,
            title: `主${String(mainIndex).padStart(3, '0')}子${String(childIndex).padStart(2, '0')}细分${String(leafIndex).padStart(2, '0')}`,
            summary: `从前 10 个子剧情继续拆分出来的第 ${leafIndex} 个三级剧情块。`,
            parentId: childId,
            order: leafIndex - 1,
            descriptionBlocks: createDescriptionBlocks(leafId, 1),
            schemaVersion: 1,
          });
          count += 1;
        }
      }
    }
  }

  return count;
}

/** 生成 3 条自定义关系线和默认人物图谱中的 400 条人物关系。 */
function generateRelations() {
  ensureDir('relation-graphs');
  ensureDir('list-orders');
  ensureDir('list-orders', 'relation-graph-blocks');

  const random = createRandom(20260814);
  const characters = loadCharactersInOrder();
  const graphIds = [];
  const relationTypes = ['盟友', '敌对', '竞争', '师承', '交易', '互相试探'];

  for (let index = 1; index <= 3; index += 1) {
    const graphId = `graph_${batch}_custom_${String(index).padStart(2, '0')}`;
    const nodeA = `node_${batch}_custom_${index}_a`;
    const nodeB = `node_${batch}_custom_${index}_b`;
    graphIds.push(graphId);

    saveJson('relation-graphs', `${graphId}.json`, {
      id: graphId,
      name: `压测自定义关系图谱${index}`,
      kind: 'custom',
      description: '用于测试自定义图谱切换、节点和关系线渲染。',
      nodes: [
        {
          id: nodeA,
          label: `关系块${index}-甲`,
          kind: 'graph-block',
          view: { x: 140, y: 180 },
          customFields: { 测试批次: batch },
        },
        {
          id: nodeB,
          label: `关系块${index}-乙`,
          kind: 'graph-block',
          view: { x: 420, y: 180 },
          customFields: { 测试批次: batch },
        },
      ],
      edges: [
        {
          id: `edge_${batch}_custom_${String(index).padStart(2, '0')}`,
          from: nodeA,
          to: nodeB,
          current: {
            type: relationTypes[index % relationTypes.length],
            score: 40 + index * 15,
            reason: `第 ${index} 条自定义关系线，用于关系图谱连线压测。`,
          },
          history: [
            {
              id: `hist_${batch}_custom_${String(index).padStart(2, '0')}_01`,
              label: `压测阶段${index}`,
              order: index,
              type: '建立联系',
              score: 30 + index,
              reason: '自动生成的关系变化记录。',
              createdAt: now,
            },
          ],
          customFields: { 测试批次: batch },
        },
      ],
      view: { layout: 'manual', zoom: 1, pan: { x: 0, y: 0 } },
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });

    saveJson('list-orders', 'relation-graph-blocks', `${graphId}.json`, {
      entityType: 'relation-graph-blocks',
      graphId,
      ids: [nodeA, nodeB],
      schemaVersion: 1,
    });
  }

  const existingGraphOrder = readJsonOrFallback(['list-orders', 'relation-graphs.json'], { ids: [] });
  saveJson('list-orders', 'relation-graphs.json', {
    entityType: 'relation-graphs',
    ids: uniqueIds([...(existingGraphOrder.ids ?? []), ...graphIds]),
    schemaVersion: 1,
  });

  const existingDefaultGraph = readJsonOrFallback(['relation-graphs', 'graph_default_characters.json'], null);
  const previousNodes = new Map((existingDefaultGraph?.nodes ?? []).map((node) => [node.id, node]));
  const nodes = characters.map((character, index) => {
    const nodeId = `node_${character.id}`;
    const previousNode = previousNodes.get(nodeId);

    return {
      id: nodeId,
      label: character.name,
      kind: 'entity-ref',
      entityRef: { type: 'character', id: character.id },
      view: previousNode?.view ?? { x: 120 + (index % 8) * 150, y: 120 + Math.floor(index / 8) * 90 },
      customFields: previousNode?.customFields ?? {},
    };
  });
  const firstTwenty = characters.slice(0, 20);
  const targetPool = characters.slice(20);
  const generatedEdges = [];

  for (const [sourceIndex, source] of firstTwenty.entries()) {
    const usedTargetIds = new Set();

    while (usedTargetIds.size < 20 && usedTargetIds.size < targetPool.length) {
      const target = targetPool[Math.floor(random() * targetPool.length)];

      if (!target || target.id === source.id || usedTargetIds.has(target.id)) {
        continue;
      }

      usedTargetIds.add(target.id);
      const edgeIndex = generatedEdges.length + 1;
      generatedEdges.push({
        id: `edge_${batch}_character_${String(sourceIndex + 1).padStart(2, '0')}_${String(usedTargetIds.size).padStart(2, '0')}`,
        from: `node_${source.id}`,
        to: `node_${target.id}`,
        current: {
          type: pick(relationTypes, random),
          score: 20 + Math.floor(random() * 80),
          reason: `前 20 位人物关系压测：${source.name} 与 ${target.name} 的第 ${usedTargetIds.size} 条随机关系。`,
        },
        history: [
          {
            id: `hist_${batch}_character_${String(edgeIndex).padStart(4, '0')}_01`,
            label: `第${(edgeIndex % 80) + 1}章`,
            order: edgeIndex,
            type: '产生交集',
            score: 10 + Math.floor(random() * 50),
            reason: '压测生成的关系历史记录。',
            createdAt: now,
          },
        ],
        customFields: { 测试批次: batch },
      });
    }
  }

  const existingEdges = (existingDefaultGraph?.edges ?? []).filter((edge) => !String(edge.id).startsWith(`edge_${batch}_character_`));
  const defaultGraph = {
    id: 'graph_default_characters',
    name: '人物图谱',
    kind: 'character-default',
    description: '系统默认人物关系图谱，节点来自当前项目人物。',
    nodes,
    edges: [...existingEdges, ...generatedEdges],
    view: existingDefaultGraph?.view ?? { layout: 'manual', zoom: 1, pan: { x: 0, y: 0 } },
    createdAt: existingDefaultGraph?.createdAt ?? now,
    updatedAt: now,
    schemaVersion: 1,
  };

  saveJson('relation-graphs', 'graph_default_characters.json', defaultGraph);
  saveJson('list-orders', 'relation-graph-blocks', 'graph_default_characters.json', {
    entityType: 'relation-graph-blocks',
    graphId: 'graph_default_characters',
    ids: nodes.map((node) => node.id),
    schemaVersion: 1,
  });

  return {
    customGraphs: graphIds.length,
    customEdges: 3,
    characterEdges: generatedEdges.length,
  };
}

/** 生成 3 条时间线，每条 80 个时间块，每块 20 到 70 个事件。 */
function generateTimelines() {
  ensureDir('timeline');
  ensureDir('list-orders');

  const random = createRandom(8142026);
  const timelineIds = [];
  let timeBlockCount = 0;
  let eventCount = 0;

  for (let timelineIndex = 1; timelineIndex <= 3; timelineIndex += 1) {
    const timelineId = `timeline_${batch}_${String(timelineIndex).padStart(2, '0')}`;
    const timeBlocks = [];
    const events = [];
    timelineIds.push(timelineId);

    for (let blockIndex = 1; blockIndex <= 80; blockIndex += 1) {
      const timeBlockId = `time_${batch}_${String(timelineIndex).padStart(2, '0')}_${String(blockIndex).padStart(3, '0')}`;
      const eventTotal = 20 + Math.floor(random() * 51);

      timeBlocks.push({
        id: timeBlockId,
        name: `压测时间线${timelineIndex}-时间块${String(blockIndex).padStart(3, '0')}`,
        aliases: [`大事纪-${timelineIndex}-${blockIndex}`, `测试历-${blockIndex}`],
      });
      timeBlockCount += 1;

      for (let eventIndex = 1; eventIndex <= eventTotal; eventIndex += 1) {
        const eventId = `event_${batch}_${String(timelineIndex).padStart(2, '0')}_${String(blockIndex).padStart(3, '0')}_${String(eventIndex).padStart(3, '0')}`;
        events.push({
          id: eventId,
          timeBlockId,
          specificTime: `第${eventIndex}日`,
          title: `时间线${timelineIndex}块${blockIndex}事件${eventIndex}`,
          content: `这是第 ${timelineIndex} 条时间线、第 ${blockIndex} 个时间块中的第 ${eventIndex} 个压测事件，用于验证大量事件卡片渲染和拖拽排序性能。`,
          layout: {
            row: eventIndex,
            column: 1,
          },
          customFields: {
            人物: [`char_${batch}_${String(((eventIndex + blockIndex) % 200) + 1).padStart(3, '0')}`],
            地点: `location_${batch}_world_${String((blockIndex % 50) + 1).padStart(3, '0')}`,
            影响: {
              世界状态: '压测事件写入',
              严重度: Math.floor(random() * 100),
            },
            测试批次: batch,
          },
          schemaVersion: 1,
        });
        eventCount += 1;
      }
    }

    saveJson('timeline', `${timelineId}.json`, {
      id: timelineId,
      name: `压测时间线${timelineIndex}`,
      timeBlocks,
      events,
      schemaVersion: 1,
    });

    saveJson('list-orders', `${timelineId}_time_blocks.json`, {
      entityType: 'timeline-time-blocks',
      ids: timeBlocks.map((timeBlock) => timeBlock.id),
      schemaVersion: 1,
    });
  }

  const existingIndex = readJsonOrFallback(['timeline', 'timelines.json'], {
    activeTimelineId: null,
    timelines: [],
    schemaVersion: 1,
  });
  const nonGeneratedTimelines = (existingIndex.timelines ?? []).filter((timeline) => !String(timeline.id).startsWith(`timeline_${batch}_`));
  const generatedTimelines = timelineIds.map((id, index) => ({
    id,
    name: `压测时间线${index + 1}`,
  }));

  saveJson('timeline', 'timelines.json', {
    activeTimelineId: existingIndex.activeTimelineId ?? timelineIds[0],
    timelines: [...nonGeneratedTimelines, ...generatedTimelines],
    schemaVersion: 1,
  });

  return {
    timelines: timelineIds.length,
    timeBlocks: timeBlockCount,
    events: eventCount,
  };
}

const summary = {
  projectDir,
  characters: generateCharacters(),
  items: generateItems(),
  maps: generateMaps(),
  plots: generatePlots(),
  relations: generateRelations(),
  timelines: generateTimelines(),
};

console.log(JSON.stringify(summary, null, 2));
