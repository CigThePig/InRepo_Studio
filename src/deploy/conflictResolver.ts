import type { ConflictInfo } from './changeDetector';

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
  .conflict-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease-out;
    z-index: 1100;
  }

  .conflict-modal-overlay.visible {
    opacity: 1;
    pointer-events: auto;
  }

  .conflict-modal {
    width: min(520px, 100%);
    background: #1c1c2f;
    border-radius: 12px;
    border: 1px solid #2a2a4e;
    color: #e6e6f0;
    display: flex;
    flex-direction: column;
    max-height: 80vh;
  }

  .conflict-modal-header {
    padding: 16px;
    border-bottom: 1px solid #2a2a4e;
  }

  .conflict-modal-header h2 {
    margin: 0;
    font-size: 16px;
  }

  .conflict-modal-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
  }

  .conflict-card {
    border: 1px solid #2a2a4e;
    border-radius: 10px;
    padding: 12px;
    background: #1f1f3a;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .conflict-path {
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    word-break: break-all;
  }

  .conflict-actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .conflict-action-btn {
    min-height: 44px;
    border-radius: 8px;
    border: 1px solid #3a3a6e;
    background: #2a2a4e;
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .conflict-action-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    filter: grayscale(0.4);
  }

  .conflict-action-btn.active {
    border-color: #4a9eff;
    background: #2f3f68;
  }

  .conflict-modal-footer {
    padding: 16px;
    border-top: 1px solid #2a2a4e;
    display: flex;
    gap: 12px;
  }

  .conflict-footer-btn {
    flex: 1;
    min-height: 44px;
    border-radius: 8px;
    border: none;
    font-weight: 600;
    cursor: pointer;
  }

  .conflict-cancel-btn {
    background: #2a2a4e;
    color: #fff;
  }

  .conflict-continue-btn {
    background: #4a9eff;
    color: #fff;
  }

  .conflict-help {
    font-size: 12px;
    color: #aab0d4;
  }
`;

function ensureStyles(): void {
  if (document.getElementById('conflict-modal-styles')) {
    return;
  }
  const styleEl = document.createElement('style');
  styleEl.id = 'conflict-modal-styles';
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
    element.className = 'conflict-modal-overlay';

    const selections = new Map<string, ConflictResolution>();
    conflicts.forEach((conflict) => {
      selections.set(conflict.path, 'skip');
    });

    element.innerHTML = `
      <div class="conflict-modal" role="dialog" aria-modal="true" aria-label="Resolve conflicts">
        <div class="conflict-modal-header">
          <h2>Resolve conflicts</h2>
          <div class="conflict-help">Files changed on GitHub since your last deploy.</div>
        </div>
        <div class="conflict-modal-body"></div>
        <div class="conflict-modal-footer">
          <button class="conflict-footer-btn conflict-cancel-btn" type="button">Cancel deploy</button>
          <button class="conflict-footer-btn conflict-continue-btn" type="button">Continue</button>
        </div>
      </div>
    `;

    const body = element.querySelector('.conflict-modal-body');

    conflicts.forEach((conflict) => {
      const card = document.createElement('div');
      card.className = 'conflict-card';
      const remoteHint =
        conflict.remoteSha === null ? 'Remote file is missing (deleted).' : 'Remote file exists on GitHub.';

      card.innerHTML = `
        <div class="conflict-path">${conflict.path}</div>
        <div class="conflict-help">${remoteHint}</div>
        <div class="conflict-actions">
          <button class="conflict-action-btn" data-resolution="overwrite" type="button">Overwrite</button>
          <button class="conflict-action-btn" data-resolution="pull" type="button" ${conflict.remoteSha === null ? 'disabled' : ''}>Pull remote</button>
          <button class="conflict-action-btn active" data-resolution="skip" type="button">Skip</button>
        </div>
      `;

      card.querySelectorAll<HTMLButtonElement>('.conflict-action-btn').forEach((button) => {
        button.addEventListener('click', () => {
          const resolution = button.dataset.resolution as ConflictResolution;
          selections.set(conflict.path, resolution);
          card.querySelectorAll('.conflict-action-btn').forEach((btn) => {
            btn.classList.toggle('active', btn === button);
          });
        });
      });

      body?.appendChild(card);
    });

    element.querySelector('.conflict-cancel-btn')?.addEventListener('click', () => {
      close();
      element.dispatchEvent(new CustomEvent('resolve', { detail: null }));
    });

    element.querySelector('.conflict-continue-btn')?.addEventListener('click', () => {
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
