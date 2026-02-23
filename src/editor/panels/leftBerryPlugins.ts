import { createPresetsTab } from '@/editor/presets/presetsTab';
import type { BerryTabPlugin } from '@/editor/core/tabRegistry';
import { AssetLibraryPlugin } from './assetLibraryTab';
import { AnimationPlugin } from './animationTab';
import { SpriteSlicerPlugin } from './spriteSlicerTab';
import { createUtilitiesTab } from './utilitiesTab';
import { createEmptyState } from './leftBerry';

export const UtilitiesPlugin: BerryTabPlugin = {
  id: 'tools',
  label: 'Tools',
  icon: 'T',
  mount: (container, context) => createUtilitiesTab({
    container,
    authManager: context.authManager,
    assetRegistry: context.assetRegistry,
  }),
};

export const PresetsPlugin: BerryTabPlugin = {
  id: 'presets',
  label: 'Presets',
  icon: 'P',
  mount: (container, context) => {
    if (!context.presetRegistry || !context.presetConfigStore) {
      container.appendChild(createEmptyState({
        icon: '🧩',
        title: 'No Project Loaded',
        description: 'Load a project to configure presets and Blockly hooks.',
        ctaText: 'Open Tools',
        onCtaClick: () => context.openTab('tools'),
      }));
      return {};
    }

    return createPresetsTab({
      container,
      registry: context.presetRegistry,
      configStore: context.presetConfigStore,
    });
  },
};

export function createDefaultLeftBerryPlugins(): BerryTabPlugin[] {
  return [
    SpriteSlicerPlugin,
    AnimationPlugin,
    AssetLibraryPlugin,
    UtilitiesPlugin,
    PresetsPlugin,
  ];
}
