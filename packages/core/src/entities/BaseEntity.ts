import { ICoreEntity, IResettable } from '../types/traits';
import { ISpatial, IConfigurable, IObservable } from '../types/traits';
import { Registry } from '../registry';
import { SimpleEmitter } from '../utils/emitter';
import { AbstractRect, EntityType } from '../types';

/**
 * Base abstract class for all logic entities in the system.
 * Provides fundamental identity management, state subscription, and spatial awareness.
 */
export abstract class BaseEntity<TConfig, TState>
  implements ICoreEntity, ISpatial, IResettable, IConfigurable<TConfig>, IObservable<TState>
{
  public readonly uid: string;
  public readonly type: EntityType;

  protected config: TConfig;
  protected state: TState;
  protected rectProvider: (() => AbstractRect) | null = null;

  private _onMarkDirtyCb: (() => void) | null = null;

  // 内部状态发射器，负责处理状态订阅逻辑 / Internal emitter for state subscription logic
  protected stateEmitter = new SimpleEmitter<TState>();

  // 内部配置发射器，负责处理配置订阅逻辑 / Internal emitter for config subscription logic
  protected configEmitter = new SimpleEmitter<TConfig>();

  constructor(uid: string, type: EntityType, initialConfig: TConfig, initialState: TState) {
    // 初始化身份标识与基础配置 / Initialize identity and base configuration
    this.uid = uid;
    this.type = type;
    this.config = initialConfig;
    this.state = initialState;

    // 默认不在此处自动注册，交由适配层或子类根据需要执行
    // Registration is not automatic here, handled by adapter or subclasses
  }

  // --- IObservable Implementation ---

  public subscribe(cb: (state: TState) => void): () => void {
    // 立即执行一次回调以确保 UI 初始状态同步 / Immediate callback execution to ensure initial UI state sync
    cb(this.state);

    // 委托给发射器管理后续订阅 / Delegate subsequent subscriptions to the emitter
    return this.stateEmitter.subscribe(cb);
  }

  // --- IConfigurable Implementation ---

  public getConfig(): Readonly<TConfig> {
    return this.config;
  }

  public subscribeConfig(cb: (config: TConfig) => void): () => void {
    // 立即执行一次回调以确保配置同步 / Immediate callback execution to ensure config sync
    cb(this.config);

    // 委托给发射器管理后续订阅 / Delegate subsequent subscriptions to the emitter
    return this.configEmitter.subscribe(cb);
  }

  public updateConfig(newConfig: Partial<TConfig>): void {
    // 合并新配置项 / Merge new configuration items
    this.config = { ...this.config, ...newConfig };

    // 配置变更可能导致 UI 需要重新计算，重新分发当前状态
    // Config changes may require UI recalculation, re-dispatch current state
    this.configEmitter.emit(this.config);
  }

  // --- State Management ---

  /**
   * Updates the internal state and notifies all subscribers.
   *
   * @param partialState - Partial object containing updated state values.
   */
  protected setState(partialState: Partial<TState>): void {
    // 执行状态浅合并 / Perform shallow merge of the state
    this.state = { ...this.state, ...partialState };

    // 触发更新通知 / Trigger update notification
    this.stateEmitter.emit(this.state);
  }

  // --- Lifecycle ---

  public destroy(): void {
    // 销毁前强制切断当前信号 / Cut off active signals before destruction
    this.reset();

    // 清理发射器防止内存泄漏 / Clear emitter to prevent memory leaks
    this.stateEmitter.clear();
    this.configEmitter.clear();

    // 从全局注册表注销身份 / Unregister identity from the global registry
    Registry.getInstance().unregister(this.uid);
  }

  // --- Interface Implementations ---

  public abstract reset(): void;

  public get rect(): AbstractRect | null {
    return this.rectProvider ? this.rectProvider() : null;
  }

  public bindRectProvider(provider: () => AbstractRect, onMarkDirty?: () => void): void {
    this.rectProvider = provider;
    if (onMarkDirty) this._onMarkDirtyCb = onMarkDirty;
  }

  public markRectDirty(): void {
    this._onMarkDirtyCb?.();
  }

  public getState(): Readonly<TState> {
    return this.state;
  }
}
