import {
  AbstractRect,
  AnyFunction,
  EntityType,
  IElementObserver,
  IResettable,
  ISpatial,
} from '../types';
import { BaseConfig, ConfigTreeNode } from '../types/configs';
import { createCachedProvider } from '../utils/cache';
import { filterObjectByKeys, mergeObjects } from '../utils/object';
import { StickyProvider } from './sticky';

/**
 * Binds a map of delegate functions to a core entity instance.
 *
 * @param entity - The target entity instance.
 * @param delegates - A key-value map of functions to bind.
 */
export function bindEntityDelegates(entity: any, delegates?: Record<string, AnyFunction>): void {
  if (!entity || !delegates) return;

  // 检查实体是否实现了 IDependencyBindable 接口
  if ('bindDelegate' in entity && typeof entity.bindDelegate === 'function') {
    const entries = Object.entries(delegates);

    for (let i = 0; i < entries.length; i++) {
      const [key, fn] = entries[i];

      // 严格校验：确保只绑定函数
      if (typeof fn === 'function') {
        entity.bindDelegate(key, fn);
      }
    }
  }
}

/**
 * Orchestrates environment-agnostic spatial and visibility logic for an entity.
 *
 * @template T - The type of the physical element (e.g., HTMLElement, Element).
 * @param entity - The logic core entity instance (must implement ICoreEntity).
 * @param element - The physical element target to be observed.
 * @param observer - The unified observer singleton (RO/IO) to track the element.
 * @param getRect - An environment-specific function to retrieve the element's current Rect.
 * @param stickyProvider - Optional. If provided, its cache will be invalidated alongside the entity's.
 *
 * @returns A cleanup function to disconnect all registered observers.
 */
export function setupSpatialLogic<T>(
  entity: any,
  element: T,
  observer: IElementObserver<T>,
  getRect: (el: T) => AbstractRect,
  stickyProvider?: StickyProvider<T> | null,
) {
  if (!entity.uid) return () => {};
  const uid = entity.uid;

  // --- 1. Spatial Logic (Rect & Resize) ---
  if ('bindRectProvider' in entity) {
    const spatialCore = entity as unknown as ISpatial;

    // 创建带缓存的提供者 / Create cached provider
    const cached = createCachedProvider(() => getRect(element));

    // 绑定获取与清理回调 / Bind getter and invalidation callback
    spatialCore.bindRectProvider(cached.get, () => {
      cached.markDirty();
      // 联动清理吸附目标的缓存 / Link invalidation to sticky provider
      if (stickyProvider) {
        stickyProvider.markDirty();
      }
    });

    // 注册尺寸监听 / Register ResizeObserver
    observer.observeResize(uid, element, () => {
      spatialCore.markRectDirty();
    });
  }

  // --- 2. Visibility Logic (Intersection) ---
  if ('reset' in entity) {
    const resettableCore = entity as unknown as IResettable;

    observer.observeIntersect(uid, element, (isVisible) => {
      // 丢失可见性时自动重置信号 (安全阀) / Auto-reset on visibility loss
      if (!isVisible) {
        resettableCore.reset();
      }
    });
  }

  // 返回清理函数 (用于注销所有监听) / Return cleanup function
  return () => {
    observer.disconnect(uid);
  };
}

/**
 * Filters out a specific dynamic child node from the tree by its ID (UID).
 *
 * @param children - The array of tree nodes to filter.
 * @param dynamicWidgetId - The UID of the widget to be removed.
 * @returns A new array excluding the specified dynamic child, or an empty array.
 */
export function filterNotDynamicChildren(children: ConfigTreeNode[] = [], dynamicWidgetId: string) {
  return children?.filter((child) => child.uid !== dynamicWidgetId) || [];
}

/**
 * Extract filtered override configurations.
 * @param props Original Props object (e.g. Vue's props)
 * @param skipKeys Ignore key set
 */
export function getOverrideProps(props: Record<string, any>, skipKeys: Set<string>) {
  return filterObjectByKeys(props, skipKeys);
}

/**
 * Merges multiple configuration sources into a unified widget configuration object.
 *
 * @description
 * This function performs a shallow merge of the provided configuration objects with a
 * specific precedence order (Right-most takes priority). It also performs a one-level
 * deep merge specifically for the `layout` property to ensure layout settings are
 * preserved across different sources.
 *
 * **Merge Priority (Highest to Lowest):**
 * 1. Fixed metadata (`id`, `baseType`, `parentId`) - *Guaranteed overrides*
 * 2. `overrideProps`
 * 3. `treeConfig`
 * 4. `defaultProps`
 *
 * @param requiredType - The formal entity type (e.g., 'button', 'input-zone') assigned to `baseType`.
 * @param uid - The unique identifier to be assigned to the `id` property.
 * @param parentId - The unique identifier of the parent container, if any.
 * @param defaultProps - The baseline fallback configuration.
 * @param treeConfig - Configuration derived from the widget tree structure.
 * @param overrideProps - Domain-specific or instance-specific property overrides.
 *
 * @returns A complete configuration object of type `T`.
 */
export function mergeWidgetConfig<T extends BaseConfig>(
  requiredType: EntityType,
  uid: string,
  parentId: string | undefined,
  defaultProps: Record<string, any>,
  treeConfig: Record<string, any>,
  overrideProps: Record<string, any>,
): T {
  // 1. 先进行整体扁平属性的合并
  const merged = mergeObjects<T>(defaultProps, treeConfig, overrideProps);

  // 2. 注入固定身份信息
  merged.id = uid;
  merged.baseType = requiredType;
  merged.parentId = parentId;

  // 3. 特殊处理：Layout 深度合并
  // 即使 businessProps 只传了 { width: 100 }，也要确保不会丢失 treeConfig 里的 { left: '10%' }
  merged.layout = mergeObjects(defaultProps.layout, treeConfig.layout, overrideProps.layout);

  return merged;
}

/**
 * Resolves the dynamic widget instance to be rendered based on priority and exclusivity rules.
 *
 * This utility handles conflicts between manual components provided via slots and template
 * components defined in the configuration. It implements a "Slot-First" strategy:
 * 1. If slot nodes are present, the first valid node is chosen, and configuration templates are ignored.
 * 2. If no slot nodes are present, it fallbacks to searching the configuration children for the matching UID.
 * 3. Enforces uniqueness by ensuring only one component is rendered even if multiple are provided.
 *
 * @template T - The type of the node provided by the adapter (e.g., Vue VNode).
 * @param slotNodes - An array of nodes retrieved from the dynamic widget slot.
 * @param children - The array of child nodes from the current ConfigTreeNode.
 * @param dynamicId - The UID assigned to the dynamic widget template.
 * @returns An object containing the resolved node to render and its source origin.
 */
export function resolveDynamicWidget<T>(
  slotNodes: T[],
  children: ConfigTreeNode[] = [],
  dynamicId: string,
): {
  nodeToRender: T | ConfigTreeNode | null;
  isFromSlot: boolean;
} {
  // 从配置子项中查找对应的动态模板节点 / Search for the dynamic template node in config children
  const configTemplate = children?.find((child) => child.uid === dynamicId);
  const hasSlot = slotNodes.length > 0;

  // 冲突与唯一性处理策略 / Conflict and Uniqueness Strategy:

  // 1. 若 Slot 内部有多个组件，只取第一个 / If multiple nodes exist in slot, take the first one only
  if (slotNodes.length > 1) {
    console.error(
      `[OmniPad-Validation] InputZone ${dynamicId} has multiple dynamic widgets in slot. Only the first one will be activated.`,
    );
  }

  // 2. 若 Slot 和 Config 同时存在，Slot 胜出，Config 被忽略 / Slot takes precedence over Config template
  if (hasSlot && configTemplate) {
    console.warn(
      `[OmniPad-Validation] InputZone ${dynamicId} has both Slot and Config dynamic widgets. Config ignored.`,
    );
  }

  return {
    // 优先级判断 / Priority resolution
    nodeToRender: hasSlot ? slotNodes[0] : configTemplate || null,
    isFromSlot: hasSlot,
  };
}

/**
 * Validates that the provided node exists and is non-empty.
 *
 * It matches the node against the `requiredType` by checking both the protocol-level `config.baseType`
 * and the potentially custom `type`.
 *
 * @param node - The configuration node to validate. Can be `undefined`.
 * @param requiredType - The expected {@link EntityType} the node should represent.
 *
 * @returns The original `node` if validation passes; otherwise, `undefined`.
 */
export function validateWidgetNode(
  node: ConfigTreeNode | undefined,
  requiredType: EntityType,
): ConfigTreeNode | undefined {
  if (!node || Object.keys(node ?? {}).length === 0) return undefined;

  const isValid = node.config?.baseType === requiredType || node.type === requiredType;

  if (!isValid) {
    if (import.meta.env?.DEV) {
      console.warn(
        `[OmniPad-Validation] Type mismatch! Expected "${requiredType}", received "${node.type}". Config ignored.`,
      );
    }
    return undefined;
  }

  return node;
}
