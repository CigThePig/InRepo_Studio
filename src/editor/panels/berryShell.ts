export interface BerryShellConfig {
  container: HTMLElement;
  position: 'left' | 'right';
  title: string;
  initialOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export interface BerryShell {
  /** The container to append tab buttons to */
  tabBar: HTMLElement;
  /** The container to append tab content panes to */
  content: HTMLElement;
  setOpen: (open: boolean) => void;
  isOpen: () => boolean;
  destroy: () => void;
}

const BERRY_STYLES = `
  .irs-berry-shell {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 20;
  }

  .irs-berry-shell--open {
    pointer-events: auto;
  }

  .irs-berry__overlay {
    position: absolute;
    inset: 0;
    background: transparent;
    opacity: 0;
    transition: opacity 0.25s ease-out;
    pointer-events: none;
  }

  .irs-berry-shell--open .irs-berry__overlay {
    opacity: 1;
    pointer-events: auto;
  }

  .irs-berry {
    position: absolute;
    top: 0;
    height: 100%;
    width: min(320px, 85vw);
    background: var(--irs-surface-dark-alpha);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .irs-berry--left {
    left: 0;
    border-right: 1px solid var(--irs-color-blue-alpha-12);
    box-shadow: 4px 0 24px var(--irs-border-light);
    transform: translateX(-100%);
  }

  .irs-berry--right {
    right: 0;
    border-left: 1px solid var(--irs-color-blue-alpha-12);
    box-shadow: -4px 0 24px var(--irs-border-light);
    transform: translateX(100%);
  }

  .irs-berry-shell--open .irs-berry {
    transform: translateX(0);
    pointer-events: auto;
  }

  @media (max-width: 520px) {
    .irs-berry {
      width: 100vw;
    }
  }

  .irs-berry__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: max(16px, env(safe-area-inset-top)) 16px 16px;
    border-bottom: 1px solid var(--irs-color-blue-alpha-12);
    flex-shrink: 0;
  }

  .irs-berry--left .irs-berry__header {
    padding-left: max(16px, env(safe-area-inset-left));
  }

  .irs-berry--right .irs-berry__header {
    padding-right: max(16px, env(safe-area-inset-right));
  }

  .irs-berry__title {
    font-size: 16px;
    font-weight: 600;
    color: var(--irs-text-primary);
  }

  .irs-berry__close {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    border: none;
    background: var(--irs-color-blue-alpha-8);
    color: var(--irs-text-secondary);
    font-size: 18px;
    font-weight: 300;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s, color 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .irs-berry__close:active {
    background: var(--irs-color-blue-alpha-12);
    color: var(--irs-text-primary);
  }

  .irs-berry__tabs {
    display: flex;
    gap: 6px;
    padding: 12px 16px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border-bottom: 1px solid var(--irs-color-blue-alpha-12);
    scrollbar-width: none;
    flex-shrink: 0;
  }

  .irs-berry__tabs::-webkit-scrollbar {
    display: none;
  }

  .irs-berry__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .irs-berry__tab {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 44px;
    padding: 0 14px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--irs-text-secondary);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
    transition: all 0.15s ease;
  }

  .irs-berry__tab:active {
    background: var(--irs-color-blue-alpha-8);
  }

  .irs-berry__tab--active {
    background: var(--irs-color-blue-alpha-12);
    color: var(--irs-text-primary);
  }

  .irs-berry__tab-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    font-size: 12px;
    opacity: 0.7;
  }

  .irs-berry__tab--active .irs-berry__tab-icon {
    opacity: 1;
  }

  .irs-berry__tab-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 16px;
    padding-bottom: max(16px, env(safe-area-inset-bottom));
    display: none;
    -webkit-overflow-scrolling: touch;
  }

  .irs-berry__tab-content::-webkit-scrollbar {
    width: 4px;
  }

  .irs-berry__tab-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .irs-berry__tab-content::-webkit-scrollbar-thumb {
    background: var(--irs-color-blue-alpha-16);
    border-radius: 2px;
  }

  .irs-berry__tab-content--active {
    display: flex;
    flex-direction: column;
  }

  .irs-berry__placeholder {
    color: var(--irs-text-muted);
    font-size: 13px;
    line-height: 1.5;
    background: var(--irs-color-blue-alpha-4);
    border: 1px dashed var(--irs-color-blue-alpha-12);
    border-radius: 8px;
    padding: 16px;
  }

  .irs-berry__handle {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 44px;
    height: 64px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    pointer-events: auto;
    -webkit-tap-highlight-color: transparent;
    display: flex;
    align-items: center;
  }

  .irs-berry__handle--left {
    left: 0;
    justify-content: flex-start;
  }

  .irs-berry__handle--right {
    right: 0;
    justify-content: flex-end;
  }

  .irs-berry__handle-tab {
    width: var(--irs-touch-target);
    height: 56px;
    background: var(--irs-surface-dark-alpha);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--irs-color-blue-alpha-12);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .irs-berry__handle--left .irs-berry__handle-tab {
    border-left: none;
    border-radius: 0 10px 10px 0;
    box-shadow: 2px 0 8px var(--irs-border-light);
  }

  .irs-berry__handle--right .irs-berry__handle-tab {
    border-right: none;
    border-radius: 10px 0 0 10px;
    box-shadow: -2px 0 8px var(--irs-border-light);
  }

  .irs-berry__handle:active .irs-berry__handle-tab {
    background: var(--irs-surface-panel);
    width: var(--irs-touch-target);
  }

  .irs-berry__handle-icon {
    color: var(--irs-text-secondary);
    font-size: 10px;
    transition: color 0.2s;
  }

  .irs-berry__handle:active .irs-berry__handle-icon {
    color: var(--irs-text-primary);
  }

  .irs-berry-shell--open .irs-berry__handle {
    opacity: 0;
    pointer-events: none;
  }
`;

function ensureStyles(): void {
  if (document.getElementById('irs-berry-shell-styles')) return;
  const styleEl = document.createElement('style');
  styleEl.id = 'irs-berry-shell-styles';
  styleEl.textContent = BERRY_STYLES;
  document.head.appendChild(styleEl);
}

export function createBerryShell(config: BerryShellConfig): BerryShell {
  ensureStyles();

  const shell = document.createElement('div');
  shell.className = 'irs-berry-shell';

  const overlay = document.createElement('div');
  overlay.className = 'irs-berry__overlay';

  const panel = document.createElement('div');
  panel.className = `irs-berry irs-berry--${config.position}`;

  const header = document.createElement('div');
  header.className = 'irs-berry__header';

  const title = document.createElement('div');
  title.className = 'irs-berry__title';
  title.textContent = config.title;

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'irs-berry__close';
  closeButton.textContent = '×';
  closeButton.setAttribute('aria-label', `Close ${config.title} panel`);

  const tabBar = document.createElement('div');
  tabBar.className = 'irs-berry__tabs';

  const content = document.createElement('div');
  content.className = 'irs-berry__content';

  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = `irs-berry__handle irs-berry__handle--${config.position}`;
  handle.setAttribute('aria-label', `Open ${config.title} panel`);

  const handleTab = document.createElement('div');
  handleTab.className = 'irs-berry__handle-tab';

  const handleIcon = document.createElement('div');
  handleIcon.className = 'irs-berry__handle-icon';
  handleIcon.textContent = config.position === 'left' ? '›' : '‹';

  handleTab.appendChild(handleIcon);
  handle.appendChild(handleTab);

  header.appendChild(title);
  header.appendChild(closeButton);

  panel.appendChild(header);
  panel.appendChild(tabBar);
  panel.appendChild(content);

  shell.appendChild(overlay);
  shell.appendChild(panel);
  shell.appendChild(handle);

  config.container.appendChild(shell);

  let open = Boolean(config.initialOpen);

  function setOpen(nextOpen: boolean): void {
    if (open === nextOpen) return;
    open = nextOpen;
    shell.classList.toggle('irs-berry-shell--open', open);
    config.onOpenChange?.(open);
  }

  function bindSwipeToClose(): void {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchActive = false;
    let swipeCancelled = false;

    panel.addEventListener('touchstart', (evt) => {
      if (!open) return;
      if (evt.touches.length !== 1) return;
      const touch = evt.touches[0];
      const target = evt.target as HTMLElement | null;

      if (target?.closest('.irs-berry__tabs, .irs-berry__tab-content')) {
        touchActive = false;
        return;
      }

      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchActive = true;
      swipeCancelled = false;
    });

    panel.addEventListener(
      'touchmove',
      (evt) => {
        if (!touchActive || swipeCancelled) return;
        const touch = evt.touches[0];
        if (!touch) return;

        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;
        if (Math.abs(dy) > 15 && Math.abs(dy) > Math.abs(dx)) {
          swipeCancelled = true;
          return;
        }

        const closesBySwipe = config.position === 'left' ? dx < -80 : dx > 80;
        if (closesBySwipe && Math.abs(dy) < 40) {
          setOpen(false);
          touchActive = false;
        }
      },
      { passive: true },
    );

    panel.addEventListener('touchend', () => {
      touchActive = false;
      swipeCancelled = false;
    });
  }

  overlay.addEventListener('click', () => setOpen(false));
  closeButton.addEventListener('click', () => setOpen(false));
  handle.addEventListener('click', () => setOpen(true));

  bindSwipeToClose();
  shell.classList.toggle('irs-berry-shell--open', open);

  return {
    tabBar,
    content,
    setOpen,
    isOpen: () => open,
    destroy: () => shell.remove(),
  };
}
