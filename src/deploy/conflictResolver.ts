import type { ConflictInfo } from './changeDetector';
import { uxFeedback } from '@/editor/uxFeedback';

export type ConflictResolution = 'overwrite' | 'pull' | 'skip';

export interface ResolvedConflict {
  path: string;
  resolution: ConflictResolution;
}

export interface ConflictResolverUI {
  show(conflicts: ConflictInfo[]): Promise<ResolvedConflict[] | null>;
  destroy(): void;
}

const STYLES = `
  .irs-conflict-resolver {
    position: fixed;
    inset: 0;
    background: var(--irs-surface-dark-alpha);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease-out;
    z-index: 1100;
  }

  .irs-conflict-resolver.visible {
    opacity: 1;
    pointer-events: auto;
  }

  .irs-conflict-resolver__modal {
    width: min(520px, 100%);
    background: var(--irs-surface-modal);
    border-radius: var(--irs-radius-lg);
    border: 1px solid var(--irs-border-heavy);
    color: var(--irs-text-primary);
    display: flex;
    flex-direction: column;
    max-height: 80vh;
  }

  .irs-conflict-resolver__header {
    padding: 16px;
    border-bottom: 1px solid var(--irs-border-heavy);
  }

  .irs-conflict-resolver__header h2 {
    margin: 0;
    font-size: 16px;
  }

  .irs-conflict-resolver__body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
  }

  .irs-conflict-resolver__card {
    border: 1px solid var(--irs-border-heavy);
    border-radius: var(--irs-radius-md);
    padding: 12px;
    background: var(--irs-surface-panel);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .irs-conflict-resolver__path {
    font-size: 13px;
    font-weight: 600;
    color: var(--irs-text-primary);
    word-break: break-all;
  }

  .irs-conflict-resolver__actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .irs-conflict-resolver__action-btn {
    min-height: 44px;
    border-radius: var(--irs-radius-sm);
    border: 1px solid var(--irs-border-heavy);
    background: var(--irs-surface-panel);
    color: var(--irs-text-primary);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .irs-conflict-resolver__action-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    filter: grayscale(0.4);
  }

  .irs-conflict-resolver__action-btn.active {
    border-color: var(--irs-accent-primary);
    background: var(--irs-color-blue-alpha-16);
  }

  .irs-conflict-resolver__footer {
    padding: 16px;
    border-top: 1px solid var(--irs-border-heavy);
    display: flex;
    gap: 12px;
  }

  .irs-conflict-resolver__footer-btn {
    flex: 1;
    min-height: 44px;
    border-radius: var(--irs-radius-sm);
    border: none;
    font-weight: 600;
    cursor: pointer;
  }

  .irs-conflict-resolver__cancel-btn {
    background: var(--irs-surface-panel);
    color: var(--irs-text-primary);
  }

  .irs-conflict-resolver__continue-btn {
    background: var(--irs-accent-primary);
    color: var(--irs-text-primary);
  }

  .irs-conflict-resolver__help {
    font-size: 12px;
    color: var(--irs-text-secondary);
  }
`;

function ensureStyles(): void {
  if (document.getElementById('irs-conflict-resolver-styles')) {
    return;
  }
  const styleEl = document.createElement('style');
  styleEl.id = 'irs-conflict-resolver-styles';
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

export function createConflictResolver(container: HTMLElement = document.body): ConflictResolverUI {
  ensureStyles();

  let overlay: HTMLDivElement | null = null;

  function close(): void {
    overlay?.classList.remove('visible');
  }

  function destroy(): void {
    overlay?.remove();
    overlay = null;
  }

  function createOverlay(conflicts: ConflictInfo[]): HTMLDivElement {
    const element = document.createElement('div');
    element.className = 'irs-conflict-resolver';

    const selections = new Map<string, ConflictResolution>();
    conflicts.forEach((conflict) => {
      selections.set(conflict.path, 'skip');
    });

    element.innerHTML = `
      <div class="irs-conflict-resolver__modal" role="dialog" aria-modal="true" aria-label="Resolve conflicts">
        <div class="irs-conflict-resolver__header">
          <h2>Resolve conflicts</h2>
          <div class="irs-conflict-resolver__help">Files changed on GitHub since your last deploy.</div>
        </div>
        <div class="irs-conflict-resolver__body"></div>
        <div class="irs-conflict-resolver__footer">
          <button class="irs-conflict-resolver__footer-btn irs-conflict-resolver__cancel-btn" type="button">Cancel deploy</button>
          <button class="irs-conflict-resolver__footer-btn irs-conflict-resolver__continue-btn" type="button">Continue</button>
        </div>
      </div>
    `;

    const body = element.querySelector('.irs-conflict-resolver__body');

    conflicts.forEach((conflict) => {
      const card = document.createElement('div');
      card.className = 'irs-conflict-resolver__card';
      const remoteHint =
        conflict.remoteSha === null ? 'Remote file is missing (deleted).' : 'Remote file exists on GitHub.';

      card.innerHTML = `
        <div class="irs-conflict-resolver__path">${conflict.path}</div>
        <div class="irs-conflict-resolver__help">${remoteHint}</div>
        <div class="irs-conflict-resolver__actions">
          <button class="irs-conflict-resolver__action-btn" data-resolution="overwrite" type="button">Overwrite</button>
          <button class="irs-conflict-resolver__action-btn" data-resolution="pull" type="button" ${conflict.remoteSha === null ? 'disabled' : ''}>Pull remote</button>
          <button class="irs-conflict-resolver__action-btn active" data-resolution="skip" type="button">Skip</button>
        </div>
      `;

      card.querySelectorAll<HTMLButtonElement>('.irs-conflict-resolver__action-btn').forEach((button) => {
        button.addEventListener('click', () => {
          uxFeedback.motion.pulse(button);
          const resolution = button.dataset.resolution as ConflictResolution;
          selections.set(conflict.path, resolution);
          card.querySelectorAll('.irs-conflict-resolver__action-btn').forEach((btn) => {
            btn.classList.toggle('active', btn === button);
          });
        });
      });

      body?.appendChild(card);
    });

    element.querySelector('.irs-conflict-resolver__cancel-btn')?.addEventListener('click', () => {
      close();
      element.dispatchEvent(new CustomEvent('resolve', { detail: null }));
    });

    element.querySelector('.irs-conflict-resolver__continue-btn')?.addEventListener('click', () => {
      uxFeedback.toast.success('Conflict resolution applied.');
      close();
      const resolved: ResolvedConflict[] = conflicts.map((conflict) => ({
        path: conflict.path,
        resolution: selections.get(conflict.path) ?? 'skip',
      }));
      element.dispatchEvent(new CustomEvent('resolve', { detail: resolved }));
    });

    return element;
  }

  return {
    async show(conflicts) {
      if (overlay) {
        overlay.remove();
      }
      overlay = createOverlay(conflicts);
      container.appendChild(overlay);

      overlay.classList.add('visible');
      requestAnimationFrame(() => {
        overlay?.classList.add('visible');
      });

      const result = await new Promise<ResolvedConflict[] | null>((resolve) => {
        const handler = (event: Event) => {
          const customEvent = event as CustomEvent<ResolvedConflict[] | null>;
          overlay?.removeEventListener('resolve', handler);
          resolve(customEvent.detail);
        };
        overlay?.addEventListener('resolve', handler as EventListener, { once: true });
      });

      return result;
    },
    destroy,
  };
}
