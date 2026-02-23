/** CSS styles for the Blocks Palette component. */
export const BLOCKS_PALETTE_STYLES = `
  .blocks-palette {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    touch-action: pan-y;
  }

  .blocks-palette__search {
    position: sticky;
    top: 0;
    z-index: 2;
    padding: 0 0 12px 0;
    background: #0d1220;
    flex-shrink: 0;
  }

  .blocks-palette__search-input {
    width: 100%;
    padding-right: 36px;
  }

  .blocks-palette__search-wrap {
    position: relative;
  }

  .blocks-palette__search-clear {
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.4);
    font-size: 16px;
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
    -webkit-tap-highlight-color: transparent;
  }

  .blocks-palette__search-clear--visible {
    display: flex;
  }

  .blocks-palette__list {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 24px;
  }

  .blocks-palette__list::-webkit-scrollbar {
    width: 4px;
  }

  .blocks-palette__list::-webkit-scrollbar-track {
    background: transparent;
  }

  .blocks-palette__list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 2px;
  }

  .blocks-palette__category {
    margin-bottom: 4px;
  }

  .blocks-palette__cat-header {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 48px;
    padding: 8px 4px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.8);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    text-align: left;
  }

  .blocks-palette__cat-header:active {
    background: rgba(255, 255, 255, 0.04);
  }

  .blocks-palette__cat-icon {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.6);
    flex-shrink: 0;
  }

  .blocks-palette__cat-label {
    flex: 1;
  }

  .blocks-palette__cat-count {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.35);
    font-weight: 400;
    margin-right: 4px;
  }

  .blocks-palette__cat-chevron {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.35);
    transition: transform 0.15s ease;
    flex-shrink: 0;
  }

  .blocks-palette__cat-chevron--expanded {
    transform: rotate(90deg);
  }

  .blocks-palette__cat-body {
    display: none;
    padding: 0 0 8px 0;
  }

  .blocks-palette__cat-body--expanded {
    display: block;
  }

  .blocks-palette__block-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 44px;
    padding: 8px 8px 8px 40px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.75);
    font-size: 13px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    text-align: left;
    border-radius: 6px;
    transition: background 0.1s;
  }

  .blocks-palette__block-item:active {
    background: rgba(255, 255, 255, 0.08);
  }

  .blocks-palette__block-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .blocks-palette__block-dot--event { background: #f59e0b; }
  .blocks-palette__block-dot--command { background: #3b82f6; }
  .blocks-palette__block-dot--state { background: #22c55e; }
  .blocks-palette__block-dot--payload { background: #a78bfa; }

  .blocks-palette__block-label {
    flex: 1;
    line-height: 1.3;
  }

  .blocks-palette__advanced-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    min-height: 36px;
    padding: 4px 8px 4px 40px;
    border: none;
    background: transparent;
    color: rgba(59, 130, 246, 0.8);
    font-size: 12px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .blocks-palette__advanced-toggle:active {
    color: rgba(59, 130, 246, 1);
  }

  .blocks-palette__disabled-placeholder {
    padding: 12px 8px 12px 40px;
    color: rgba(255, 255, 255, 0.4);
    font-size: 13px;
    line-height: 1.4;
  }

  .blocks-palette__enable-btn {
    display: inline-block;
    margin-top: 8px;
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid rgba(59, 130, 246, 0.4);
    background: rgba(59, 130, 246, 0.1);
    color: #60a5fa;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    min-height: 36px;
    -webkit-tap-highlight-color: transparent;
  }

  .blocks-palette__enable-btn:active {
    background: rgba(59, 130, 246, 0.2);
  }

  .blocks-palette__dep-prompt {
    padding: 6px 8px 6px 40px;
    color: rgba(245, 158, 11, 0.8);
    font-size: 12px;
    display: none;
  }

  .blocks-palette__dep-prompt--visible {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .blocks-palette__dep-enable {
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid rgba(245, 158, 11, 0.3);
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
  }

  .blocks-palette__empty-search {
    padding: 24px 8px;
    text-align: center;
    color: rgba(255, 255, 255, 0.4);
    font-size: 13px;
  }

  .blocks-palette__cat-tag {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.35);
    background: rgba(255, 255, 255, 0.06);
    padding: 2px 6px;
    border-radius: 4px;
    flex-shrink: 0;
  }
`;
