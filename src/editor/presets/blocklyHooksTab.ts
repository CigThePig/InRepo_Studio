import type { CommandDef, EventDef, PresetDefinition, StateDef } from '@/types/preset';
import { isBlocklyModeActive } from '@/editor/blockly/blocklyMode';

export interface BlocklyHooksTabConfig {
  container: HTMLElement;
  definition: PresetDefinition;
  getInsertBlockFn?: () => ((blockType: string) => void) | null;
  getOpenInBlocklyFn?: () => ((blockType: string) => void | Promise<void>) | null;
}

export interface BlocklyHooksTabController {
  refresh(): void;
  destroy(): void;
}

const STYLES = `
  .irs-preset-hooks {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .irs-preset-hooks__group {
    border: 1px solid var(--irs-border-medium);
    border-radius: var(--irs-radius-lg);
    background: var(--irs-surface-dark);
    overflow: hidden;
  }

  .irs-preset-hooks__summary {
    list-style: none;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    color: var(--irs-text-primary);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .irs-preset-hooks__summary::-webkit-details-marker {
    display: none;
  }

  .irs-preset-hooks__items {
    padding: 0 10px 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .irs-preset-hooks__item {
    border: 1px solid var(--irs-border-medium);
    border-radius: var(--irs-radius-md);
    background: var(--irs-surface-input);
    overflow: hidden;
  }

  .irs-preset-hooks__item-summary {
    list-style: none;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px;
    cursor: pointer;
    color: var(--irs-text-primary);
  }

  .irs-preset-hooks__label { font-size: 12px; font-weight: 700; }
  .irs-preset-hooks__description { font-size: 11px; color: var(--irs-text-secondary); }
  .irs-preset-hooks__details { padding: 0 10px 10px; color: var(--irs-text-primary); font-size: 11px; }
  .irs-preset-hooks__mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--irs-text-primary); }

  .irs-preset-hooks__insert {
    min-height: 44px;
    border-radius: var(--irs-radius-md);
    border: 1px solid var(--irs-color-blue-border);
    background: var(--irs-color-blue-alpha-35);
    color: var(--irs-text-primary);
    font-size: 11px;
    font-weight: 700;
    padding: 0 10px;
  }
`;

function ensureStyles(): void {
  if (document.getElementById('irs-preset-hooks-styles')) return;
  const style = document.createElement('style');
  style.id = 'irs-preset-hooks-styles';
  style.textContent = STYLES;
  document.head.appendChild(style);
}

function eventBlockType(event: EventDef): string {
  return `inrepo_when_${event.id}`;
}

function commandBlockType(command: CommandDef): string {
  return `inrepo_do_${command.id}`;
}

function stateBlockType(state: StateDef): string {
  return `inrepo_get_${state.id}`;
}

export function createBlocklyHooksTab(config: BlocklyHooksTabConfig): BlocklyHooksTabController {
  ensureStyles();
  const root = document.createElement('div');
  root.className = 'irs-preset-hooks';
  config.container.innerHTML = '';
  config.container.appendChild(root);

  function createItem(
    label: string,
    description: string,
    detailsText: string,
    blockType: string,
  ): HTMLElement {
    const details = document.createElement('details');
    details.className = 'irs-preset-hooks__item';

    const summary = document.createElement('summary');
    summary.className = 'irs-preset-hooks__item-summary';

    const info = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'irs-preset-hooks__label';
    name.textContent = label;
    const desc = document.createElement('div');
    desc.className = 'irs-preset-hooks__description';
    desc.textContent = description;
    info.append(name, desc);
    summary.appendChild(info);

    const insertBlock = config.getInsertBlockFn?.() ?? null;
    if (insertBlock) {
      const insertBtn = document.createElement('button');
      insertBtn.type = 'button';
      insertBtn.className = 'irs-preset-hooks__insert';
      insertBtn.textContent = 'Insert block';
      insertBtn.addEventListener('click', (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        insertBlock(blockType);
      });
      summary.appendChild(insertBtn);
    } else {
      const openInBlockly = config.getOpenInBlocklyFn?.() ?? null;
      if (openInBlockly) {
        const openBtn = document.createElement('button');
        openBtn.type = 'button';
        openBtn.className = 'irs-preset-hooks__insert';
        openBtn.textContent = 'Edit in Blockly';
        openBtn.addEventListener('click', async (evt) => {
          evt.preventDefault();
          evt.stopPropagation();
          try {
            await openInBlockly(blockType);
            if (!isBlocklyModeActive()) {
              console.warn('[BlocklyHooksTab] openInBlockly resolved but Blockly mode is not active');
              return;
            }
            const insertAfterOpen = config.getInsertBlockFn?.() ?? null;
            insertAfterOpen?.(blockType);
          } catch (error) {
            console.warn('[BlocklyHooksTab] Failed to open Blockly mode from hooks action', error);
          }
        });
        summary.appendChild(openBtn);
      }
    }

    const body = document.createElement('div');
    body.className = 'irs-preset-hooks__details';
    body.innerHTML = `${detailsText}<br/><span class="irs-preset-hooks__mono">${blockType}</span>`;

    details.append(summary, body);
    return details;
  }

  function createSection(title: string, items: HTMLElement[]): HTMLElement {
    const details = document.createElement('details');
    details.className = 'irs-preset-hooks__group';
    details.open = true;
    const summary = document.createElement('summary');
    summary.className = 'irs-preset-hooks__summary';
    summary.textContent = `${title} (${items.length})`;
    const content = document.createElement('div');
    content.className = 'irs-preset-hooks__items';
    for (const item of items) content.appendChild(item);
    details.append(summary, content);
    return details;
  }

  function render(): void {
    root.innerHTML = '';

    const events = config.definition.events.map((event) => {
      const payload = event.payload.length > 0
        ? event.payload.map((p) => `${p.name}: ${p.type}`).join(', ')
        : 'No payload fields';
      return createItem(event.label, event.description, `Payload: ${payload}`, eventBlockType(event));
    });

    const commands = config.definition.commands.map((command) => {
      const args = command.args.length > 0
        ? command.args.map((arg) => `${arg.name}: ${arg.type}`).join(', ')
        : 'No args';
      return createItem(command.label, command.description, `Args: ${args}`, commandBlockType(command));
    });

    const state = config.definition.state.map((entry) => {
      return createItem(entry.label, entry.description, `Type: ${entry.type}`, stateBlockType(entry));
    });

    root.append(
      createSection('Events', events),
      createSection('Commands', commands),
      createSection('State', state),
    );
  }

  render();

  return {
    refresh: render,
    destroy() {
      root.remove();
    },
  };
}
