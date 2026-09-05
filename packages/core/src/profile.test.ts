import { afterEach, describe, expect, it, vi } from 'vitest';
import { ButtonCore } from './entities/ButtonCore';
import { RootLayerCore } from './entities/RootLayerCore';
import { CMP_TYPES } from './constants/basic';
import {
  exportProfile,
  parseProfileForest,
  setSecurityPolicy,
  validateProfile,
} from './runtime/profile';
import { Registry } from './singletons/Registry';

const registryKey = Symbol.for('omnipad.registry.instance');

function resetPolicy(): void {
  setSecurityPolicy({
    sanitizeObject: (value) => value,
    validateConfig: (_type, config) => config,
  });
}

function resetRegistry(): void {
  const registry = (globalThis as Record<PropertyKey, unknown>)[registryKey] as
    | Registry
    | undefined;
  registry?.clear();
  delete (globalThis as Record<PropertyKey, unknown>)[registryKey];
}

function profile(items: any[], gamepadMappings?: any[]) {
  return {
    meta: { name: 'Test Profile', version: '1.0.0', author: 'Tester' },
    items,
    gamepadMappings,
  };
}

describe('profile validation, parsing and export', () => {
  afterEach(() => {
    resetPolicy();
    resetRegistry();
    vi.restoreAllMocks();
  });

  it('normalises metadata and delegates object/config sanitation to the active policy', () => {
    const sanitizeObject = vi.fn((value) => value);
    const validateConfig = vi.fn((_type, config) => ({ ...config, validated: true }));
    setSecurityPolicy({ sanitizeObject, validateConfig });

    const result = validateProfile({
      items: [{ id: 'root', type: CMP_TYPES.ROOT_LAYER, config: { layout: {} } }],
    });

    expect(result.meta).toEqual({
      name: 'Untitled Profile',
      version: '1.0.0',
      author: 'Unknown',
      description: 'Enter text.',
    });
    expect(result.items[0].config).toEqual({ layout: {}, validated: true });
    expect(sanitizeObject).toHaveBeenCalledOnce();
    expect(validateConfig).toHaveBeenCalledWith(CMP_TYPES.ROOT_LAYER, { layout: {} });
  });

  it('rejects malformed, oversized, duplicate, and invalid gamepad profile data', () => {
    expect(() => validateProfile(null)).toThrow('Profile must be a valid JSON object');
    expect(() => validateProfile({ items: 'not an array' })).toThrow('Profile items exceed limit');
    expect(() =>
      validateProfile(
        profile([
          { id: 'x', type: 'a' },
          { id: 'x', type: 'b' },
        ]),
      ),
    ).toThrow('Duplicate Config ID');
    expect(() =>
      validateProfile(profile([{ id: 'x', type: 'a' }], [{ buttons: { A: 'missing' } }])),
    ).toThrow('Target ID "missing" not found');
    expect(() => parseProfileForest('{not json}')).toThrow('Failed to parse input string');
  });

  it('turns flat profiles into runtime trees while preserving global ids and references', () => {
    const parsed = parseProfileForest(
      profile(
        [
          { id: 'root', type: CMP_TYPES.ROOT_LAYER, config: { layout: {} } },
          {
            id: 'button',
            parentId: 'root',
            type: CMP_TYPES.BUTTON,
            config: { layout: {}, targetStageId: '$stage', dynamicWidgetId: 'root' },
          },
        ],
        [{ buttons: { A: 'button' }, dpad: '$shared' }],
      ),
    );

    const root = parsed.roots.root;
    const button = root.children?.[0]!;
    expect(root.uid).toMatch(/^root-layer-/);
    expect(button.uid).toMatch(/^button-/);
    expect(button.config).toMatchObject({ targetStageId: '$stage', dynamicWidgetId: root.uid });
    expect(parsed.runtimeGamepadMappings[0]).toEqual({
      buttons: { A: button.uid },
      dpad: '$shared',
    });
  });

  it('rejects unreachable loops and nesting beyond the configured safety limit', () => {
    expect(() =>
      parseProfileForest(
        profile([
          { id: 'a', parentId: 'b', type: 'a', config: {} },
          { id: 'b', parentId: 'a', type: 'b', config: {} },
        ]),
      ),
    ).toThrow('unreachable nodes');

    const deepItems = Array.from({ length: 12 }, (_, index) => ({
      id: `node-${index}`,
      parentId: index === 0 ? undefined : `node-${index - 1}`,
      type: 'node',
      config: {},
    }));
    expect(() => parseProfileForest(profile(deepItems))).toThrow('max depth');
  });

  it('exports registered runtime entities as a compact, round-trippable profile', () => {
    const root = new RootLayerCore('$root', {
      baseType: CMP_TYPES.ROOT_LAYER,
      layout: { left: { value: 0, unit: 'px' } as any },
    });
    const button = new ButtonCore('runtime-button', {
      baseType: CMP_TYPES.BUTTON,
      parentId: '$root',
      layout: { left: { value: 20, unit: '%' } as any },
      targetStageId: '$root',
      mapping: 'Enter',
    } as any);
    Registry.getInstance().register(root);
    Registry.getInstance().register(button);

    const exported = exportProfile(
      { name: 'Exported', version: '1.0.0' },
      ['$root'],
      [{ buttons: { A: 'runtime-button' }, dpad: '$root', leftStick: 'missing' }],
    );

    expect(exported.items).toHaveLength(2);
    expect(exported.items.find((item) => item.type === CMP_TYPES.ROOT_LAYER)).toMatchObject({
      id: '$root',
    });
    const exportedButton = exported.items.find((item) => item.type === CMP_TYPES.BUTTON)!;
    expect(exportedButton.id).toBe('node_1');
    expect(exportedButton.parentId).toBe('$root');
    expect(exportedButton.config?.targetStageId).toBe('$root');
    expect(exportedButton.config?.layout?.left).toBe('20%');
    expect(exported.gamepadMappings).toEqual([{ buttons: { A: 'node_1' }, dpad: '$root' }]);
  });
});
