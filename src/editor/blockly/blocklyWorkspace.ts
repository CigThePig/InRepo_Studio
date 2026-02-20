/**
 * Blockly Workspace — injection wrapper and lifecycle management.
 *
 * Injects Blockly.inject() with Zelos renderer, mobile-tuned zoom/move config,
 * and hidden toolbox. Exposes a controller for save/load/clear/dispose operations.
 *
 * This module is designed for lazy loading via dynamic import — Blockly is
 * only loaded when Blockly Mode is first entered.
 */

import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import {
  registerCoreBlocks,
  createBlockRegistry,
  installRegistryIntoBlockly,
} from '@/runtime/blockly';
import type { BlockRegistry } from '@/runtime/blockly';

const LOG_PREFIX = '[BlocklyWorkspace]';

// --- Types ---

export interface BlocklyWorkspaceController {
  /** Get the underlying Blockly workspace. */
  getWorkspace(): Blockly.WorkspaceSvg;

  /** Get the block registry. */
  getBlockRegistry(): BlockRegistry;

  /** Serialize workspace to JSON. */
  save(): Record<string, unknown>;

  /** Load workspace state from JSON. Events are suppressed during load. */
  load(json: Record<string, unknown>): void;

  /** Clear all blocks from the workspace. */
  clear(): void;

  /** Dispose the workspace entirely. */
  dispose(): void;

  /** Subscribe to workspace change events (for auto-save). Returns disposer. */
  onChanged(callback: () => void): () => void;

  /** Insert a block by type at an optional position. */
  insertBlock(blockType: string, position?: { x: number; y: number }): void;

  /** Trigger resize (call after container resize or orientation change). */
  resize(): void;

  /**
   * Generate JavaScript code from the current workspace.
   * Returns the raw JS program string. ScriptHost's wrapped API captures
   * disposers automatically — append 'return [];' to complete the body.
   */
  generateJs(): string;

  /**
   * Highlight a block by ID and scroll it into view.
   * Silently ignores unknown or stale block IDs.
   */
  highlightBlock(blockId: string): void;

  /** Clear any active block highlight. */
  clearHighlight(): void;
}

// --- Configuration ---

const WORKSPACE_CONFIG: Blockly.BlocklyOptions = {
  renderer: 'zelos',
  toolbox: { kind: 'categoryToolbox', contents: [] } as unknown as Blockly.utils.toolbox.ToolboxDefinition,
  zoom: {
    controls: false,
    wheel: true,
    pinch: true,
    startScale: 0.8,
    maxScale: 2,
    minScale: 0.3,
    scaleSpeed: 1.1,
  },
  move: {
    scrollbars: { horizontal: false, vertical: false },
    drag: true,
    wheel: true,
  },
  grid: {
    spacing: 20,
    length: 3,
    colour: '#333',
    snap: true,
  },
  trashcan: true,
  sounds: false,
  media: 'https://unpkg.com/blockly/media/',
};

// --- Factory ---

/**
 * Create and inject a Blockly workspace into the given container.
 *
 * Registers core blocks before injection. Returns a controller
 * for workspace lifecycle management.
 */
export function createBlocklyWorkspace(
  container: HTMLElement,
): BlocklyWorkspaceController {
  // Register core blocks (idempotent — safe to call multiple times)
  const registry = createBlockRegistry();
  registerCoreBlocks(registry, { includePresets: true });
  installRegistryIntoBlockly({ Blockly, javascriptGenerator, registry });

  console.log(`${LOG_PREFIX} Injecting Blockly workspace with Zelos renderer`);

  const workspace = Blockly.inject(container, WORKSPACE_CONFIG);

  // Track change listeners for cleanup
  const changeDisposers: Array<() => void> = [];

  const controller: BlocklyWorkspaceController = {
    getWorkspace() {
      return workspace;
    },

    getBlockRegistry() {
      return registry;
    },

    save(): Record<string, unknown> {
      const json = Blockly.serialization.workspaces.save(workspace);
      return json as Record<string, unknown>;
    },

    load(json: Record<string, unknown>): void {
      // Suppress events during load to prevent change-listener churn
      Blockly.Events.disable();
      try {
        workspace.clear();
        Blockly.serialization.workspaces.load(json, workspace);
      } finally {
        Blockly.Events.enable();
      }
      console.log(`${LOG_PREFIX} Workspace loaded from JSON`);
    },

    clear(): void {
      workspace.clear();
      console.log(`${LOG_PREFIX} Workspace cleared`);
    },

    dispose(): void {
      // Clean up all change listeners
      for (const dispose of changeDisposers) {
        dispose();
      }
      changeDisposers.length = 0;

      workspace.dispose();
      console.log(`${LOG_PREFIX} Workspace disposed`);
    },

    onChanged(callback: () => void): () => void {
      const handler = (event: Blockly.Events.Abstract) => {
        // Only fire for user-initiated changes (not during load)
        if (!event.isUiEvent && event.type !== Blockly.Events.VIEWPORT_CHANGE) {
          callback();
        }
      };

      workspace.addChangeListener(handler);

      const disposer = () => {
        workspace.removeChangeListener(handler);
      };
      changeDisposers.push(disposer);
      return disposer;
    },

    insertBlock(blockType: string, position?: { x: number; y: number }): void {
      try {
        const block = workspace.newBlock(blockType);
        if (position) {
          block.moveBy(position.x, position.y);
        }
        block.initSvg();
        const blockSvg = block as Blockly.BlockSvg;
        blockSvg.render();
        blockSvg.select();

        if (!position && typeof (workspace as Blockly.WorkspaceSvg & { centerOnBlock?: (id: string, blockOnly?: boolean) => void }).centerOnBlock === 'function') {
          (workspace as Blockly.WorkspaceSvg & { centerOnBlock: (id: string, blockOnly?: boolean) => void }).centerOnBlock(block.id, true);
        }

        console.log(`${LOG_PREFIX} Inserted block: ${blockType}`);
      } catch (error) {
        console.warn(`${LOG_PREFIX} Failed to insert block: ${blockType}`, error);
      }
    },

    resize(): void {
      Blockly.svgResize(workspace);
    },

    generateJs(): string {
      return javascriptGenerator.workspaceToCode(workspace);
    },

    highlightBlock(blockId: string): void {
      try {
        // Scroll block into view first, then highlight
        const ws = workspace as Blockly.WorkspaceSvg & {
          centerOnBlock?: (id: string, opt_blockOnly?: boolean) => void;
          highlightBlock?: (id: string | null, opt_state?: boolean) => void;
        };
        if (typeof ws.centerOnBlock === 'function') {
          ws.centerOnBlock(blockId, true);
        }
        if (typeof ws.highlightBlock === 'function') {
          ws.highlightBlock(blockId, true);
        }
      } catch (err) {
        console.warn(`[BlocklyWorkspace] highlightBlock("${blockId}") failed:`, err);
      }
    },

    clearHighlight(): void {
      try {
        const ws = workspace as Blockly.WorkspaceSvg & {
          highlightBlock?: (id: string | null, opt_state?: boolean) => void;
        };
        if (typeof ws.highlightBlock === 'function') {
          ws.highlightBlock(null, false);
        }
      } catch {
        // Ignore — best effort
      }
    },
  };

  console.log(`${LOG_PREFIX} Workspace ready`);
  return controller;
}
