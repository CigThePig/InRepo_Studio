/**
 * Blocks Palette — categorized block browser for the right berry in Blockly Mode.
 *
 * Renders a searchable, categorized list of Blockly blocks.
 * Users browse categories, search by label/keyword, and tap to insert blocks.
 *
 * Mobile-first: touch targets >= 44px, gesture isolation, smooth scroll.
 */

import type { BlockRegistry } from '@/runtime/blockly/blockRegistry';
import type { BlockPackEntry } from '@/runtime/blockly/schemaToBlocks';
import type { BlocklyWorkspaceController } from './blocklyWorkspace';
import type { PresetSavedConfig } from '@/types/preset';
import {
  PALETTE_CATEGORIES,
  getCategoryBlocks,
  isCategoryEnabled,
  isCategoryVisible,
} from './paletteCategories';
import { BLOCKS_PALETTE_STYLES } from './blocksPaletteStyles';
import { createSearchInput } from '@/shared/ui/searchInput';

const LOG_PREFIX = '[BlocksPalette]';

// --- Types ---

export interface BlocksPaletteController {
  setLogicTarget(target: 'game' | 'map' | 'preset' | null): void;
  refresh(): void;
  destroy(): void;
}

export interface BlocksPaletteDeps {
  registry: BlockRegistry;
  workspace: BlocklyWorkspaceController;
  getPresetConfig: () => PresetSavedConfig | null;
  onEnablePreset?: (categoryId: string) => void;
}

// --- Factory ---

export function createBlocksPalette(
  container: HTMLElement,
  deps: BlocksPaletteDeps,
): BlocksPaletteController {
  const { registry, workspace, getPresetConfig, onEnablePreset } = deps;

  // Inject styles
  if (!document.getElementById('blocks-palette-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'blocks-palette-styles';
    styleEl.textContent = BLOCKS_PALETTE_STYLES;
    document.head.appendChild(styleEl);
  }

  // --- State ---

  let logicTarget: 'game' | 'map' | 'preset' | null = null;
  let searchQuery = '';
  const expandedCategories = new Set<string>();
  const showAdvanced: Record<string, boolean> = {};

  // Expand all non-defaultCollapsed categories initially
  for (const cat of PALETTE_CATEGORIES) {
    if (!cat.defaultCollapsed) {
      expandedCategories.add(cat.id);
    }
  }

  // --- DOM ---

  const root = document.createElement('div');
  root.className = 'blocks-palette';

  // Search bar
  const searchSection = document.createElement('div');
  searchSection.className = 'blocks-palette__search';

  const search = createSearchInput({
    placeholder: 'Search blocks...',
    ariaLabel: 'Search blocks',
    className: 'blocks-palette__search-wrap',
    onInput: (value) => {
      searchQuery = value;
      render();
    },
    onClear: () => {
      searchQuery = '';
      render();
      search.input.focus();
    },
  });
  searchSection.appendChild(search.root);

  // Block list
  const listContainer = document.createElement('div');
  listContainer.className = 'blocks-palette__list';

  root.appendChild(searchSection);
  root.appendChild(listContainer);
  container.appendChild(root);

  // Gesture isolation for palette scroll
  listContainer.addEventListener('touchstart', (e) => { e.stopPropagation(); }, { passive: true });
  listContainer.addEventListener('touchmove', (e) => { e.stopPropagation(); }, { passive: true });

  // --- Rendering ---

  function render(): void {
    listContainer.innerHTML = '';

    if (searchQuery.trim()) {
      renderSearchResults();
    } else {
      renderCategories();
    }
  }

  function renderCategories(): void {
    const targetType = logicTarget;
    const isValidBlock = (entry: BlockPackEntry): boolean => {
      const message = getDisplayLabel(entry);
      if (!message) return false;
      return !!registry.getByType(entry.definition.type);
    };

    for (const catDef of PALETTE_CATEGORIES) {
      if (!isCategoryVisible(catDef, targetType)) continue;

      const section = document.createElement('div');
      section.className = 'blocks-palette__category';

      const isExpanded = expandedCategories.has(catDef.id);
      const enabled = isCategoryEnabled(catDef, getPresetConfig());
      const blocks = enabled
        ? getCategoryBlocks(registry, catDef.categoryId ?? catDef.id, targetType, showAdvanced[catDef.id] ?? false, isValidBlock)
        : [];
      const allBlocks = enabled
        ? getCategoryBlocks(registry, catDef.categoryId ?? catDef.id, targetType, true, isValidBlock)
        : [];
      const hasAdvanced = allBlocks.some((b) => b.advanced);

      // Header
      const header = document.createElement('button');
      header.type = 'button';
      header.className = 'blocks-palette__cat-header';

      const icon = document.createElement('div');
      icon.className = 'blocks-palette__cat-icon';
      icon.textContent = catDef.icon;

      const label = document.createElement('span');
      label.className = 'blocks-palette__cat-label';
      label.textContent = catDef.label;

      const count = document.createElement('span');
      count.className = 'blocks-palette__cat-count';
      count.textContent = enabled ? String(blocks.length) : '';

      const chevron = document.createElement('span');
      chevron.className = 'blocks-palette__cat-chevron';
      if (isExpanded) chevron.classList.add('blocks-palette__cat-chevron--expanded');
      chevron.textContent = '\u203a';

      header.appendChild(icon);
      header.appendChild(label);
      header.appendChild(count);
      header.appendChild(chevron);

      // Body
      const body = document.createElement('div');
      body.className = 'blocks-palette__cat-body';
      if (isExpanded) body.classList.add('blocks-palette__cat-body--expanded');

      if (!enabled && catDef.presetDriven) {
        // Disabled preset placeholder
        const placeholder = document.createElement('div');
        placeholder.className = 'blocks-palette__disabled-placeholder';
        placeholder.textContent = `Enable ${catDef.label} preset to use these blocks.`;

        const enableBtn = document.createElement('button');
        enableBtn.type = 'button';
        enableBtn.className = 'irs-btn irs-btn--primary';
        enableBtn.textContent = 'Enable';
        enableBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onEnablePreset) {
            onEnablePreset(catDef.categoryId ?? catDef.id);
          }
          render();
        });

        placeholder.appendChild(document.createElement('br'));
        placeholder.appendChild(enableBtn);
        body.appendChild(placeholder);
      } else if (enabled) {
        // Block items
        for (const entry of blocks) {
          const blockItem = createBlockItem(entry);
          if (blockItem) {
            body.appendChild(blockItem);
          }
        }

        // Advanced toggle
        if (hasAdvanced && !showAdvanced[catDef.id]) {
          const advBtn = document.createElement('button');
          advBtn.type = 'button';
          advBtn.className = 'blocks-palette__advanced-toggle';
          advBtn.textContent = 'Show advanced';
          advBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showAdvanced[catDef.id] = true;
            render();
          });
          body.appendChild(advBtn);
        } else if (hasAdvanced && showAdvanced[catDef.id]) {
          const advBtn = document.createElement('button');
          advBtn.type = 'button';
          advBtn.className = 'blocks-palette__advanced-toggle';
          advBtn.textContent = 'Hide advanced';
          advBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showAdvanced[catDef.id] = false;
            render();
          });
          body.appendChild(advBtn);
        }
      }

      header.addEventListener('click', () => {
        if (expandedCategories.has(catDef.id)) {
          expandedCategories.delete(catDef.id);
        } else {
          expandedCategories.add(catDef.id);
        }
        render();
      });

      section.appendChild(header);
      section.appendChild(body);
      listContainer.appendChild(section);
    }
  }

  function renderSearchResults(): void {
    const results = registry.search(searchQuery, logicTarget ?? undefined)
      .filter((entry) => !!getDisplayLabel(entry));

    if (results.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'blocks-palette__empty-search';
      empty.textContent = "No blocks found. Try searching for 'jump', 'move', or 'event'.";
      listContainer.appendChild(empty);
      return;
    }

    const resultsCount = document.createElement('div');
    resultsCount.className = 'blocks-palette__results-count';
    resultsCount.textContent = `Found ${results.length} block${results.length === 1 ? '' : 's'}`;
    listContainer.appendChild(resultsCount);

    // Group by category
    const grouped = new Map<string, BlockPackEntry[]>();
    for (const entry of results) {
      const catId = entry.dependency.requiresCategoryEnabled;
      const list = grouped.get(catId) ?? [];
      list.push(entry);
      grouped.set(catId, list);
    }

    for (const [catId, entries] of grouped) {
      const catDef = PALETTE_CATEGORIES.find(
        (c) => c.id === catId || c.categoryId === catId,
      );
      const catLabel = catDef?.label ?? catId;

      const section = document.createElement('div');
      section.className = 'blocks-palette__category';

      const header = document.createElement('div');
      header.className = 'blocks-palette__cat-header';
      header.style.cursor = 'default';

      const icon = document.createElement('div');
      icon.className = 'blocks-palette__cat-icon';
      icon.textContent = catDef?.icon ?? '?';

      const label = document.createElement('span');
      label.className = 'blocks-palette__cat-label';
      label.textContent = catLabel;

      const count = document.createElement('span');
      count.className = 'blocks-palette__cat-count';
      count.textContent = String(entries.length);

      header.appendChild(icon);
      header.appendChild(label);
      header.appendChild(count);

      const body = document.createElement('div');
      body.className = 'blocks-palette__cat-body blocks-palette__cat-body--expanded';

      for (const entry of entries) {
        const item = createBlockItem(entry, true);
        if (item) {
          body.appendChild(item);
        }
      }

      section.appendChild(header);
      section.appendChild(body);
      listContainer.appendChild(section);
    }
  }

  function getDisplayLabel(entry: BlockPackEntry): string {
    return (entry.definition.message0 ?? '').replace(/%\d+/g, '').trim();
  }

  function createBlockItem(entry: BlockPackEntry, showCatTag = false): HTMLElement | null {
    const displayLabel = getDisplayLabel(entry);
    if (!displayLabel) {
      return null;
    }

    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'blocks-palette__block-item';

    const dot = document.createElement('div');
    dot.className = `blocks-palette__block-dot blocks-palette__block-dot--${entry.blockFamily}`;

    const label = document.createElement('span');
    label.className = 'blocks-palette__block-label';
    // Strip emoji prefix from message0 for display
    label.textContent = displayLabel;

    item.appendChild(dot);
    item.appendChild(label);

    if (showCatTag) {
      const catDef = PALETTE_CATEGORIES.find(
        (c) => c.id === entry.dependency.requiresCategoryEnabled || c.categoryId === entry.dependency.requiresCategoryEnabled,
      );
      if (catDef) {
        const tag = document.createElement('span');
        tag.className = 'blocks-palette__cat-tag';
        tag.textContent = catDef.label;
        item.appendChild(tag);
      }
    }

    const depCatId = entry.dependency.requiresCategoryEnabled;
    if (depCatId) {
      const depEnabled = getPresetConfig()?.categories[depCatId]?.enabled ?? false;
      if (!depEnabled) {
        const depDef = PALETTE_CATEGORIES.find((c) => c.id === depCatId || c.categoryId === depCatId);
        const requires = document.createElement('span');
        requires.className = 'blocks-palette__cat-tag';
        requires.textContent = `Requires: ${depDef?.label ?? depCatId}`;
        item.appendChild(requires);
      }
    }

    item.addEventListener('click', () => {
      handleBlockInsert(entry);
    });

    return item;
  }

  function handleBlockInsert(entry: BlockPackEntry): void {
    const presetConfig = getPresetConfig();
    const dep = entry.dependency;

    // Check if required preset is enabled
    if (dep.requiresCategoryEnabled) {
      const catConfig = presetConfig?.categories[dep.requiresCategoryEnabled];
      const isEnabled = catConfig?.enabled ?? false;

      if (!isEnabled) {
        // Show dependency prompt
        showDependencyPrompt(entry);
        return;
      }
    }

    // Insert the block
    workspace.insertBlock(entry.definition.type);
    console.log(`${LOG_PREFIX} Inserted block: ${entry.definition.type}`);
  }

  function showDependencyPrompt(entry: BlockPackEntry): void {
    const catId = entry.dependency.requiresCategoryEnabled;
    if (!catId) return;
    const catDef = PALETTE_CATEGORIES.find(
      (c) => c.id === catId || c.categoryId === catId,
    );
    const catLabel = catDef?.label ?? catId;

    // Find the block item in the DOM and show a prompt after it
    const items = listContainer.querySelectorAll('.blocks-palette__block-item');
    for (const item of items) {
      const labelEl = item.querySelector('.blocks-palette__block-label');
      if (labelEl && labelEl.textContent === getDisplayLabel(entry)) {
        // Remove any existing prompt
        const existing = item.parentElement?.querySelector('.blocks-palette__dep-prompt');
        if (existing) existing.remove();

        const prompt = document.createElement('div');
        prompt.className = 'blocks-palette__dep-prompt blocks-palette__dep-prompt--visible';

        const text = document.createElement('span');
        text.textContent = `Requires ${catLabel} preset`;

        const enableBtn = document.createElement('button');
        enableBtn.type = 'button';
        enableBtn.className = 'irs-btn irs-btn--primary';
        enableBtn.textContent = 'Enable';
        enableBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onEnablePreset) {
            onEnablePreset(catId);
          }
          text.textContent = `${catLabel} enabled`;
          enableBtn.disabled = true;
          window.setTimeout(() => {
            prompt.remove();
            render();
          }, 350);
        });

        prompt.appendChild(text);
        prompt.appendChild(enableBtn);
        item.parentElement?.insertBefore(prompt, item.nextSibling);
        break;
      }
    }
  }

  // --- Initial render ---
  render();

  console.log(`${LOG_PREFIX} Blocks palette created`);

  // --- Controller ---

  return {
    setLogicTarget(target) {
      logicTarget = target;
      render();
    },
    refresh() {
      render();
    },
    destroy() {
      search.destroy();
      root.remove();
      console.log(`${LOG_PREFIX} Palette destroyed`);
    },
  };
}
