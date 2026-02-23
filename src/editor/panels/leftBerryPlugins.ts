import { createPresetsTab } from '@/editor/presets/presetsTab';
import type { BerryTabPlugin } from '@/editor/core/tabRegistry';
import { AssetLibraryPlugin } from './assetLibraryTab';
import { AnimationPlugin } from './animationTab';
import { SpriteSlicerPlugin } from './spriteSlicerTab';
import { createUtilitiesTab } from './utilitiesTab';

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
      const empty = document.createElement('section');
      empty.className = 'irs-berry__plugin-empty-state';
      empty.innerHTML = '<h3 class="irs-berry__plugin-empty-title">Presets require a project</h3><p class="irs-berry__plugin-empty-description">Load a project to configure preset categories and Blockly hooks.</p>';
      const cta = document.createElement('button');
      cta.type = 'button';
      cta.className = 'irs-btn irs-btn--secondary irs-berry__plugin-empty-cta';
      cta.textContent = 'Open Tools';
      cta.style.minHeight = 'var(--irs-touch-target)';
      cta.style.minWidth = 'var(--irs-touch-target)';
      cta.addEventListener('click', () => context.openTab('tools'));
      empty.appendChild(cta);
      container.appendChild(empty);
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
