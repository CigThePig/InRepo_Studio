/**
 * Bottom Panel Component
 *
 * Contains the toolbar (tool buttons) and tile picker.
 * Expandable/collapsible with tap on header.
 */

import type { Project } from '@/types';
import type { AuthManager } from '@/deploy';
import type { BrushSize, StorageQuotaInfo } from '@/storage/hot';
import { exportAllData, importAllData, checkStorageQuota } from '@/storage';
import type { TileImageCache } from '@/editor/canvas/tileCache';
import { createTilePicker, type TilePickerController, type TileSelection } from './tilePicker';
import { createDeployPanel, type DeployPanelController } from './deployPanel';

const LOG_PREFIX = '[BottomPanel]';

// --- Types ---

export type ToolType = 'select' | 'paint' | 'erase' | 'entity';

export type BottomPanelSection = 'tiles' | 'deploy' | 'data';

export interface BottomPanelState {
  expanded: boolean;
  currentTool: ToolType;
  selectedTile?: { category: string; index: number } | null;
  brushSize: BrushSize;
}

export interface BottomPanelController {
  /** Set the current tool */
  setCurrentTool(tool: ToolType): void;

  /** Get the current tool */
  getCurrentTool(): ToolType;

  /** Set expanded state */
  setExpanded(expanded: boolean): void;

  /** Get current expanded state */
  isExpanded(): boolean;

  /** Set which content section is active */
  setActivePanel(section: BottomPanelSection): void;

  /** Get which content section is active */
  getActivePanel(): BottomPanelSection;

  /** Get the selected tile */
  getSelectedTile(): TileSelection | null;

  /** Set the selected tile */
  setSelectedTile(category: string, index: number): void;

  /** Register callback for tool changes */
  onToolChange(callback: (tool: ToolType) => void): void;

  /** Register callback for expand/collapse toggle */
  onExpandToggle(callback: (expanded: boolean) => void): void;

  /** Register callback for tile selection */
  onTileSelect(callback: (selection: TileSelection) => void): void;

  /** Register callback for brush size changes */
  onBrushSizeChange(callback: (size: BrushSize) => void): void;

  /** Set brush size */
  setBrushSize(size: BrushSize): void;

  /** Get brush size */
  getBrushSize(): BrushSize;

  /** Register callback for undo */
  onUndo(callback: () => void): void;

  /** Register callback for redo */
  onRedo(callback: () => void): void;

  /** Update undo/redo button state */
  setUndoRedoState(canUndo: boolean, canRedo: boolean): void;

  /** Get the content container */
  getContentContainer(): HTMLElement;

  /** Clean up resources */
  destroy(): void;
}

export interface BottomPanelOptions {
  authManager?: AuthManager;
  /** Optional shared tile cache (from canvas) so the tile picker doesn't re-fetch assets. */
  tileCache?: TileImageCache;
  /** Optional cache-bust token for tile picker fallback loading. */
  cacheBust?: string | null;
}

// --- Tool Configuration ---

interface ToolConfig {
  icon: string;
  label: string;
}

const TOOLS: Record<ToolType, ToolConfig> = {
  select: { icon: '⬚', label: 'Select' },
  paint: { icon: '✎', label: 'Paint' },
  erase: { icon: '⌫', label: 'Erase' },
  entity: { icon: '◆', label: 'Entity' },
};

const TOOL_ORDER: ToolType[] = ['select', 'paint', 'erase', 'entity'];

// --- Styles ---

const STYLES = `
  .bottom-panel {
    display: flex;
    flex-direction: column;
    background: #16213e;
    border-top: 1px solid #0f3460;
    overflow: hidden;
    transition: max-height 0.2s ease-out;
  }

  .bottom-panel--collapsed {
    max-height: 60px;
  }

  .bottom-panel--expanded {
    max-height: 280px;
  }

  .bottom-panel__header {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 16px;
    min-height: 16px;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    padding: 4px 0;
  }

  .bottom-panel__chevron {
    color: #666;
    font-size: 10px;
  }

  .bottom-panel__toolbar {
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .tool-button {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
    border-radius: 8px;
    border: 2px solid transparent;
    background: #2a2a4e;
    color: #ccc;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }

  .tool-button:active {
    background: #3a3a6e;
  }

  .tool-button:disabled,
  .tool-button--disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .tool-button--active {
    border-color: #4a9eff;
    background: #3a3a6e;
    color: #fff;
  }

  .tool-button--deploy {
    min-width: 72px;
    font-size: 13px;
    font-weight: 600;
  }

  .tool-button--deploy-active {
    border-color: #4a9eff;
    background: #3a3a6e;
    color: #fff;
  }

  .tool-button--data {
    min-width: 60px;
    font-size: 13px;
    font-weight: 600;
  }

  .tool-button--data-active {
    border-color: #4a9eff;
    background: #3a3a6e;
    color: #fff;
  }

  .tool-button--data-action {
    font-size: 13px;
    font-weight: 600;
  }

  .bottom-panel__content {
    flex: 1;
    padding: 0 12px 12px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .bottom-panel__section {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .bottom-panel__section--hidden {
    display: none;
  }

  .bottom-panel__brush {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 4px 0 8px;
  }

  .bottom-panel__brush--hidden {
    display: none;
  }

  .bottom-panel__brush-label {
    color: #8fa3d8;
    font-size: 12px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .brush-size-button {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
    border-radius: 10px;
    border: 2px solid transparent;
    background: #1f2745;
    color: #cfd8ff;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }

  .brush-size-button:active {
    background: #2c3563;
  }

  .brush-size-button--active {
    border-color: #4a9eff;
    background: #2c3563;
    color: #fff;
  }

  .bottom-panel__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: #666;
    font-size: 13px;
    text-align: center;
    padding: 12px;
  }
`;

// --- Helper: Check if tool shows tile picker ---

function toolShowsTilePicker(tool: ToolType): boolean {
  return tool === 'paint' || tool === 'erase';
}

// --- Factory ---

export function createBottomPanel(
  container: HTMLElement,
  initialState: BottomPanelState,
  project?: Project,
  assetBasePath: string = '',
  options: BottomPanelOptions = {}
): BottomPanelController {
  const state = { ...initialState };
  let toolChangeCallback: ((tool: ToolType) => void) | null = null;
  let expandToggleCallback: ((expanded: boolean) => void) | null = null;
  let tileSelectCallback: ((selection: TileSelection) => void) | null = null;
  let brushSizeChangeCallback: ((size: BrushSize) => void) | null = null;
  let undoCallback: (() => void) | null = null;
  let redoCallback: (() => void) | null = null;
  let tilePickerController: TilePickerController | null = null;
  let deployPanelController: DeployPanelController | null = null;
  let activePanel: BottomPanelSection = 'tiles';

  // Inject styles
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  // Create DOM
  const panel = document.createElement('div');
  panel.className = `bottom-panel ${state.expanded ? 'bottom-panel--expanded' : 'bottom-panel--collapsed'}`;

  // Header (for expand/collapse)
  const header = document.createElement('div');
  header.className = 'bottom-panel__header';

  const chevron = document.createElement('span');
  chevron.className = 'bottom-panel__chevron';
  chevron.textContent = state.expanded ? '▼' : '▲';

  header.appendChild(chevron);

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'bottom-panel__toolbar';

  const undoButton = document.createElement('button');
  undoButton.className = 'tool-button tool-button--disabled';
  undoButton.textContent = '↶';
  undoButton.setAttribute('aria-label', 'Undo');
  undoButton.setAttribute('title', 'Undo');
  undoButton.disabled = true;

  const redoButton = document.createElement('button');
  redoButton.className = 'tool-button tool-button--disabled';
  redoButton.textContent = '↷';
  redoButton.setAttribute('aria-label', 'Redo');
  redoButton.setAttribute('title', 'Redo');
  redoButton.disabled = true;

  undoButton.addEventListener('click', () => {
    undoCallback?.();
  });

  redoButton.addEventListener('click', () => {
    redoCallback?.();
  });

  const toolButtons: Map<ToolType, HTMLButtonElement> = new Map();

  toolbar.appendChild(undoButton);
  toolbar.appendChild(redoButton);

  for (const toolType of TOOL_ORDER) {
    const config = TOOLS[toolType];
    const button = document.createElement('button');
    button.className = `tool-button ${state.currentTool === toolType ? 'tool-button--active' : ''}`;
    button.textContent = config.icon;
    button.setAttribute('aria-label', config.label);
    button.setAttribute('title', config.label);

    button.addEventListener('click', () => {
      if (state.currentTool === toolType) return;

      // Update state
      state.currentTool = toolType;

      // Update UI
      toolButtons.forEach((btn, type) => {
        btn.classList.toggle('tool-button--active', type === toolType);
      });

      // Show/hide tile picker based on tool
      if (activePanel === 'tiles') {
        tilePickerController?.setVisible(toolShowsTilePicker(toolType));
      }
      setActivePanel('tiles');
      updateBrushVisibility();

      // Notify
      toolChangeCallback?.(toolType);
      console.log(`${LOG_PREFIX} Tool changed to "${toolType}"`);
    });

    toolButtons.set(toolType, button);
    toolbar.appendChild(button);
  }

  const deployButton = document.createElement('button');
  deployButton.className = 'tool-button tool-button--deploy';
  deployButton.textContent = 'Deploy';
  deployButton.setAttribute('aria-label', 'Deploy');
  deployButton.setAttribute('title', 'Deploy');

  deployButton.addEventListener('click', () => {
    if (!options.authManager) {
      console.warn(`${LOG_PREFIX} Auth manager not available for deploy panel`);
      return;
    }
    setActivePanel('deploy');
  });

  toolbar.appendChild(deployButton);

  const dataButton = document.createElement('button');
  dataButton.className = 'tool-button tool-button--data';
  dataButton.textContent = 'Data';
  dataButton.setAttribute('aria-label', 'Data Tools');
  dataButton.setAttribute('title', 'Data Tools');

  dataButton.addEventListener('click', () => {
    setActivePanel('data');
  });

  toolbar.appendChild(dataButton);

  // Content area (for tile picker)
  const content = document.createElement('div');
  content.className = 'bottom-panel__content';

  const brushSizeRow = document.createElement('div');
  brushSizeRow.className = 'bottom-panel__brush';

  const brushLabel = document.createElement('span');
  brushLabel.className = 'bottom-panel__brush-label';
  brushLabel.textContent = 'Brush';

  const brushButtons: Map<BrushSize, HTMLButtonElement> = new Map();
  const brushSizes: BrushSize[] = [1, 2, 3];

  const brushButtonGroup = document.createElement('div');
  brushButtonGroup.style.display = 'flex';
  brushButtonGroup.style.gap = '8px';

  for (const size of brushSizes) {
    const button = document.createElement('button');
    button.className = `brush-size-button ${state.brushSize === size ? 'brush-size-button--active' : ''}`;
    button.textContent = String(size);
    button.setAttribute('aria-label', `Brush size ${size}`);
    button.setAttribute('title', `Brush size ${size}`);

    button.addEventListener('click', () => {
      if (state.brushSize === size) return;
      state.brushSize = size;
      brushButtons.forEach((btn, value) => {
        btn.classList.toggle('brush-size-button--active', value === size);
      });
      brushSizeChangeCallback?.(size);
      console.log(`${LOG_PREFIX} Brush size changed to ${size}`);
    });

    brushButtons.set(size, button);
    brushButtonGroup.appendChild(button);
  }

  brushSizeRow.appendChild(brushLabel);
  brushSizeRow.appendChild(brushButtonGroup);

  const tilePickerSection = document.createElement('div');
  tilePickerSection.className = 'bottom-panel__section';
  tilePickerSection.appendChild(brushSizeRow);
  content.appendChild(tilePickerSection);

  const deploySection = document.createElement('div');
  deploySection.className = 'bottom-panel__section bottom-panel__section--hidden';
  content.appendChild(deploySection);

  const dataSection = document.createElement('div');
  dataSection.className = 'bottom-panel__section bottom-panel__section--hidden';
  content.appendChild(dataSection);

  // --- Data Tools panel (Track 2: export/import + quota warning) ---
  const dataTitle = document.createElement('div');
  dataTitle.style.cssText = 'font-size: 13px; font-weight: 700; color: #e6e6e6; margin-bottom: 8px;';
  dataTitle.textContent = 'Data Tools';

  const dataDesc = document.createElement('div');
  dataDesc.style.cssText = 'font-size: 12px; color: #aab0d4; margin-bottom: 10px; line-height: 1.35;';
  dataDesc.textContent = 'Export or import hot storage data (projects, scenes, editor state).';

  const dataActions = document.createElement('div');
  dataActions.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px;';

  const dataStatus = document.createElement('div');
  dataStatus.style.cssText = 'font-size: 12px; color: #aab0d4; margin-top: 10px;';
  dataStatus.textContent = '';

  function formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit++;
    }
    return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
  }

  function downloadJson(filename: string, data: unknown): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const btnCheck = document.createElement('button');
  btnCheck.className = 'tool-button tool-button--data-action';
  btnCheck.textContent = 'Check Storage';
  btnCheck.addEventListener('click', async () => {
    try {
      dataStatus.textContent = 'Checking storage...';
      const info: StorageQuotaInfo | null = await checkStorageQuota();
      if (!info) {
        dataStatus.textContent = 'Storage estimate not available in this browser.';
        return;
      }
      const used = formatBytes(info.used);
      const quota = formatBytes(info.quota);
      dataStatus.textContent = `Used ${used} of ${quota} (${info.percentUsed.toFixed(1)}%).` + (info.isNearLimit ? ' ⚠ Near limit.' : '');
    } catch (e) {
      console.error(e);
      dataStatus.textContent = 'Storage check failed (see console).';
    }
  });

  const btnExport = document.createElement('button');
  btnExport.className = 'tool-button tool-button--data-action';
  btnExport.textContent = 'Export JSON';
  btnExport.addEventListener('click', async () => {
    try {
      dataStatus.textContent = 'Exporting...';
      const data = await exportAllData();
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      downloadJson(`inrepo-export-${ts}.json`, data);
      dataStatus.textContent = 'Export complete.';
    } catch (e) {
      console.error(e);
      dataStatus.textContent = 'Export failed (see console).';
    }
  });

  const btnCopy = document.createElement('button');
  btnCopy.className = 'tool-button tool-button--data-action';
  btnCopy.textContent = 'Copy JSON';
  btnCopy.addEventListener('click', async () => {
    try {
      dataStatus.textContent = 'Preparing JSON...';
      const data = await exportAllData();
      const text = JSON.stringify(data, null, 2);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        dataStatus.textContent = 'Copied to clipboard.';
        return;
      }
      window.prompt('Copy the JSON below:', text);
      dataStatus.textContent = 'Copy prompt opened.';
    } catch (e) {
      console.error(e);
      dataStatus.textContent = 'Copy failed (see console).';
    }
  });

  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = 'application/json,.json';
  importInput.style.display = 'none';

  const btnImport = document.createElement('button');
  btnImport.className = 'tool-button tool-button--data-action';
  btnImport.textContent = 'Import JSON';
  btnImport.addEventListener('click', () => {
    importInput.value = '';
    importInput.click();
  });

  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      dataStatus.textContent = 'Importing...';
      const text = await file.text();
      const parsed = JSON.parse(text);
      await importAllData(parsed);
      dataStatus.textContent = 'Import complete. Reloading...';
      window.location.reload();
    } catch (e) {
      console.error(e);
      dataStatus.textContent = 'Import failed (invalid JSON or storage error).';
    }
  });

  dataActions.appendChild(btnCheck);
  dataActions.appendChild(btnExport);
  dataActions.appendChild(btnCopy);
  dataActions.appendChild(btnImport);

  dataSection.appendChild(dataTitle);
  dataSection.appendChild(dataDesc);
  dataSection.appendChild(dataActions);
  dataSection.appendChild(importInput);
  dataSection.appendChild(dataStatus);


  // Create tile picker if project has tile categories
  if (project && project.tileCategories.length > 0) {
    tilePickerController = createTilePicker(
      tilePickerSection,
      project.tileCategories,
      assetBasePath,
      state.selectedTile
        ? { category: state.selectedTile.category, tileIndex: state.selectedTile.index }
        : undefined,
      {
        tileCache: options.tileCache,
        cacheBust: options.cacheBust,
      }
    );

    // Wire up tile selection callback
    tilePickerController.onTileSelect((selection) => {
      tileSelectCallback?.(selection);
    });

    // Set initial visibility based on current tool
    tilePickerController.setVisible(toolShowsTilePicker(state.currentTool));
  } else {
    // No project or no tile categories - show placeholder
    const placeholder = document.createElement('div');
    placeholder.className = 'bottom-panel__placeholder';
    placeholder.textContent = project ? 'No tile categories defined' : 'No project loaded';
    tilePickerSection.appendChild(placeholder);
  }

  if (options.authManager) {
    deployPanelController = createDeployPanel({
      container: deploySection,
      authManager: options.authManager,
    });
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'bottom-panel__placeholder';
    placeholder.textContent = 'Deploy panel unavailable';
    deploySection.appendChild(placeholder);
  }

  // Toggle expand/collapse
  header.addEventListener('click', () => {
    state.expanded = !state.expanded;
    updateExpandedState();
    expandToggleCallback?.(state.expanded);
    console.log(`${LOG_PREFIX} Panel ${state.expanded ? 'expanded' : 'collapsed'}`);
  });

  function updateExpandedState(): void {
    panel.classList.toggle('bottom-panel--expanded', state.expanded);
    panel.classList.toggle('bottom-panel--collapsed', !state.expanded);
    chevron.textContent = state.expanded ? '▼' : '▲';
  }

  function setActivePanel(panelName: BottomPanelSection): void {
    activePanel = panelName;
    const isTiles = activePanel === 'tiles';
    const isDeploy = activePanel === 'deploy';
    const isData = activePanel === 'data';

    tilePickerSection.classList.toggle('bottom-panel__section--hidden', !isTiles);
    deploySection.classList.toggle('bottom-panel__section--hidden', !isDeploy);
    dataSection.classList.toggle('bottom-panel__section--hidden', !isData);

    deployButton.classList.toggle('tool-button--deploy-active', isDeploy);
    dataButton.classList.toggle('tool-button--data-active', isData);

    if (!isTiles) {
      tilePickerController?.setVisible(false);
    } else {
      tilePickerController?.setVisible(toolShowsTilePicker(state.currentTool));
    }

    updateBrushVisibility();
  }

  function updateBrushVisibility(): void {
    const shouldShow = activePanel === 'tiles' && state.currentTool === 'erase';
    brushSizeRow.classList.toggle('bottom-panel__brush--hidden', !shouldShow);
  }

  panel.appendChild(header);
  panel.appendChild(toolbar);
  panel.appendChild(content);
  container.appendChild(panel);

  updateBrushVisibility();

  console.log(`${LOG_PREFIX} Bottom panel created`);

  // --- Controller ---

  const controller: BottomPanelController = {
    setCurrentTool(tool: ToolType) {
      if (state.currentTool === tool) return;

      state.currentTool = tool;
      toolButtons.forEach((btn, type) => {
        btn.classList.toggle('tool-button--active', type === tool);
      });

      // Show/hide tile picker based on tool
      if (activePanel === 'tiles') {
        tilePickerController?.setVisible(toolShowsTilePicker(tool));
      }
      updateBrushVisibility();
    },

    getCurrentTool() {
      return state.currentTool;
    },

    setExpanded(expanded: boolean) {
      if (state.expanded === expanded) return;

      state.expanded = expanded;
      updateExpandedState();
    },

    isExpanded() {
      return state.expanded;
    },

    setActivePanel(section: BottomPanelSection) {
      setActivePanel(section);
    },

    getActivePanel() {
      return activePanel;
    },

    getSelectedTile() {
      return tilePickerController?.getSelectedTile() ?? null;
    },

    setSelectedTile(category: string, index: number) {
      tilePickerController?.setSelectedCategory(category);
      tilePickerController?.setSelectedTile(index);
    },

    onToolChange(callback) {
      toolChangeCallback = callback;
    },

    onExpandToggle(callback) {
      expandToggleCallback = callback;
    },

    onTileSelect(callback) {
      tileSelectCallback = callback;
    },

    onBrushSizeChange(callback) {
      brushSizeChangeCallback = callback;
    },

    setBrushSize(size: BrushSize) {
      if (state.brushSize === size) return;
      state.brushSize = size;
      brushButtons.forEach((btn, value) => {
        btn.classList.toggle('brush-size-button--active', value === size);
      });
    },

    getBrushSize() {
      return state.brushSize;
    },

    onUndo(callback) {
      undoCallback = callback;
    },

    onRedo(callback) {
      redoCallback = callback;
    },

    setUndoRedoState(canUndo: boolean, canRedo: boolean) {
      undoButton.disabled = !canUndo;
      redoButton.disabled = !canRedo;
      undoButton.classList.toggle('tool-button--disabled', !canUndo);
      redoButton.classList.toggle('tool-button--disabled', !canRedo);
    },

    getContentContainer() {
      return content;
    },

    destroy() {
      tilePickerController?.destroy();
      deployPanelController?.destroy();
      container.removeChild(panel);
      document.head.removeChild(styleEl);
      console.log(`${LOG_PREFIX} Bottom panel destroyed`);
    },
  };

  return controller;
}
