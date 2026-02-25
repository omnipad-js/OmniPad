import { IRegistry } from '../types/registry';
import { ICoreEntity } from '../types/traits';

/**
 * Unique symbol key for the global registry instance to ensure singleton
 * persistence across different modules or packages in a monorepo.
 */
const GLOBAL_REGISTRY_KEY = Symbol.for('omnipad.registry.instance');

/**
 * Global Registry Singleton.
 *
 * Acts as the "Census Bureau" for the system, maintaining references to all active
 * logic entities (Stages, Widgets, Layers). It enables cross-component communication
 * and coordinate mapping by allowing entities to look each other up via UIDs.
 */
export class Registry implements IRegistry {
  /** Internal storage: Mapping of Entity UID to Entity Instance */
  private entities = new Map<string, ICoreEntity>();

  /**
   * Private constructor to enforce singleton pattern.
   */
  private constructor() {
    if (import.meta.env?.DEV) {
      console.log('[OmniPad-Core] Registry initialized.');
    }
  }

  /**
   * Retrieves the global instance of the Registry.
   * Uses globalThis to ensure the instance is unique even if the library is loaded multiple times.
   */
  public static getInstance(): Registry {
    const globalObj = globalThis as any;

    if (!globalObj[GLOBAL_REGISTRY_KEY]) {
      globalObj[GLOBAL_REGISTRY_KEY] = new Registry();
    }

    return globalObj[GLOBAL_REGISTRY_KEY];
  }

  public register(entity: ICoreEntity): void {
    if (!entity.uid) {
      console.warn('[OmniPad-Core] Registry: Attempted to register entity without UID.', entity);
      return;
    }

    if (this.entities.has(entity.uid)) {
      // 在 HMR (热重载) 或组件快速销毁重建时可能会发生，覆盖旧的即可
      // console.debug(`[OmniPad-Core] Registry: Overwriting existing entity ${entity.uid}`);
    }

    this.entities.set(entity.uid, entity);
  }

  public unregister(uid: string): void {
    if (this.entities.has(uid)) {
      this.entities.delete(uid);
    }
  }

  public getEntity<T extends ICoreEntity = ICoreEntity>(uid: string): T | undefined {
    return this.entities.get(uid) as T | undefined;
  }

  public getAllEntities(): ICoreEntity[] {
    return Array.from(this.entities.values());
  }

  public getEntitiesByRoot(rootUid: string): ICoreEntity[] {
    const all = this.getAllEntities();

    // 1. 如果没有指定根，直接返回所有 (全量备份模式)
    if (!rootUid) return all;

    // 2. 如果指定了根，进行树形查找 (局部导出模式)
    // 首先检查根是否存在
    const rootEntity = this.entities.get(rootUid);
    if (!rootEntity) {
      console.warn(`[OmniPad-Core] Registry: Root entity ${rootUid} not found.`);
      return [];
    }

    // 3. 建立临时的 "Parent -> Children" 索引表
    // 这一步复杂度是 O(N)，比每次递归都去遍历全表要快得多
    const parentMap = new Map<string, ICoreEntity[]>();

    all.forEach((entity) => {
      const e = entity as any;
      // 检查是否有 getConfig 方法
      if (typeof e.getConfig === 'function') {
        const config = e.getConfig();
        if (config.parentId) {
          if (!parentMap.has(config.parentId)) {
            parentMap.set(config.parentId, []);
          }
          parentMap.get(config.parentId)!.push(entity);
        }
      }
    });

    // 4. BFS (广度优先搜索) 收集所有后代
    const result: ICoreEntity[] = [];
    const queue: string[] = [rootUid];
    const visited = new Set<string>(); // 防止循环引用导致的死循环

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const entity = this.entities.get(currentId);
      if (entity) {
        result.push(entity);

        // 查找它的子节点并加入队列
        const children = parentMap.get(currentId);
        if (children) {
          children.forEach((child) => queue.push(child.uid));
        }
      }
    }

    return result;
  }

  public destroyByRoot(rootUid: string): void {
    // 1. 获取该根节点下的所有实体序列 (包含根自身)
    const entities = this.getEntitiesByRoot(rootUid);

    // 2. 倒序执行销毁
    // 为什么要倒序？因为在逻辑上应该从叶子节点开始注销，最后注销根节点，
    // 这样可以避免子节点在销毁过程中尝试寻找已不存在的父级。
    for (let i = entities.length - 1; i >= 0; i--) {
      const entity = entities[i];
      try {
        // 执行 BaseEntity 里的 destroy()
        // 内部会自动触发 reset()、emitter.clear() 和 registry.unregister()
        entity.destroy();
      } catch (error) {
        console.error(`[OmniPad-Core] Error during destroyByRoot at ${entity.uid}:`, error);
      }
    }
  }

  public clear(): void {
    this.entities.clear();
  }

  public resetAll(): void {
    this.entities.forEach((entity) => {
      if ('reset' in entity) {
        (entity as any).reset();
      }
    });
  }

  public debugGetSnapshot(): Map<string, ICoreEntity> {
    return new Map(this.entities);
  }
}
