import { EntityType } from '../types';
import { ConfigTreeNode } from '../types/configs';

/**
 * Extract filtered business configurations.
 * @param props Original Props object (e.g. Vue's props)
 * @param skipKeys Ignore key set
 */
export function getBusinessProps(props: Record<string, any>, skipKeys: Set<string>) {
  const result: Record<string, any> = {};
  for (const key in props) {
    if (props[key] !== undefined && !skipKeys.has(key)) {
      result[key] = props[key];
    }
  }
  return result;
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
