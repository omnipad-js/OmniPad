import { generateUID, isGlobalID } from './id';
import { AnyConfig, ConfigTreeNode, FlatConfigItem, GamepadProfile } from '../types';
import { Registry } from '../registry';
import { BaseEntity } from '../entities/BaseEntity';

/**
 * Validates and normalizes raw JSON data into a standard GamepadProfile.
 * Performs structural checks and injects default metadata.
 *
 * @param raw - The raw JSON object from disk or network.
 * @returns A validated GamepadProfile object.
 * @throws Error if the core structure is invalid.
 */
export function parseProfileJson(raw: any): GamepadProfile {
  // 1. 核心结构校验
  if (!raw || typeof raw !== 'object') {
    throw new Error('[OmniPad-Validation] Profile must be a valid JSON object.');
  }

  if (!raw.rootId) {
    throw new Error('[OmniPad-Validation] Missing "rootId" in profile.');
  }

  if (!Array.isArray(raw.items)) {
    throw new Error('[OmniPad-Validation] "items" must be an array.');
  }

  // 2. 补全元数据 (Metadata)
  const meta = {
    name: raw.meta?.name || 'Untitled Profile',
    version: raw.meta?.version || '1.0.0',
    author: raw.meta?.author || 'Unknown',
  };

  // 3. 项检查与基本补全
  // 确保每一个配置项都具备基础属性，防止解析树时报错
  const items = raw.items.map((item: any, index: number) => {
    if (!item.id || !item.type) {
      throw new Error(`[OmniPad-Validation] Item at index ${index} is missing "id" or "type".`);
    }

    return {
      id: String(item.id),
      type: String(item.type),
      parentId: item.parentId ? String(item.parentId) : undefined,
      // 确保 config 存在，业务参数平铺于此
      config: item.config || {},
    };
  });

  return {
    meta,
    rootId: String(raw.rootId),
    items,
  };
}

/**
 * Converts a flat GamepadProfile into a hierarchical ConfigTreeNode tree for runtime rendering.
 * Handles CID (Config ID) to UID (Entity ID) mapping and reference resolution.
 *
 * @param profile - The normalized profile data.
 * @returns The root node of the configuration tree.
 */
export function parseProfileTree(profile: GamepadProfile): ConfigTreeNode {
  const { items, rootId } = profile;

  // 1. 建立 CID -> UID 的映射表
  // 保证在此次解析周期内，同一个 CID 永远映射到同一个 UID，处理 ID 引用关系
  const cidToUidMap = new Map<string, string>();

  const getUid = (cid: string, type: string = 'node'): string => {
    if (isGlobalID(cid)) return cid;
    if (!cidToUidMap.has(cid)) {
      cidToUidMap.set(cid, generateUID(type));
    }
    return cidToUidMap.get(cid)!;
  };

  // 2. 预先扫描所有项
  // 这一步是为了确保“后面引用的 ID”（如 targetStageId）在递归构建前已获得 UID
  items.forEach((item) => getUid(item.id, item.type));

  // 3. 建立父子关系索引表
  // 优化搜索性能，将 O(n^2) 的树构建转为 O(n)
  const childrenMap = new Map<string, FlatConfigItem[]>();
  items.forEach((item) => {
    if (item.parentId) {
      if (!childrenMap.has(item.parentId)) {
        childrenMap.set(item.parentId, []);
      }
      childrenMap.get(item.parentId)!.push(item);
    }
  });

  // 4. 递归构建函数
  const buildNode = (item: FlatConfigItem): ConfigTreeNode => {
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
    const children = rawChildren.map((child) => buildNode(child));

    return {
      uid: getUid(item.id),
      type: item.type,
      config: runtimeConfig,
      children,
    };
  };

  // 5. 找到根节点并开始从顶向下构建
  const rootItem = items.find((i) => i.id === rootId);
  if (!rootItem) {
    throw new Error(`[OmniPad-Core] Root item with ID "${rootId}" not found in profile.`);
  }

  return buildNode(rootItem);
}

/**
 * Serializes the current runtime entities from the Registry back into a flat GamepadProfile.
 * Generates fresh Config IDs (CIDs) for all nodes except global IDs.
 *
 * @param meta - Metadata for the exported profile.
 * @param rootUid - The Entity ID of the node to be treated as the root.
 * @returns A flat GamepadProfile ready for storage.
 */
export function exportProfile(meta: GamepadProfile['meta'], rootUid: string): GamepadProfile {
  const registry = Registry.getInstance();
  // 仅获取属于指定 rootUid 下的子树实体 (BFS 逻辑)
  const allEntities = registry.getEntitiesByRoot(rootUid) as BaseEntity<any, any>[];

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
  const items: FlatConfigItem[] = allEntities.map((entity) => {
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
      config: cleanConfig,
    };
  });

  return {
    meta,
    rootId: getNewCid(rootUid),
    items,
  };
}
