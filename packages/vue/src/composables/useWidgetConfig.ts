import { computed, inject, provide, ref, Ref } from 'vue';
import { BaseConfig, ConfigTreeNode, EntityType, generateUID, CONTEXT } from '@omnipad/core';

/**
 * 控件配置整合钩子
 * @param requiredType 要求的组件类型 (用于校验)
 * @param props 组件接收到的原始 Props
 * @param defaultProps 组件定义的业务默认值 (不含 treeNode)
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
