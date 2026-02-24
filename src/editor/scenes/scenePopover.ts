let stylesInjected = false;

function ensureStyles(): void {
  if (stylesInjected) return;
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .irs-scene-popover {
      position: absolute;
      left: 50%;
      bottom: 16px;
      transform: translateX(-50%);
      background: var(--irs-surface-dark);
      color: var(--irs-text-primary);
      padding: 8px 12px;
      border-radius: var(--irs-radius-md);
      font-size: 12px;
      font-weight: 600;
      border: 1px solid var(--irs-border-heavy);
      box-shadow: var(--irs-shadow-panel);
      display: none;
      z-index: 9;
      max-width: min(92vw, 360px);
      text-align: center;
    }
  `;
  document.head.appendChild(styleEl);
  stylesInjected = true;
}

export function createScenePopover(container: HTMLElement): (message: string) => void {
  ensureStyles();
  const popover = document.createElement('div');
  popover.className = 'irs-scene-popover';
  container.appendChild(popover);

  let timeoutId: number | null = null;

  return (message: string) => {
    popover.textContent = message;
    popover.style.display = 'block';
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(() => {
      popover.style.display = 'none';
      timeoutId = null;
    }, 2200);
  };
}
