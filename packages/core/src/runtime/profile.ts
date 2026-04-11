import { generateUID, isGlobalID } from '../utils/id';
import {
  AnyConfig,
  ConfigTreeNode,
  FlatConfigItem,
  GamepadMappingConfig,
  OmniPadProfile,
  StandardButton,
} from '../types';
import { Registry } from '../runtime/registry';
import { BaseEntity } from '../entities/BaseEntity';
import { sanitizeCssClass, sanitizePrototypePollution } from '../utils/security';
import { compressLayoutBox, validateLayoutBox } from '../utils/layout';

const MAX_PROFILE_ITEMS = 100; // 单个配置允许的最大组件数
const MAX_PROFILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TREE_DEPTH = 10; // 允许的最大嵌套深度

/**
 * @deprecated Use validateProfile() instead.
 * This function will be removed in v0.7.0.
 *
 * Validates and normalizes raw JSON data into a standard OmniPadProfile.
 * Performs structural checks and injects default metadata.
 *
 * @param raw - The raw JSON object from disk or network.
 * @returns A validated OmniPadProfile object.
 * @throws Error if the core structure is invalid.
 */
export function parseProfileJson(raw: any): OmniPadProfile {
  return validateProfile(raw);
}

/**
 * Validates and normalizes raw JSON data into a standard OmniPadProfile.
 * Performs structural checks and injects default metadata.
 *
 * @param raw - The raw JSON object from disk or network.
 * @returns A validated OmniPadProfile object.
 * @throws Error if the core structure is invalid.
 */
export function validateProfile(raw: any): OmniPadProfile {
  // 1. 核心结构校验
  if (!raw || typeof raw !== 'object') {
    throw new Error('[OmniPad-Validation] Profile must be a valid JSON object.');
  }

  // 大小限制
  const estimatedSize = JSON.stringify(raw).length;
  if (estimatedSize > MAX_PROFILE_SIZE) {
    throw new Error(`[OmniPad-Validation] Profile too large (max: ${MAX_PROFILE_SIZE} bytes)`);
  }
  if (!Array.isArray(raw.items) || raw.items.length > MAX_PROFILE_ITEMS) {
    throw new Error(`[OmniPad-Security] Profile items exceed limit (${MAX_PROFILE_ITEMS}).`);
  }

  // 过滤原型链污染
  raw = sanitizePrototypePollution(raw);

  // ID 唯一性检查
  const idSet = new Set<string>();
  raw.items.forEach((item: any, index: number) => {
    if (!item.id || !item.type) {
      throw new Error(`[OmniPad-Validation] Item at index ${index} missing id/type.`);
    }
    if (idSet.has(item.id)) {
      throw new Error(`[OmniPad-Security] Duplicate Config ID detected: "${item.id}".`);
    }
    idSet.add(item.id);
  });

  // 2. 补全元数据 (Metadata)
  const meta = {
    name: raw.meta?.name || 'Untitled Profile',
    version: raw.meta?.version || '1.0.0',
    author: raw.meta?.author || 'Unknown',
  };

  // 3. 项检查与基本补全
  const items = raw.items.map((item: any) => {
    return {
      id: String(item.id),
      type: String(item.type),
      parentId: item.parentId ? String(item.parentId) : undefined,
      // 确保 config 存在，业务参数平铺于此
      config: {
        ...item.config,
        layout: validateLayoutBox(item.config.layout),
        cssClass: sanitizeCssClass(item.config.cssClass),
      },
    };
  });

  // 4. 实体手柄配置校验
  validateGamepadMapping(raw.gamepadMappings, idSet);

  return {
    meta,
    items,
    gamepadMappings: raw.gamepadMappings,
  };
}

/**
 * Check whether the ID pointed to by the controller mapping exists in the current configuration.
 */
function validateGamepadMapping(mappings: any, validIds: Set<string>) {
  if (!mappings || !Array.isArray(mappings)) return;

  mappings.forEach((m, idx) => {
    // 检查按钮映射
    if (m.buttons) {
      Object.values(m.buttons).forEach((targetId: any) => {
        if (typeof targetId === 'string' && !targetId.startsWith('$') && !validIds.has(targetId)) {
          throw new Error(
            `[OmniPad-Security] Gamepad Slot ${idx}: Target ID "${targetId}" not found in items.`,
          );
        }
      });
    }
    // 检查摇杆映射
    ['dpad', 'leftStick', 'rightStick'].forEach((key) => {
      const targetId = m[key];
      if (targetId && !targetId.startsWith('$') && !validIds.has(targetId)) {
        throw new Error(
          `[OmniPad-Security] Gamepad Slot ${idx}: ${key} target "${targetId}" not found.`,
        );
      }
    });
  });
}

/**
 * The resulting structure after parsing a OmniPadProfile.
 * Contains a map of root nodes and a runtime-ready gamepad mapping table.
 */
export interface ParsedProfileForest {
  /** Root nodes indexed by their original Config ID. */
  roots: Record<string, ConfigTreeNode>;

  /**
   * Processed gamepad mapping where all CIDs have been
   * translated into unique runtime UIDs.
   */
  runtimeGamepadMappings: GamepadMappingConfig[];
}

/**
 * @deprecated Use parseProfileForest() instead.
 * This function will be removed in v0.7.0.
 *
 * Converts a flat OmniPadProfile into a forest of ConfigTreeNodes for runtime rendering.
 * Automatically identifies all items without a parentId as root nodes.
 *
 * @param profile - The normalized profile data.
 * @returns A record map of root nodes, keyed by their original configuration ID.
 */
export function parseProfileTrees(profile: OmniPadProfile): ParsedProfileForest {
  const { items, gamepadMappings } = profile;

  // 1. 建立 CID -> UID 的映射表
  // 保证在此次解析周期内，同一个 CID 永远映射到同一个 UID，处理 ID 引用关系
  const cidToUidMap = new Map<string, string>();

  const getUid = (cid: string, type: string = 'node'): string => {
    if (isGlobalID(cid)) return cid;
    if (!cidToUidMap.has(cid)) cidToUidMap.set(cid, generateUID(type));
    return cidToUidMap.get(cid)!;
  };

  // 2. 预先扫描所有项
  // 这一步是为了确保“后面引用的 ID”（如 targetStageId）在递归构建前已获得 UID
  items.forEach((item) => getUid(item.id, item.type));

  // 2a. 实体手柄映射转换
  const runtimeGamepadMappings: GamepadMappingConfig[] = [];
  if (gamepadMappings) {
    gamepadMappings.forEach((mapping) => {
      const runtimeMapping: GamepadMappingConfig = {};

      if (mapping.buttons) {
        runtimeMapping.buttons = {};
        for (const [btn, cid] of Object.entries(mapping.buttons)) {
          runtimeMapping.buttons[btn as StandardButton] = getUid(cid);
        }
      }

      if (mapping.dpad) {
        runtimeMapping.dpad = getUid(mapping.dpad);
      }
      if (mapping.leftStick) {
        runtimeMapping.leftStick = getUid(mapping.leftStick);
      }
      if (mapping.rightStick) {
        runtimeMapping.rightStick = getUid(mapping.rightStick);
      }

      runtimeGamepadMappings.push(runtimeMapping);
    });
  }

  // 3. 建立父子关系索引表
  // 优化搜索性能，将 O(n^2) 的树构建转为 O(n)
  const childrenMap = new Map<string, FlatConfigItem[]>();
  // 收集没有 parentId 的节点作为根节点
  const rootItems: FlatConfigItem[] = [];

  items.forEach((item) => {
    if (item.parentId) {
      if (!childrenMap.has(item.parentId)) childrenMap.set(item.parentId, []);
      childrenMap.get(item.parentId)!.push(item);
    } else {
      rootItems.push(item);
    }
  });

  // 4. 递归构建函数，包含循环引用保护
  // 用于追踪整个森林构建过程中被消耗的节点 / Track consumed nodes across the entire forest
  const globalVisited = new Set<string>();
  const buildNode = (item: FlatConfigItem, depth: number): ConfigTreeNode => {
    // 嵌套深度检测
    if (depth > MAX_TREE_DEPTH) {
      throw new Error(`[OmniPad-Security] Profile exceeds max depth of ${MAX_TREE_DEPTH}.`);
    }

    // 循环引用检测
    if (globalVisited.has(item.id)) {
      throw new Error(
        `[OmniPad-Security] Critical layout error. Node "${item.id}" is either part of a loop or has multiple parents.`,
      );
    }

    globalVisited.add(item.id);

    // 获取扁平业务配置。注意：此处不直接修改原 item.config 以保持纯净性
    const runtimeConfig = { ...item.config } as AnyConfig;

    // --- ID 转换逻辑：将磁盘 CID 转换为运行时 UID ---
    // A. 转换目标舞台指向
    if (runtimeConfig?.targetStageId) {
      runtimeConfig.targetStageId = getUid(runtimeConfig.targetStageId);
    }
    // B. 转换动态组件占位指向
    if (runtimeConfig?.dynamicWidgetId) {
      runtimeConfig.dynamicWidgetId = getUid(runtimeConfig.dynamicWidgetId);
    }

    // 查找并递归构建子节点树
    const rawChildren = childrenMap.get(item.id) || [];
    // 递归子节点时，传递当前的 visited 集合的副本
    const children = rawChildren.map((c) => buildNode(c, depth + 1));

    return {
      uid: getUid(item.id),
      type: item.type,
      config: runtimeConfig,
      children,
    };
  };

  // 5. 生成森林 (Forest of root nodes)
  const roots: Record<string, ConfigTreeNode> = {};
  rootItems.forEach((rootItem) => {
    roots[rootItem.id] = buildNode(rootItem, 0);
  });

  // 孤儿节点检测
  if (globalVisited.size < items.length) {
    const unreachable = items.filter((i) => !globalVisited.has(i.id)).map((i) => i.id);

    console.warn(
      `[OmniPad-Integrity] Found ${unreachable.length} unreachable nodes (orphans or isolated loops). ` +
        `These nodes will NOT be rendered: ${unreachable.join(', ')}`,
    );
  }

  return {
    roots,
    runtimeGamepadMappings,
  };
}

/**
 * [Recommended Entry Point]
 * Parses raw input (JSON string or object) into a fully resolved Profile Forest.
 *
 * This function orchestrates:
 * 1. JSON string parsing (if needed)
 * 2. Structural validation & Security hardening
 * 3. Flat-to-tree transformation & ID resolution
 *
 * @param raw - The raw profile data (JSON string or object).
 * @returns A hierarchical forest structure and resolved gamepad mappings.
 * @throws Error if parsing or validation fails.
 */
export function parseProfileForest(raw: string | OmniPadProfile): ParsedProfileForest {
  let json: OmniPadProfile;

  // 1. 处理输入类型 / Handle input type
  if (typeof raw === 'string') {
    try {
      json = JSON.parse(raw);
    } catch (e) {
      throw new Error('[OmniPad-Core] Failed to parse input string as valid JSON.');
    }
  } else {
    json = raw;
  }

  // 2. 初步核验 (Schema & Security) / Basic Validation
  const profile = validateProfile(json);

  // 3. 执行树形化转换 / Execute tree transformation
  return parseProfileTrees(profile);
}

/**
 * Serializes the specified runtime entities into a flat OmniPadProfile.
 * If no rootUids are provided, exports all entities currently in the registry.
 *
 * @param meta - Metadata for the exported profile.
 * @param rootUid - The Entity ID of the node to be treated as the root.
 * @param runtimeGamepadMapping - The current mapping from GamepadManager (using UIDs).
 * @returns A flat OmniPadProfile ready for storage.
 */
export function exportProfile(
  meta: OmniPadProfile['meta'],
  rootUids?: string[],
  runtimeGamepadMappings?: Readonly<GamepadMappingConfig[]>,
): OmniPadProfile {
  const registry = Registry.getInstance();
  let targetEntities: BaseEntity<any, any>[] = [];

  if (!rootUids || rootUids.length === 0) {
    // 没指定根，导出注册表里所有的玩意儿
    targetEntities = registry.getAllEntities() as BaseEntity<any, any>[];
  } else {
    // 根据多个根 UID 分别抓取，然后去重合并
    const entitySet = new Set<BaseEntity<any, any>>();
    rootUids.forEach((uid) => {
      const subtree = registry.getEntitiesByRoot(uid) as BaseEntity<any, any>[];
      subtree.forEach((e) => entitySet.add(e));
    });
    targetEntities = Array.from(entitySet);
  }

  // 1. 建立 EID -> 新 CID 的映射表
  // 规则：如果是 $ 开头的全局 ID 保持不变，否则生成简短的 cid_xxxx 以减小配置体积
  const eidToCidMap = new Map<string, string>();
  let cidCounter = 0;

  const getNewCid = (eid: string): string => {
    if (isGlobalID(eid)) return eid;
    if (!eidToCidMap.has(eid)) {
      eidToCidMap.set(eid, `node_${++cidCounter}`);
    }
    return eidToCidMap.get(eid)!;
  };

  // 2. 扫描并转换
  // 遍历所有获取到的实体，通过其内部的 getConfig 方法还原最新状态
  const items: FlatConfigItem[] = targetEntities.map((entity) => {
    const config = entity.getConfig();
    const currentEid = entity.uid;

    // 复制配置副本并执行反向 ID 转换
    const processedConfig = { ...config };
    if (processedConfig.targetStageId) {
      processedConfig.targetStageId = getNewCid(processedConfig.targetStageId);
    }
    if (processedConfig.dynamicWidgetId) {
      processedConfig.dynamicWidgetId = getNewCid(processedConfig.dynamicWidgetId);
    }

    // 剔除运行时元数据，仅保留业务配置
    const { id, parentId, ...cleanConfig } = processedConfig;

    return {
      id: getNewCid(currentEid),
      type: entity.type,
      // 如果存在父级，将其 UID 转换回本次导出的新 CID
      parentId: config.parentId ? getNewCid(config.parentId) : undefined,
      config: {
        ...cleanConfig,
        layout: compressLayoutBox(cleanConfig.layout),
      },
    };
  });

  // 3. 逆向转换 Gamepad 映射表
  // 将 GamepadManager 里的 UID 映射转回新的 CID 映射
  const exportedGamepadMappings: GamepadMappingConfig[] = [];

  if (runtimeGamepadMappings) {
    runtimeGamepadMappings.forEach((mapping) => {
      const exportedMapping: GamepadMappingConfig = {};

      if (mapping.buttons) {
        exportedMapping.buttons = {};
        for (const [btn, uid] of Object.entries(mapping.buttons)) {
          // 只有当这个 UID 对应的组件也在本次导出的 items 范围内时才保留
          if (eidToCidMap.has(uid)) {
            exportedMapping.buttons[btn as StandardButton] = eidToCidMap.get(uid)!;
          }
        }
      }

      // 转换摇杆指向
      if (mapping.dpad && eidToCidMap.has(mapping.dpad)) {
        exportedMapping.dpad = eidToCidMap.get(mapping.dpad);
      }
      if (mapping.leftStick && eidToCidMap.has(mapping.leftStick)) {
        exportedMapping.leftStick = eidToCidMap.get(mapping.leftStick);
      }
      if (mapping.rightStick && eidToCidMap.has(mapping.rightStick)) {
        exportedMapping.rightStick = eidToCidMap.get(mapping.rightStick);
      }

      if (Object.keys(exportedMapping).length > 0) {
        exportedGamepadMappings.push(exportedMapping);
      } else {
        // 如果这个手柄的映射都没在导出范围内，可以塞个空对象占位，保持 index 顺序
        exportedGamepadMappings.push({});
      }
    });
  }

  return {
    meta,
    items,
    gamepadMappings:
      Object.keys(exportedGamepadMappings).length > 0 ? exportedGamepadMappings : undefined,
  };
}
