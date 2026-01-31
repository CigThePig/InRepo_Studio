/**
 * Bottom Panel Component
 *
 * Contains the toolbar (tool buttons) and placeholder for tile picker.
 * Expandable/collapsible with tap on header.
 */

const LOG_PREFIX = '[BottomPanel]';

// --- Types ---

export type ToolType = 'select' | 'paint' | 'erase' | 'entity';

export interface BottomPanelState {
  expanded: boolean;
  currentTool: ToolType;
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

  /** Register callback for tool changes */
  onToolChange(callback: (tool: ToolType) => void): void;

  /** Register callback for expand/collapse toggle */
  onExpandToggle(callback: (expanded: boolean) => void): void;

  /** Get the content container for adding tile picker (Phase 3) */
  getContentContainer(): HTMLElement;

  /** Clean up resources */
  destroy(): void;
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

  .tool-button--active {
    border-color: #4a9eff;
    background: #3a3a6e;
    color: #fff;
  }

  .bottom-panel__content {
    flex: 1;
    padding: 0 12px 12px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
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

// --- Factory ---

export function createBottomPanel(
  container: HTMLElement,
  initialState: BottomPanelState
): BottomPanelController {
  let state = { ...initialState };
  let toolChangeCallback: ((tool: ToolType) => void) | null = null;
  let expandToggleCallback: ((expanded: boolean) => void) | null = null;

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

  const toolButtons: Map<ToolType, HTMLButtonElement> = new Map();

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

      // Notify
      toolChangeCallback?.(toolType);
      console.log(`${LOG_PREFIX} Tool changed to "${toolType}"`);
    });

    toolButtons.set(toolType, button);
    toolbar.appendChild(button);
  }

  // Content area (for tile picker in Phase 3)
  const content = document.createElement('div');
  content.className = 'bottom-panel__content';

  // Placeholder
  const placeholder = document.createElement('div');
  placeholder.className = 'bottom-panel__placeholder';
  placeholder.textContent = 'Phase 2: Tile Picker coming soon';
  content.appendChild(placeholder);

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

  panel.appendChild(header);
  panel.appendChild(toolbar);
  panel.appendChild(content);
  container.appendChild(panel);

  console.log(`${LOG_PREFIX} Bottom panel created`);

  // --- Controller ---

  const controller: BottomPanelController = {
    setCurrentTool(tool: ToolType) {
      if (state.currentTool === tool) return;

      state.currentTool = tool;
      toolButtons.forEach((btn, type) => {
        btn.classList.toggle('tool-button--active', type === tool);
      });
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

    onToolChange(callback) {
      toolChangeCallback = callback;
    },

    onExpandToggle(callback) {
      expandToggleCallback = callback;
    },

    getContentContainer() {
      return content;
    },

    destroy() {
      container.removeChild(panel);
      document.head.removeChild(styleEl);
      console.log(`${LOG_PREFIX} Bottom panel destroyed`);
    },
  };

  return controller;
}
