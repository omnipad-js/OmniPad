import { BaseEntity } from './BaseEntity';
import { BaseConfig } from '../types/configs';
import { LayerState, CMP_TYPES } from '../types';

/**
 * Initial state for the Root Layer.
 */
const INITIAL_STATE: LayerState = {
  isHighlighted: false,
};

/**
 * Core logic for the Root/Managed Layer.
 *
 * Acts as the top-level container for a gamepad profile, providing the base
 * identity (UID) and coordinate reference for all descendant components.
 */
export class RootLayerCore extends BaseEntity<BaseConfig, LayerState> {
  constructor(uid: string, config: BaseConfig) {
    // 显式指定实体类型为 ROOT_LAYER / Explicitly set the entity type as ROOT_LAYER
    super(uid, CMP_TYPES.ROOT_LAYER, config, INITIAL_STATE);
  }

  public reset(): void {
    // 根图层目前不持有任何活跃的输入信号，无需执行特定重置逻辑
    // Root layer currently holds no active input signals, no specific reset logic required.
  }
}
