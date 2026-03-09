import { computed, inject, provide, ref, Ref } from 'vue';
import { type BaseConfig, type ConfigTreeNode, type EntityType, CONTEXT } from '@omnipad/core';
import { generateUID } from '@omnipad/core/utils';

/**
 * A unified hook to resolve widget configurations by merging JSON tree nodes and Vue props.
 *
 * It handles:
 * 1. UID generation and persistence.
 * 2. Identity inheritance (finding parentId via Provide/Inject).
 * 3. Configuration merging (Props override JSON config).
 *
 * @template T - The specific configuration type extending BaseConfig.
 * @param defaultType - The fallback component type if not specified in config.
 * @param props - The raw properties passed to the Vue component.
 * @param defaultProps - Default values to fill if both config and props are missing.
 * @returns An object containing the finalized `uid` and the reactive `config`.
 */
export function useWidgetConfig<T extends BaseConfig>(
  requiredType: EntityType,
  props: Record<string, any>,
  defaultProps: Record<string, any> = {},
) {
  // 类型检查：提取并验证 treeNode
  const rawTreeNode = props.treeNode as ConfigTreeNode | undefined;

  // 如果类型不匹配，treeNode 被视为 undefined，从而忽略该配置
  const treeNode =
    (rawTreeNode && rawTreeNode.config?.baseType === requiredType) ||
    rawTreeNode?.type === requiredType
      ? rawTreeNode
      : undefined;

  if (rawTreeNode && !treeNode) {
    console.warn(
      `[OmniPad-Validation] Type mismatch! Component expected "${requiredType}", but received "${rawTreeNode.type}". Config ignored.`,
    );
  }

  // 确定父节点编号
  const injectedParentId = inject<Ref<string | undefined>>(CONTEXT.PARENT_ID_KEY, ref(undefined));
  const parentId = computed(() => {
    return props.parentId || treeNode?.config?.parentId || injectedParentId.value;
  });

  // 确定 UID
  // 优先级：Prop 传入的 widgetId > treeNode 里的 UID > 随机生成
  const uid = computed(() => props.widgetId || treeNode?.uid || generateUID(requiredType));
  provide(CONTEXT.PARENT_ID_KEY, uid);

  // 合并业务配置 (Props 覆盖 Config)
  const config = computed(() => {
    const fromConfig = treeNode?.config || {};

    // 过滤掉 Vue Props 中的辅助性字段和 undefined 值
    const fromProps = Object.fromEntries(
      Object.entries(props).filter(([k, v]) => {
        return v !== undefined && k !== 'treeNode' && k !== 'widgetId';
      }),
    );

    // 组装最终配置
    return {
      ...defaultProps,
      ...fromConfig,
      ...fromProps,
      id: uid.value,
      baseType: requiredType,
      parentId: parentId.value,
      // 特殊处理 Layout：深度合并，确保即便只传了 { width: 100 } 也不丢失原来的 left/top
      layout: {
        ...(defaultProps.layout || {}),
        ...(fromConfig.layout || {}),
        ...(fromProps.layout || {}),
      },
    } as T;
  });

  return { uid, config };
}
