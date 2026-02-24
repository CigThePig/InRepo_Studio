let stylesInjected = false;

function ensureStyles(): void {
  if (stylesInjected) return;
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .irs-settings-panel__card {
      width: min(420px, 92vw);
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 14px;
      border-radius: var(--irs-radius-lg);
      background: var(--irs-surface-modal);
      border: 1px solid var(--irs-border-medium);
      box-shadow: var(--irs-shadow-modal);
      color: var(--irs-text-primary);
    }

    .irs-settings-panel__title {
      font-size: 14px;
      font-weight: 700;
    }

    .irs-settings-panel__message {
      font-size: 12px;
      color: var(--irs-text-secondary);
      line-height: 1.4;
    }

    .irs-settings-panel__actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 4px;
    }

    .irs-settings-panel__notice {
      position: absolute;
      left: 50%;
      bottom: 60px;
      transform: translateX(-50%);
      background: var(--irs-surface-dark);
      color: var(--irs-color-yellow);
      padding: 10px 14px;
      border-radius: var(--irs-radius-md);
      font-size: 12px;
      font-weight: 600;
      border: 1px solid var(--irs-color-yellow-border);
      box-shadow: var(--irs-shadow-panel);
      z-index: 30;
      text-align: center;
      line-height: 1.4;
      display: none;
    }

  `;
  document.head.appendChild(styleEl);
  stylesInjected = true;
}

export async function showSettingsPlaceholderDialog(prompt: string): Promise<boolean> {
  ensureStyles();
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'irs-dialog';

    const card = document.createElement('div');
    card.className = 'irs-settings-panel__card';

    const title = document.createElement('div');
    title.className = 'irs-settings-panel__title';
    title.textContent = 'Settings (Preview)';

    const message = document.createElement('div');
    message.className = 'irs-settings-panel__message';
    message.textContent = prompt;

    const actions = document.createElement('div');
    actions.className = 'irs-settings-panel__actions';

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'irs-btn irs-btn--secondary';
    cancel.textContent = 'Cancel';

    const confirm = document.createElement('button');
    confirm.type = 'button';
    confirm.className = 'irs-btn irs-btn--primary';
    confirm.textContent = 'Apply';

    const finish = (value: boolean) => {
      overlay.remove();
      resolve(value);
    };

    cancel.addEventListener('click', () => finish(false));
    confirm.addEventListener('click', () => finish(true));
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) finish(false);
    });

    actions.append(cancel, confirm);
    card.append(title, message, actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  });
}


export function createSettingsNotice(container: HTMLElement, maxWidthPx: number): (message: string) => void {
  ensureStyles();
  const notice = document.createElement('div');
  notice.className = 'irs-settings-panel__notice';
  notice.style.maxWidth = `${maxWidthPx}px`;
  container.appendChild(notice);

  let timeoutId: number | null = null;
  return (message: string) => {
    notice.textContent = message;
    notice.style.display = 'block';
    if (timeoutId !== null) window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      notice.style.display = 'none';
      timeoutId = null;
    }, 4000);
  };
}
