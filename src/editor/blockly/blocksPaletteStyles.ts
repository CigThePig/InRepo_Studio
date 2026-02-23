/** CSS styles for the Blocks Palette component. */
export const BLOCKS_PALETTE_STYLES = `
  .irs-blocks-palette {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    touch-action: pan-y;
  }

  .irs-blocks-palette__search {
    position: sticky;
    top: 0;
    z-index: 2;
    padding: 0 0 12px 0;
    background: var(--irs-surface-panel);
    flex-shrink: 0;
  }
.irs-blocks-palette__list {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 24px;
  }

  .irs-blocks-palette__list::-webkit-scrollbar {
    width: 4px;
  }

  .irs-blocks-palette__list::-webkit-scrollbar-track {
    background: transparent;
  }

  .irs-blocks-palette__list::-webkit-scrollbar-thumb {
    background: var(--irs-border-light);
    border-radius: 2px;
  }

  .irs-blocks-palette__category {
    margin-bottom: 4px;
  }


  .irs-blocks-palette__results-count {
    padding: 2px 8px 10px;
    color: var(--irs-text-secondary);
    font-size: 12px;
  }

  .irs-blocks-palette__cat-header {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 48px;
    padding: 8px 4px;
    border: none;
    background: transparent;
    color: var(--irs-text-primary);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    text-align: left;
  }

  .irs-blocks-palette__cat-header:active {
    background: var(--irs-border-light);
  }

  .irs-blocks-palette__cat-icon {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: var(--irs-border-light);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    color: var(--irs-text-secondary);
    flex-shrink: 0;
  }

  .irs-blocks-palette__cat-label {
    flex: 1;
  }

  .irs-blocks-palette__cat-count {
    font-size: 12px;
    color: var(--irs-text-muted);
    font-weight: 400;
    margin-right: 4px;
  }

  .irs-blocks-palette__cat-chevron {
    font-size: 12px;
    color: var(--irs-text-muted);
    transition: transform 0.15s ease;
    flex-shrink: 0;
  }

  .irs-blocks-palette__cat-chevron--expanded {
    transform: rotate(90deg);
  }

  .irs-blocks-palette__cat-body {
    display: none;
    padding: 0 0 8px 0;
  }

  .irs-blocks-palette__cat-body--expanded {
    display: block;
  }

  .irs-blocks-palette__block-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 44px;
    padding: 8px 8px 8px 40px;
    border: none;
    background: transparent;
    color: var(--irs-text-primary);
    font-size: 13px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    text-align: left;
    border-radius: 6px;
    transition: background 0.1s;
  }

  .irs-blocks-palette__block-item:active {
    background: var(--irs-border-light);
  }

  .irs-blocks-palette__block-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .irs-blocks-palette__block-dot--event { background: var(--irs-accent-warning); }
  .irs-blocks-palette__block-dot--command { background: var(--irs-accent-primary); }
  .irs-blocks-palette__block-dot--state { background: var(--irs-accent-success); }
  .irs-blocks-palette__block-dot--payload { background: var(--irs-accent-primary-active); }

  .irs-blocks-palette__block-label {
    flex: 1;
    line-height: 1.3;
  }

  .irs-blocks-palette__advanced-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    min-height: 36px;
    padding: 4px 8px 4px 40px;
    border: none;
    background: transparent;
    color: var(--irs-accent-primary);
    font-size: 12px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .irs-blocks-palette__advanced-toggle:active {
    color: var(--irs-accent-primary-active);
  }

  .irs-blocks-palette__disabled-placeholder {
    padding: 12px 8px 12px 40px;
    color: var(--irs-text-muted);
    font-size: 13px;
    line-height: 1.4;
  }


  .irs-blocks-palette__dep-prompt {
    padding: 6px 8px 6px 40px;
    color: var(--irs-accent-warning);
    font-size: 12px;
    display: none;
  }

  .irs-blocks-palette__dep-prompt--visible {
    display: flex;
    align-items: center;
    gap: 8px;
  }


  .irs-blocks-palette__empty-search {
    padding: 24px 8px;
    text-align: center;
    color: var(--irs-text-muted);
    font-size: 13px;
  }

  .irs-blocks-palette__cat-tag {
    font-size: 11px;
    color: var(--irs-text-muted);
    background: var(--irs-border-light);
    padding: 2px 6px;
    border-radius: 4px;
    flex-shrink: 0;
  }
`;
