/**
 * Bottom Panel Component
 *
 * Holds the persistent selection button, context actions, and utilities.
 */

import type { AuthManager } from '@/deploy';
import type { StorageQuotaInfo } from '@/storage/hot';
import { exportAllData, importAllData, checkStorageQuota } from '@/storage';
import { createDeployPanel, type DeployPanelController } from './deployPanel';

const LOG_PREFIX = '[BottomPanel]';

// --- Types ---

export type ToolType = 'select' | 'paint' | 'erase' | 'entity';

export type BottomPanelSection = 'deploy' | 'data';

export interface BottomPanelState {
  expanded: boolean;
  currentTool: ToolType;
}

export interface BottomPanelController {
  /** Set the current tool */
  setCurrentTool(tool: ToolType): void;

  /** Get the current tool */
  getCurrentTool(): ToolType;

  /** Update tool context (layer + availability) */
  setToolContext(context: { layerLabel: string; paintEnabled: boolean; eraseEnabled: boolean; isLocked: boolean }): void;

  /** Set expanded state */
  setExpanded(expanded: boolean): void;

  /** Get current expanded state */
  isExpanded(): boolean;

  /** Set which content section is active */
  setActivePanel(section: BottomPanelSection): void;

  /** Get which content section is active */
  getActivePanel(): BottomPanelSection;

  /** Register callback for expand/collapse toggle */
  onExpandToggle(callback: (expanded: boolean) => void): void;

  /** Register callback for selection button */
  onSelectionClick(callback: () => void): void;

  /** Register callback for paint button */
  onPaintClick(callback: () => void): void;

  /** Register callback for erase button */
  onEraseClick(callback: () => void): void;

  /** Toggle selection button active state */
  setSelectionActive(active: boolean): void;

  /** Get the content container */
  getContentContainer(): HTMLElement;

  /** Get the context strip container */
  getContextStripContainer(): HTMLElement;

  /** Clean up resources */
  destroy(): void;
}

export interface BottomPanelOptions {
  authManager?: AuthManager;
}

// --- Styles ---

const STYLES = `
  .bottom-panel {
    display: flex;
    flex-direction: column;
    background: #0d1220;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    overflow: hidden;
    transition: max-height 0.25s ease-out;
  }

  .bottom-panel--collapsed {
    max-height: 80px;
  }

  .bottom-panel--collapsed .bottom-panel__content {
    display: none;
  }

  .bottom-panel--expanded {
    max-height: 320px;
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
  }

  .bottom-panel__chevron {
    color: rgba(255, 255, 255, 0.3);
    font-size: 8px;
    transition: transform 0.2s ease;
  }

  .bottom-panel--expanded .bottom-panel__chevron {
    transform: rotate(180deg);
  }

  .bottom-panel__context-row {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    padding: 6px 12px 8px;
  }

  .bottom-panel__tool-group {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.04);
    align-self: flex-start;
  }

  .bottom-panel__tool-button {
    height: 44px;
    min-width: 44px;
    padding: 0 12px;
    border-radius: 10px;
    border: none;
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.8);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    -webkit-tap-highlight-color: transparent;
    transition: all 0.15s ease;
    text-align: left;
  }

  .bottom-panel__tool-button:active {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(0.97);
  }

  .bottom-panel__tool-button--active {
    background: rgba(74, 158, 255, 0.2);
    color: #fff;
    box-shadow: inset 0 0 0 1px rgba(74, 158, 255, 0.4);
  }

  .bottom-panel__tool-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .bottom-panel__tool-icon {
    font-size: 16px;
    line-height: 1;
  }

  .bottom-panel__tool-labels {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
  }

  .bottom-panel__tool-title {
    font-size: 12px;
    font-weight: 600;
  }

  .bottom-panel__tool-sublabel {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.55);
    font-weight: 500;
  }

  .bottom-panel__tool-button--locked .bottom-panel__tool-sublabel::after {
    content: ' • Locked';
    color: rgba(255, 179, 86, 0.9);
  }

  .bottom-panel__context-strip {
    flex: 1;
    min-width: 0;
    width: 100%;
  }

  .bottom-panel__content {
    flex: 1;
    padding: 0 12px 12px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .bottom-panel__utilities {
    display: flex;
    gap: 6px;
    padding: 8px 0;
  }

  .bottom-panel__utility-button {
    height: 40px;
    padding: 0 16px;
    border-radius: 8px;
    border: none;
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.6);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: all 0.15s ease;
  }

  .bottom-panel__utility-button:active {
    background: rgba(255, 255, 255, 0.1);
  }

  .bottom-panel__utility-button--active {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    font-weight: 600;
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

  .bottom-panel__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: rgba(255, 255, 255, 0.4);
    font-size: 13px;
    text-align: center;
    padding: 16px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px dashed rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    margin-top: 8px;
  }

  .bottom-panel__data-action {
    height: 40px;
    padding: 0 14px;
    font-size: 13px;
    font-weight: 500;
    border-radius: 8px;
    border: none;
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: all 0.15s ease;
  }

  .bottom-panel__data-action:active {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(0.98);
  }
`;

// --- Factory ---

export function createBottomPanel(
  container: HTMLElement,
  initialState: BottomPanelState,
  options: BottomPanelOptions = {}
): BottomPanelController {
  const state = { ...initialState };
  let expandToggleCallback: ((expanded: boolean) => void) | null = null;
  let selectionClickCallback: (() => void) | null = null;
  let paintClickCallback: (() => void) | null = null;
  let eraseClickCallback: (() => void) | null = null;
  let deployPanelController: DeployPanelController | null = null;
  let activePanel: BottomPanelSection = 'data';
  let toolContext = {
    layerLabel: 'Ground',
    paintEnabled: true,
    eraseEnabled: true,
    isLocked: false,
  };

  // Ensure styles are only added once
  if (!document.getElementById('bottom-panel-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'bottom-panel-styles';
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);
  }

  // Create DOM
  const panel = document.createElement('div');
  panel.className = `bottom-panel ${state.expanded ? 'bottom-panel--expanded' : 'bottom-panel--collapsed'}`;

  // Header (for expand/collapse)
  const header = document.createElement('div');
  header.className = 'bottom-panel__header';

  const chevron = document.createElement('span');
  chevron.className = 'bottom-panel__chevron';
  chevron.textContent = '▲';

  header.appendChild(chevron);

  const contextRow = document.createElement('div');
  contextRow.className = 'bottom-panel__context-row';

  const toolGroup = document.createElement('div');
  toolGroup.className = 'bottom-panel__tool-group';

  const selectionButton = document.createElement('button');
  selectionButton.type = 'button';
  selectionButton.className = 'bottom-panel__tool-button';
  selectionButton.setAttribute('aria-label', 'Selection tool');
  selectionButton.setAttribute('title', 'Selection tool');
  selectionButton.innerHTML = `
    <span class="bottom-panel__tool-icon">⬚</span>
    <span class="bottom-panel__tool-title">Select</span>
  `;

  selectionButton.addEventListener('click', () => {
    selectionClickCallback?.();
  });

  const paintButton = document.createElement('button');
  paintButton.type = 'button';
  paintButton.className = 'bottom-panel__tool-button';
  paintButton.setAttribute('aria-label', 'Paint tool');
  paintButton.setAttribute('title', 'Paint tool');
  paintButton.innerHTML = `
    <span class="bottom-panel__tool-icon">✎</span>
    <span class="bottom-panel__tool-labels">
      <span class="bottom-panel__tool-title">Paint</span>
      <span class="bottom-panel__tool-sublabel"></span>
    </span>
  `;

  paintButton.addEventListener('click', () => {
    paintClickCallback?.();
  });

  const eraseButton = document.createElement('button');
  eraseButton.type = 'button';
  eraseButton.className = 'bottom-panel__tool-button';
  eraseButton.setAttribute('aria-label', 'Erase tool');
  eraseButton.setAttribute('title', 'Erase tool');
  eraseButton.innerHTML = `
    <span class="bottom-panel__tool-icon">⌫</span>
    <span class="bottom-panel__tool-labels">
      <span class="bottom-panel__tool-title">Erase</span>
      <span class="bottom-panel__tool-sublabel"></span>
    </span>
  `;

  eraseButton.addEventListener('click', () => {
    eraseClickCallback?.();
  });

  toolGroup.appendChild(selectionButton);
  toolGroup.appendChild(paintButton);
  toolGroup.appendChild(eraseButton);

  const contextStripContainer = document.createElement('div');
  contextStripContainer.className = 'bottom-panel__context-strip';

  contextRow.appendChild(toolGroup);
  contextRow.appendChild(contextStripContainer);

  // Content area (for utilities)
  const content = document.createElement('div');
  content.className = 'bottom-panel__content';

  const utilitiesBar = document.createElement('div');
  utilitiesBar.className = 'bottom-panel__utilities';

  const deployButton = document.createElement('button');
  deployButton.className = 'bottom-panel__utility-button';
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

  const dataButton = document.createElement('button');
  dataButton.className = 'bottom-panel__utility-button';
  dataButton.textContent = 'Data';
  dataButton.setAttribute('aria-label', 'Data Tools');
  dataButton.setAttribute('title', 'Data Tools');

  dataButton.addEventListener('click', () => {
    setActivePanel('data');
  });

  utilitiesBar.appendChild(deployButton);
  utilitiesBar.appendChild(dataButton);

  const deploySection = document.createElement('div');
  deploySection.className = 'bottom-panel__section bottom-panel__section--hidden';
  content.appendChild(utilitiesBar);
  content.appendChild(deploySection);

  const dataSection = document.createElement('div');
  dataSection.className = 'bottom-panel__section bottom-panel__section--hidden';
  content.appendChild(dataSection);

  // --- Data Tools panel ---
  const dataTitle = document.createElement('div');
  dataTitle.style.cssText = 'font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 8px;';
  dataTitle.textContent = 'Data Tools';

  const dataDesc = document.createElement('div');
  dataDesc.style.cssText = 'font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 12px; line-height: 1.4;';
  dataDesc.textContent = 'Export or import hot storage data (projects, scenes, editor state).';

  const dataActions = document.createElement('div');
  dataActions.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px;';

  const dataStatus = document.createElement('div');
  dataStatus.style.cssText = 'font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 12px; padding: 8px 10px; background: rgba(0,0,0,0.2); border-radius: 6px;';
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
  btnCheck.className = 'bottom-panel__data-action';
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
  btnExport.className = 'bottom-panel__data-action';
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
  btnCopy.className = 'bottom-panel__data-action';
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
  btnImport.className = 'bottom-panel__data-action';
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
  }

  function updateToolButtons(): void {
    selectionButton.classList.toggle('bottom-panel__tool-button--active', state.currentTool === 'select');
    paintButton.classList.toggle('bottom-panel__tool-button--active', state.currentTool === 'paint');
    eraseButton.classList.toggle('bottom-panel__tool-button--active', state.currentTool === 'erase');

    paintButton.disabled = !toolContext.paintEnabled;
    eraseButton.disabled = !toolContext.eraseEnabled;

    paintButton.classList.toggle('bottom-panel__tool-button--locked', toolContext.isLocked);
    eraseButton.classList.toggle('bottom-panel__tool-button--locked', toolContext.isLocked);

    const paintLabel = paintButton.querySelector('.bottom-panel__tool-sublabel');
    const eraseLabel = eraseButton.querySelector('.bottom-panel__tool-sublabel');
    if (paintLabel) paintLabel.textContent = toolContext.layerLabel;
    if (eraseLabel) eraseLabel.textContent = toolContext.layerLabel;
  }

  function setActivePanel(panelName: BottomPanelSection): void {
    activePanel = panelName;
    const isDeploy = activePanel === 'deploy';
    const isData = activePanel === 'data';

    deploySection.classList.toggle('bottom-panel__section--hidden', !isDeploy);
    dataSection.classList.toggle('bottom-panel__section--hidden', !isData);

    deployButton.classList.toggle('bottom-panel__utility-button--active', isDeploy);
    dataButton.classList.toggle('bottom-panel__utility-button--active', isData);
  }

  panel.appendChild(header);
  panel.appendChild(contextRow);
  panel.appendChild(content);
  container.appendChild(panel);

  updateToolButtons();
  setActivePanel(activePanel);

  console.log(`${LOG_PREFIX} Bottom panel created`);

  // --- Controller ---

  const controller: BottomPanelController = {
    setCurrentTool(tool: ToolType) {
      if (state.currentTool === tool) return;
      state.currentTool = tool;
      updateToolButtons();
    },

    getCurrentTool() {
      return state.currentTool;
    },

    setToolContext(context) {
      toolContext = { ...toolContext, ...context };
      updateToolButtons();
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

    onExpandToggle(callback) {
      expandToggleCallback = callback;
    },

    onSelectionClick(callback) {
      selectionClickCallback = callback;
    },

    onPaintClick(callback) {
      paintClickCallback = callback;
    },

    onEraseClick(callback) {
      eraseClickCallback = callback;
    },

    setSelectionActive(active: boolean) {
      selectionButton.classList.toggle('bottom-panel__tool-button--active', active);
    },

    getContentContainer() {
      return content;
    },

    getContextStripContainer() {
      return contextStripContainer;
    },

    destroy() {
      deployPanelController?.destroy();
      container.removeChild(panel);
      const styleEl = document.getElementById('bottom-panel-styles');
      if (styleEl) styleEl.remove();
      console.log(`${LOG_PREFIX} Bottom panel destroyed`);
    },
  };

  return controller;
}
