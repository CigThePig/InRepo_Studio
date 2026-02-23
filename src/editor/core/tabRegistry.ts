import type { AssetRegistry } from '@/editor/assets';
import type { EntityManager } from '@/editor/entities/entityManager';
import type { HistoryManager } from '@/editor/history';
import type { PresetConfigStore } from '@/editor/presets/presetConfigStore';
import type { PresetRegistry } from '@/runtime/presets/presetRegistry';
import type { EditorState } from '@/storage/hot';
import type { Scene } from '@/types';
import type { AuthManager } from '@/deploy';

/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Contracts and registry for plugin-driven left berry tabs.
 *
 * Defines:
 * - TabRegistry.leftBerryTabs — registered left berry tab plugins (type: ordered lookup)
 *
 * Canonical key set:
 * - Keys come from: BerryTabPlugin.id values at registration-time
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live at shell creation-time (recreate shell to apply changed registry)
 */

export interface TabController {
  destroy?: () => void;
  refresh?: () => void;
  openAnimation?: (animationId: string) => void;
  setInsertBlockFn?: (fn: ((blockType: string) => void) | null) => void;
  setOpenInBlocklyFn?: (fn: ((blockType: string) => void | Promise<void>) | null) => void;
}

export interface EditorPluginContext {
  readonly assetRegistry?: AssetRegistry;
  readonly assetLibraryEnabled: boolean;
  readonly assetUploadEnabled: boolean;
  readonly getEditorState?: () => EditorState | null;
  readonly getCurrentScene?: () => Scene | null;
  readonly entityManager?: EntityManager;
  readonly history?: HistoryManager;
  readonly presetRegistry?: PresetRegistry;
  readonly presetConfigStore?: PresetConfigStore;
  readonly authManager?: AuthManager;
  readonly openTab: (tabId: string) => void;
  readonly openAnimation?: (animationId: string) => void;
}

export interface BerryTabPlugin {
  id: string;
  label: string;
  icon: string;
  mount: (container: HTMLElement, context: EditorPluginContext) => TabController;
}

export class TabRegistry {
  private readonly leftBerryTabs = new Map<string, BerryTabPlugin>();

  registerLeftBerryTab(plugin: BerryTabPlugin): void {
    this.leftBerryTabs.set(plugin.id, plugin);
  }

  getLeftBerryTabs(): BerryTabPlugin[] {
    return Array.from(this.leftBerryTabs.values());
  }
}

export function createPluginEmptyState(config: {
  title: string;
  description: string;
  ctaLabel: string;
  onCtaClick: () => void;
}): HTMLElement {
  const root = document.createElement('section');
  root.className = 'irs-berry__plugin-empty-state';

  const title = document.createElement('h3');
  title.className = 'irs-berry__plugin-empty-title';
  title.textContent = config.title;

  const description = document.createElement('p');
  description.className = 'irs-berry__plugin-empty-description';
  description.textContent = config.description;

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'irs-btn irs-btn--secondary irs-berry__plugin-empty-cta';
  cta.textContent = config.ctaLabel;
  cta.style.minHeight = 'var(--irs-touch-target)';
  cta.style.minWidth = 'var(--irs-touch-target)';
  cta.addEventListener('click', config.onCtaClick);

  root.append(title, description, cta);
  return root;
}
