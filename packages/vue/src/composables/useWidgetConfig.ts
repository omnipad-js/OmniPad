import { computed, inject, provide, ref, Ref } from 'vue';
import { type BaseConfig, type ConfigTreeNode, type EntityType, CONTEXT } from '@omnipad/core';
import { generateUID, getBusinessProps } from '@omnipad/core/utils';

const BASE_INTERNAL_PROPS = ['treeNode', 'widgetId', 'parentId'];

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
  extraSkipProps: string[] = [],
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

  // 组合最终的忽略集合
  const skip = new Set([...BASE_INTERNAL_PROPS, ...extraSkipProps]);
  // --- 组装初始的完整配置 ---
  const fromTreeConfig = treeNode?.config || {};

  // 提取初始时刻通过 props 传入的业务字段
  const initialProps = getBusinessProps(props, skip);

  const initialConfig = computed(() => {
    return {
      ...defaultProps,
      ...fromTreeConfig,
      ...initialProps,
      id: uid.value,
      baseType: requiredType,
      parentId: parentId.value,
      // 特殊处理 Layout：深度合并，确保即便只传了 { width: 100 } 也不丢失原来的 left/top
      layout: {
        ...(defaultProps.layout || {}),
        ...(fromTreeConfig.layout || {}),
        ...(initialProps.layout || {}),
      },
    } as T;
  });

  // 每次 props 变化时，只提取出真正传进来的业务属性
  const reactiveConfig = computed(() => {
    // 排除身份和依赖配置的异常变更
    const currentProps = getBusinessProps(props, skip) as Partial<T>;

    return {
      ...currentProps,
      parentId: parentId.value,
      layout: currentProps.layout || undefined, // 只有当传入了新的 layout 时才包裹
    } as Partial<T>;
  });

  return { uid, initialConfig, reactiveConfig };
}
