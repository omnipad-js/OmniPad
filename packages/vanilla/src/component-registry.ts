import type { ConfigTreeNode } from '@omnipad/core';
import type { VanillaComponentConstructor, VanillaWidgetInstance } from './types';

const registry: Record<string, VanillaComponentConstructor> = {};

export function registerComponent(type: string, component: VanillaComponentConstructor): void {
  registry[type] = component;
}

export function getComponentSafe(type: string | undefined): VanillaComponentConstructor | null {
  if (!type) return null;
  return registry[type] || null;
}

export function hasRegisteredComponent(type: string | undefined): boolean {
  return !!getComponentSafe(type);
}

export function getComponent(type: string): VanillaComponentConstructor {
  return registry[type] || UnknownWidget;
}

export function createWidgetFromNode(
  container: HTMLElement,
  node: ConfigTreeNode,
): VanillaWidgetInstance {
  const Component =
    getComponentSafe(node.type) ||
    getComponentSafe(node.config?.baseType as string) ||
    getComponent(node.type);
  return new Component(container, { treeNode: node });
}

class UnknownWidget implements VanillaWidgetInstance {
  public readonly uid: string;
  public readonly el: HTMLElement;

  constructor(container: HTMLElement, options: { treeNode?: ConfigTreeNode } = {}) {
    this.uid = options.treeNode?.uid || 'unknown-widget';
    this.el = document.createElement('div');
    this.el.id = this.uid;
    this.el.textContent = `[Unknown: ${options.treeNode?.type || 'component'}]`;
    Object.assign(this.el.style, {
      color: '#ff4d4f',
      fontFamily: 'monospace',
      position: 'absolute',
    });
    container.appendChild(this.el);
  }

  public destroy(): void {
    this.el.remove();
  }
}
