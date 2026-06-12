import {
  getOverrideProps,
  mergeWidgetConfig,
  validateWidgetNode,
  type BaseConfig,
  type EntityType,
} from '@omnipad/core';
import { generateUID } from '@omnipad/core/utils';
import { resolveDomParentId } from './dom';
import type { ResolvedWidgetConfig, VanillaWidgetOptions } from './types';

const BASE_INTERNAL_PROPS = Object.freeze([
  'treeNode',
  'widgetId',
  'parentId',
  'customType',
  'append',
  'children',
  'nodes',
  'dynamicWidget',
  'renderBase',
  'renderContent',
  'renderStick',
  'renderCursor',
  'renderWithCursor',
  'renderFocusFeedback',
]);

export function resolveWidgetConfig<TConfig extends BaseConfig>(
  requiredType: EntityType,
  container: HTMLElement,
  options: VanillaWidgetOptions<TConfig> = {},
  defaultProps: Record<string, unknown> = {},
  extraSkipProps: string[] = [],
): ResolvedWidgetConfig<TConfig> {
  const treeNode = validateWidgetNode(options.treeNode, requiredType);
  const parentId =
    options.parentId ||
    (treeNode?.config?.parentId as string | undefined) ||
    resolveDomParentId(container);
  const uid = options.widgetId || treeNode?.uid || generateUID(requiredType);
  const skip = new Set([...BASE_INTERNAL_PROPS, ...extraSkipProps]);
  const fromTreeConfig = treeNode?.config || {};
  const overrideProps = getOverrideProps(options as Record<string, unknown>, skip);

  return {
    uid,
    treeNode,
    customType: options.customType || treeNode?.type,
    initialConfig: mergeWidgetConfig<TConfig>(
      requiredType,
      uid,
      parentId,
      defaultProps,
      fromTreeConfig,
      overrideProps,
    ),
  };
}
