import type { AssetRegistry, AssetEntry, AssetGroup, AssetGroupType } from '@/editor/assets';
import type { EntityManager } from '@/editor/entities/entityManager';
import { makeGroupKey } from '@/editor/assets/groupKey';
import { collectAnimationReferences } from '@/editor/assets/animationRefs';
import { getAllScenes, saveScene } from '@/storage/hot';
import { resolveAssetUrl } from '@/shared/paths';
import type { Scene } from '@/types';
import { createAnimationClock } from '@/editor/canvas/animationClock';
import { uxFeedback } from '@/editor/uxFeedback';

const STYLES = `
  .asset-library {
    display: flex;
    flex-direction: column;
    gap: 12px;
    color: #e6ecff;
  }

  .asset-library__section {
    background: rgba(20, 30, 60, 0.85);
    border: 1px solid #253461;
    border-radius: 14px;
    padding: 12px;
  }

  .asset-library__title {
    font-size: 13px;
    font-weight: 700;
    color: #dbe4ff;
    margin-bottom: 8px;
  }

  .asset-library__row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .asset-library__select {
    min-height: 44px;
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid rgba(83, 101, 164, 0.6);
    background: rgba(22, 30, 60, 0.85);
    color: #f2f5ff;
    font-size: 13px;
  }

  .asset-library__button {
    min-height: 44px;
    padding: 8px 12px;
    border-radius: 12px;
    border: 2px solid transparent;
    background: #1b2a52;
    color: #dbe4ff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .asset-library__button:active {
    background: #26386a;
  }

  .asset-library__hint {
    font-size: 12px;
    color: #9aa7d6;
  }

  .asset-library__group {
    border-top: 1px solid rgba(37, 52, 97, 0.7);
    padding-top: 10px;
    margin-top: 10px;
  }

  .asset-library__group:first-of-type {
    border-top: none;
    padding-top: 0;
    margin-top: 0;
  }

  .asset-library__group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .asset-library__group-toggle {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: #1b2a52;
    color: #dbe4ff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
  }

  .asset-library__group-toggle:active {
    background: #26386a;
  }

  .asset-library__group-count {
    font-size: 12px;
    color: #9aa7d6;
  }

  .asset-library__group-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .asset-library__upload-status {
    font-size: 11px;
    color: #9aa7d6;
    max-width: 160px;
    text-align: right;
  }

  .asset-library__upload-status--error {
    color: #ffb6c1;
  }

  .asset-library__upload-status--success {
    color: #9fe8b1;
  }

  .asset-library__assets {
    margin-top: 10px;
    display: none;
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: 10px;
  }

  .asset-library__assets--open {
    display: grid;
  }

  .asset-library__asset {
    position: relative;
    border-radius: 12px;
    border: 2px solid transparent;
    background: rgba(22, 30, 60, 0.85);
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: #cfd8ff;
    font-size: 11px;
    cursor: pointer;
    min-height: 132px;
    min-width: 0;
  }

  .asset-library__asset--selected {
    border-color: #4a9eff;
    background: rgba(47, 59, 102, 0.9);
  }

  .asset-library__asset img,
  .asset-library__asset canvas {
    width: 100%;
    border-radius: 8px;
    object-fit: cover;
  }

  .asset-library__asset-name {
    font-size: 11px;
    color: #e6ecff;
    max-width: 100%;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-word;
  }

  .asset-library__asset-meta {
    font-size: 10px;
    color: #93a1d8;
  }

  .asset-library__asset-more {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 36px;
    height: 36px;
    border-radius: 999px;
    border: 1px solid rgba(83, 101, 164, 0.7);
    background: rgba(11, 18, 40, 0.78);
    color: #dbe4ff;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .asset-library__asset--organizing {
    border-color: rgba(98, 150, 255, 0.45);
    background: rgba(40, 52, 95, 0.95);
    box-shadow: 0 0 0 1px rgba(98, 150, 255, 0.25) inset;
    user-select: none;
  }

  .asset-library__drag-handle {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    border: 1px solid rgba(98, 150, 255, 0.45);
    background: rgba(17, 26, 53, 0.88);
    color: #dbe4ff;
    font-size: 18px;
    font-weight: 700;
    display: grid;
    place-items: center;
    touch-action: none;
    user-select: none;
    cursor: grab;
  }

  .asset-library__ghost {
    position: fixed;
    width: 84px;
    pointer-events: none;
    z-index: 80;
    opacity: 0.9;
    transform: scale(1.03);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.35);
  }

  .asset-library__placeholder {
    border-radius: 12px;
    border: 2px dashed rgba(116, 159, 255, 0.65);
    background: rgba(25, 39, 72, 0.4);
    min-height: 132px;
  }

  .asset-library__sheet-scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    opacity: 0;
    pointer-events: none;
    transition: opacity 140ms ease;
    z-index: 120;
  }

  .asset-library__sheet-scrim--open {
    opacity: 1;
    pointer-events: auto;
  }

  .asset-library__sheet {
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: max(12px, env(safe-area-inset-bottom));
    border: 1px solid rgba(83, 101, 164, 0.65);
    border-radius: 16px;
    background: rgba(20, 30, 60, 0.95);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transform: translateY(12px);
    transition: transform 140ms ease;
  }

  .asset-library__sheet-scrim--open .asset-library__sheet {
    transform: translateY(0);
  }

  .asset-library__sheet-title {
    font-size: 15px;
    font-weight: 700;
    color: #e6ecff;
    margin-bottom: 4px;
  }

  .asset-library__sheet-button {
    min-height: 44px;
    border-radius: 12px;
    border: 1px solid rgba(83, 101, 164, 0.65);
    background: rgba(27, 42, 82, 0.92);
    color: #e6ecff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .asset-library__sheet-button--danger {
    border-color: rgba(255, 128, 153, 0.8);
    color: #ffc5d2;
  }

  .asset-library__sheet-note {
    font-size: 12px;
    color: #b9c5ef;
  }

  .asset-library__empty {
    font-size: 12px;
    color: #9aa7d6;
    padding: 4px 0;
  }

  .asset-library__move-type-row {
    display: flex;
    gap: 6px;
  }

  .asset-library__move-type-btn {
    flex: 1;
    min-height: 40px;
    border-radius: 10px;
    border: 2px solid rgba(83, 101, 164, 0.5);
    background: rgba(22, 30, 60, 0.85);
    color: #dbe4ff;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .asset-library__move-type-btn--active {
    border-color: #4a9eff;
    background: rgba(47, 59, 102, 0.9);
  }

  .asset-library__move-group-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 200px;
    overflow-y: auto;
  }

  .asset-library__move-group-btn {
    min-height: 40px;
    border-radius: 10px;
    border: 1px solid rgba(83, 101, 164, 0.5);
    background: rgba(22, 30, 60, 0.85);
    color: #dbe4ff;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    padding: 8px 12px;
  }

  .asset-library__move-group-btn:active {
    background: rgba(47, 59, 102, 0.9);
  }

  .asset-library__move-group-btn--current {
    opacity: 0.4;
    cursor: default;
  }

  .asset-library__animations {
    margin-top: 12px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
    gap: 10px;
  }

  .asset-library__animation-card {
    border-radius: 12px;
    border: 2px solid transparent;
    background: rgba(22, 30, 60, 0.85);
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: #dbe4ff;
    font-size: 11px;
    position: relative;
  }

  .asset-library__animation-card img {
    width: 100%;
    border-radius: 10px;
    object-fit: cover;
  }

  .asset-library__animation-meta {
    font-size: 10px;
    color: #93a1d8;
  }

  .asset-library__animation-delete {
    position: absolute;
    top: 6px;
    right: 6px;
    min-width: 28px;
    min-height: 28px;
    border-radius: 999px;
    border: none;
    background: rgba(22, 30, 60, 0.9);
    color: #ffb6c1;
    font-size: 12px;
    cursor: pointer;
  }

  .asset-library__animation-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .asset-library__animation-action {
    min-height: 32px;
    border: 1px solid rgba(83, 101, 164, 0.6);
    border-radius: 8px;
    background: rgba(18, 26, 52, 0.85);
    color: #dbe4ff;
    font-size: 11px;
    padding: 4px 8px;
    cursor: pointer;
  }

  .asset-library__animation-card canvas {
    width: 100%;
    border-radius: 10px;
    image-rendering: pixelated;
    display: block;
  }

  .asset-library__anim-section {
    margin-top: 12px;
  }

  .asset-library__anim-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }

  .asset-library__anim-search {
    width: 100%;
    margin-bottom: 10px;
  }

  .asset-library__anim-rename-row {
    display: flex;
    gap: 4px;
    align-items: center;
    margin-top: 4px;
  }

  .asset-library__anim-rename-input {
    flex: 1;
    min-height: 36px;
    padding: 4px 8px;
    min-width: 0;
  }

  .asset-library__anim-rename-btn {
    min-height: 36px;
    padding: 4px 8px;
    border-radius: 8px;
    border: 1px solid rgba(83, 101, 164, 0.6);
    background: rgba(27, 42, 82, 0.92);
    color: #dbe4ff;
    font-size: 11px;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .asset-library__anim-where-used {
    margin-top: 6px;
    padding: 6px 8px;
    border-radius: 8px;
    background: rgba(15, 22, 48, 0.9);
    border: 1px solid rgba(83, 101, 164, 0.5);
    font-size: 10px;
    color: #aabcef;
    max-height: 120px;
    overflow-y: auto;
  }

  .asset-library__anim-where-used-hit {
    padding: 3px 0;
    border-bottom: 1px solid rgba(83, 101, 164, 0.2);
    word-break: break-word;
  }

  .asset-library__anim-where-used-hit:last-child {
    border-bottom: none;
  }

  .asset-library__anim-delete-confirm {
    margin-top: 6px;
    padding: 6px 8px;
    border-radius: 8px;
    background: rgba(40, 15, 20, 0.9);
    border: 1px solid rgba(255, 128, 153, 0.4);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .asset-library__anim-delete-label {
    font-size: 10px;
    color: #ffc5d2;
  }

  .asset-library__anim-delete-row {
    display: flex;
    gap: 6px;
  }

  .asset-library__anim-delete-btn {
    flex: 1;
    min-height: 32px;
    border-radius: 8px;
    border: 1px solid rgba(255, 128, 153, 0.8);
    background: rgba(80, 20, 30, 0.9);
    color: #ffc5d2;
    font-size: 11px;
    cursor: pointer;
  }

  .asset-library__anim-cancel-btn {
    flex: 1;
    min-height: 32px;
    border-radius: 8px;
    border: 1px solid rgba(83, 101, 164, 0.6);
    background: rgba(27, 42, 82, 0.92);
    color: #dbe4ff;
    font-size: 11px;
    cursor: pointer;
  }

  .asset-library__anim-set-create-inline {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-top: 6px;
    flex-wrap: wrap;
  }

  .asset-library__anim-set-create-input {
    flex: 1;
    min-width: 100px;
  }

  .asset-library__anim-scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    opacity: 0;
    pointer-events: none;
    transition: opacity 140ms ease;
    z-index: 120;
  }

  .asset-library__anim-scrim--open {
    opacity: 1;
    pointer-events: auto;
  }

  .asset-library__direction-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
    border-bottom: 1px solid rgba(83, 101, 164, 0.3);
  }

  .asset-library__direction-row:last-of-type {
    border-bottom: none;
  }

  .asset-library__direction-label {
    width: 48px;
    font-size: 12px;
    color: #9aa7d6;
    flex-shrink: 0;
  }

  .asset-library__direction-select {
    flex: 1;
    min-height: 44px;
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid rgba(83, 101, 164, 0.6);
    background: rgba(22, 30, 60, 0.85);
    color: #f2f5ff;
    font-size: 12px;
  }

  .asset-library__direction-preview {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 6px;
    background: rgba(22, 30, 60, 0.6);
    border: 1px solid rgba(83, 101, 164, 0.3);
    image-rendering: pixelated;
  }

  .asset-library__animation-card--where-used-open {
    border-color: rgba(98, 150, 255, 0.5);
  }

  .asset-library__animation-card--delete-open {
    border-color: rgba(255, 128, 153, 0.5);
  }

  .asset-library__anim-no-match {
    font-size: 12px;
    color: #9aa7d6;
    padding: 8px 0;
    grid-column: 1 / -1;
  }
`;

export interface AssetLibraryTabConfig {
  container: HTMLElement;
  assetRegistry: AssetRegistry;
  uploadEnabled?: boolean;
  onOpenAnimation?: (animationId: string) => void;
  getCurrentScene?: () => Scene | null;
  entityManager?: EntityManager;
}

export interface AssetLibraryTabController {
  refresh(): void;
  destroy(): void;
}

const GROUP_TYPE_LABELS: Record<AssetGroupType, string> = {
  tilesets: 'Tilesets',
  props: 'Props',
  entities: 'Entities',
};

export function createAssetLibraryTab(config: AssetLibraryTabConfig): AssetLibraryTabController {
  const {
    container,
    assetRegistry,
    uploadEnabled = false,
    onOpenAnimation,
    getCurrentScene,
    entityManager,
  } = config;

  function syncActiveSceneEntityProperties(
    sceneId: string,
    updatesByEntityId: Map<string, Record<string, string | number | boolean | undefined>>
  ): void {
    if (!entityManager || !getCurrentScene) return;
    const currentScene = getCurrentScene();
    if (!currentScene || currentScene.id !== sceneId || updatesByEntityId.size === 0) return;
    entityManager.updateEntityProperties(
      Array.from(updatesByEntityId.entries()).map(([id, properties]) => ({ id, properties }))
    );
  }

  async function clearAnimationSetEntityReferences(animationSetId: string): Promise<number> {
    const scenes = await getAllScenes();
    let clearedCount = 0;

    for (const scene of scenes) {
      let changed = false;
      const activeSceneUpdates = new Map<string, Record<string, string | number | boolean | undefined>>();
      const nextEntities = scene.entities.map((entity) => {
        if (entity.properties?.animationSetId !== animationSetId) return entity;
        changed = true;
        clearedCount += 1;
        const nextProperties = { ...(entity.properties ?? {}) };
        delete nextProperties.animationSetId;
        activeSceneUpdates.set(entity.id, { animationSetId: undefined });
        return { ...entity, properties: nextProperties };
      });

      if (!changed) continue;
      await saveScene({ ...scene, entities: nextEntities });
      syncActiveSceneEntityProperties(scene.id, activeSceneUpdates);
    }

    return clearedCount;
  }

  if (!document.getElementById('asset-library-tab-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'asset-library-tab-styles';
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);
  }

  const expandedGroups = new Set<string>();
  let organizeGroupKey: string | null = null;
  const uploadStatus = new Map<
    string,
    { state: 'idle' | 'uploading' | 'success' | 'error'; message: string }
  >();
  let sheetAssetId: string | null = null;
  let sheetView: 'menu' | 'rename' | 'delete-confirm' | 'move-to' = 'menu';
  let moveToType: AssetGroupType = 'tilesets';

  type DragState = {
    groupType: AssetGroupType;
    groupSlug: string;
    assetId: string;
    fromIndex: number;
    pointerId: number;
    captureEl: HTMLElement;
    card: HTMLElement;
    grid: HTMLElement;
    ghost: HTMLElement;
    placeholder: HTMLElement;
    offsetX: number;
    offsetY: number;
    toIndex: number;
    lastTargetIndex: number;
    /** When dragging across groups, tracks the current target group */
    targetGroupType: AssetGroupType;
    targetGroupSlug: string;
    targetGrid: HTMLElement;
  };
  let dragState: DragState | null = null;

  // --- Animation tab state ---
  const animationClock = createAnimationClock();
  const sourceImageCache = new Map<string, HTMLImageElement>();
  const animationCanvases = new Map<string, HTMLCanvasElement>();
  // direction facing → preview canvas (inside Assign Directions sheet)
  const directionPreviewCanvasMap = new Map<string, HTMLCanvasElement[]>();
  let rafHandle: number | null = null;
  let lastRafTime: number | null = null;
  let animIntersectionObserver: IntersectionObserver | null = null;

  let animFilter = '';
  let animationsCollapsed = false;
  let activeWhereUsedId: string | null = null;
  let activeDeleteId: string | null = null;
  let activeRenameId: string | null = null;
  let inlineSetCreateOpen = false;
  let activeSetRenameId: string | null = null;
  let activeSetDeleteId: string | null = null;
  let directionSheetSetId: string | null = null;

  function loadSourceImage(sourceAssetId: string): void {
    if (sourceImageCache.has(sourceAssetId)) return;
    const entry = assetRegistry.getAsset(sourceAssetId);
    if (!entry) return;
    const img = new Image();
    // Place placeholder immediately so we don't double-load
    sourceImageCache.set(sourceAssetId, img);
    img.onload = () => {
      // Redraw any canvas whose current frame references this source
      for (const [animId, canvas] of animationCanvases.entries()) {
        const snap = animationClock.getCurrentFrameSnapshot(animId);
        if (snap && snap.frame.sourceAssetId === sourceAssetId) {
          drawAnimationFrame(animId, canvas);
        }
      }
    };
    img.src = resolveAssetUrl(entry.dataUrl);
  }

  function drawAnimationFrame(animId: string, canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const snapshot = animationClock.getCurrentFrameSnapshot(animId);
    if (!snapshot) return;
    const { frame } = snapshot;
    const img = sourceImageCache.get(frame.sourceAssetId);
    if (!img || !img.complete || img.naturalWidth === 0) return;
    const { x, y, w, h } = frame.rect;
    ctx.imageSmoothingEnabled = false;
    const scale = Math.min(canvas.width / w, canvas.height / h);
    const dw = w * scale;
    const dh = h * scale;
    const dx = (canvas.width - dw) / 2;
    const dy = (canvas.height - dh) / 2;
    ctx.drawImage(img, x, y, w, h, dx, dy, dw, dh);
  }

  function startRafLoop(): void {
    if (rafHandle !== null) return;
    const tick = (time: number) => {
      if (lastRafTime !== null) {
        const delta = Math.min(time - lastRafTime, 100);
        const dirty = animationClock.tick(delta);
        for (const animId of dirty) {
          const canvas = animationCanvases.get(animId);
          if (canvas) drawAnimationFrame(animId, canvas);
          // Also update any direction-preview canvases for this animation
          const dirCanvases = directionPreviewCanvasMap.get(animId);
          if (dirCanvases) {
            for (const dc of dirCanvases) drawAnimationFrame(animId, dc);
          }
        }
      }
      lastRafTime = time;
      rafHandle = requestAnimationFrame(tick);
    };
    rafHandle = requestAnimationFrame(tick);
  }

  function stopRafLoop(): void {
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
      lastRafTime = null;
    }
  }

  const root = document.createElement('div');
  root.className = 'asset-library';

  const createSection = document.createElement('section');
  createSection.className = 'asset-library__section';

  const createTitle = document.createElement('div');
  createTitle.className = 'asset-library__title';
  createTitle.textContent = 'Create Group';

  const createRow = document.createElement('div');
  createRow.className = 'asset-library__row';

  const nameInput = document.createElement('input');
  nameInput.className = 'irs-input';
  nameInput.type = 'text';
  nameInput.placeholder = 'Group name (e.g., Trees)';
  nameInput.maxLength = 32;

  const typeSelect = document.createElement('select');
  typeSelect.className = 'asset-library__select';
  typeSelect.innerHTML = `
    <option value="tilesets">Tilesets</option>
    <option value="props">Props</option>
    <option value="entities">Entities</option>
  `;

  const createButton = document.createElement('button');
  createButton.type = 'button';
  createButton.className = 'asset-library__button';
  createButton.textContent = 'Add Group';

  const createHint = document.createElement('div');
  createHint.className = 'asset-library__hint';
  createHint.textContent = 'Groups organize assets for paint, props, and entity palettes.';

  createRow.appendChild(nameInput);
  createRow.appendChild(typeSelect);
  createRow.appendChild(createButton);
  createSection.appendChild(createTitle);
  createSection.appendChild(createRow);
  createSection.appendChild(createHint);

  root.appendChild(createSection);

  const librarySection = document.createElement('section');
  librarySection.className = 'asset-library__section';

  const libraryTitle = document.createElement('div');
  libraryTitle.className = 'asset-library__title';
  libraryTitle.textContent = 'Assets Library';

  librarySection.appendChild(libraryTitle);
  root.appendChild(librarySection);

  const sheetScrim = document.createElement('div');
  sheetScrim.className = 'asset-library__sheet-scrim';
  sheetScrim.addEventListener('click', () => {
    sheetAssetId = null;
    refresh();
  });
  root.appendChild(sheetScrim);

  // Separate scrim for animation direction assignment bottom sheet
  const animScrim = document.createElement('div');
  animScrim.className = 'asset-library__anim-scrim';
  animScrim.addEventListener('click', () => {
    directionSheetSetId = null;
    renderAnimSheet();
  });
  root.appendChild(animScrim);

  container.appendChild(root);

  function groupKey(group: AssetGroup): string {
    return `${group.type}:${group.slug}`;
  }

  function openAssetSheet(assetId: string, view: 'menu' | 'rename' | 'delete-confirm' | 'move-to' = 'menu'): void {
    sheetAssetId = assetId;
    sheetView = view;
    refresh();
  }

  function findClosestIndex(cards: HTMLElement[], pointerX: number, pointerY: number): number {
    if (cards.length === 0) return 0;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((entry, index) => {
      const rect = entry.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = pointerX - centerX;
      const dy = pointerY - centerY;
      const distance = Math.hypot(dx, dy);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    const closestRect = cards[closestIndex].getBoundingClientRect();
    const centerX = closestRect.left + closestRect.width / 2;
    const centerY = closestRect.top + closestRect.height / 2;
    const horizontalBias = Math.abs(pointerX - centerX) > Math.abs(pointerY - centerY);
    const after = horizontalBias ? pointerX > centerX : pointerY > centerY;
    return after ? closestIndex + 1 : closestIndex;
  }

  function beginDrag(options: {
    event: PointerEvent;
    card: HTMLElement;
    grid: HTMLElement;
    group: AssetGroup;
    fromIndex: number;
    assetId: string;
    captureEl: HTMLElement;
  }): void {
    if (dragState) return;
    const { event, card, grid, group, fromIndex, assetId, captureEl } = options;
    const rect = card.getBoundingClientRect();
    const ghost = card.cloneNode(true) as HTMLElement;
    ghost.classList.add('asset-library__ghost');
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    document.body.appendChild(ghost);

    const placeholder = document.createElement('div');
    placeholder.className = 'asset-library__placeholder';
    placeholder.style.width = `${rect.width}px`;
    placeholder.style.height = `${rect.height}px`;
    grid.insertBefore(placeholder, card);
    card.style.display = 'none';

    dragState = {
      groupType: group.type,
      groupSlug: group.slug,
      assetId,
      fromIndex,
      pointerId: event.pointerId,
      captureEl,
      card,
      grid,
      ghost,
      placeholder,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      toIndex: fromIndex,
      lastTargetIndex: fromIndex,
      targetGroupType: group.type,
      targetGroupSlug: group.slug,
      targetGrid: grid,
    };

    captureEl.addEventListener('pointermove', handleDragMove);
    captureEl.addEventListener('pointerup', finishDrag);
    captureEl.addEventListener('pointercancel', finishDrag);
    captureEl.addEventListener('lostpointercapture', finishDragOnCaptureLoss);
  }

  function handleDragMove(event: PointerEvent): void {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const active = dragState;
    active.ghost.style.left = `${event.clientX - active.offsetX}px`;
    active.ghost.style.top = `${event.clientY - active.offsetY}px`;

    // Detect cross-group movement: find which group grid the pointer is over
    const elementUnderPointer = document.elementFromPoint(event.clientX, event.clientY);
    const gridUnderPointer = elementUnderPointer?.closest<HTMLElement>('[data-group-key]');
    if (gridUnderPointer && gridUnderPointer !== active.targetGrid) {
      const keyAttr = gridUnderPointer.getAttribute('data-group-key');
      if (keyAttr) {
        const colonIdx = keyAttr.indexOf(':');
        if (colonIdx > 0) {
          const newType = keyAttr.slice(0, colonIdx) as AssetGroupType;
          const newSlug = keyAttr.slice(colonIdx + 1);
          // Move placeholder to the new grid
          active.placeholder.remove();
          gridUnderPointer.appendChild(active.placeholder);
          active.targetGrid = gridUnderPointer;
          active.targetGroupType = newType;
          active.targetGroupSlug = newSlug;
          active.lastTargetIndex = -1; // Force recalc
        }
      }
    }

    const cardNodes = Array.from(active.targetGrid.querySelectorAll<HTMLElement>('.asset-library__asset')).filter(
      (node) => node !== active.card
    );
    const targetIndex = findClosestIndex(cardNodes, event.clientX, event.clientY);
    active.toIndex = targetIndex;
    if (targetIndex !== active.lastTargetIndex) {
      active.lastTargetIndex = targetIndex;
      const nextTarget = cardNodes[targetIndex] ?? null;
      if (nextTarget) {
        active.targetGrid.insertBefore(active.placeholder, nextTarget);
      } else {
        active.targetGrid.appendChild(active.placeholder);
      }
    }

    const edge = 72;
    const bounds = container.getBoundingClientRect();
    if (event.clientY < bounds.top + edge) {
      container.scrollTop -= 10;
    } else if (event.clientY > bounds.bottom - edge) {
      container.scrollTop += 10;
    }
  }

  function finishDrag(event: PointerEvent): void {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const next = dragState;
    dragState = null;
    next.captureEl.removeEventListener('pointermove', handleDragMove);
    next.captureEl.removeEventListener('pointerup', finishDrag);
    next.captureEl.removeEventListener('pointercancel', finishDrag);
    next.captureEl.removeEventListener('lostpointercapture', finishDragOnCaptureLoss);

    next.ghost.remove();
    next.placeholder.remove();
    next.card.style.display = '';

    const crossGroup =
      next.targetGroupType !== next.groupType ||
      next.targetGroupSlug !== next.groupSlug;

    if (crossGroup) {
      // Cross-group move
      assetRegistry.moveAsset({
        assetId: next.assetId,
        toGroupType: next.targetGroupType,
        toGroupSlug: next.targetGroupSlug,
        toIndex: next.toIndex,
      });
      refresh();
    } else {
      const didReorder = next.toIndex !== next.fromIndex;
      if (didReorder) {
        assetRegistry.reorderAsset({
          groupType: next.groupType,
          groupSlug: next.groupSlug,
          fromIndex: next.fromIndex,
          toIndex: next.toIndex,
        });
        refresh();
      }
    }
  }

  function finishDragOnCaptureLoss(event: Event): void {
    if (!(event instanceof PointerEvent)) return;
    finishDrag(event);
  }

  function renderAssets(group: AssetGroup, selectedAssetId: string | null, organizeMode: boolean): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'asset-library__assets';
    wrapper.setAttribute('data-group-key', makeGroupKey(group.type, group.slug));

    if (group.assets.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'asset-library__empty';
      empty.textContent = 'No assets in this group yet.';
      wrapper.appendChild(empty);
      return wrapper;
    }

    group.assets.forEach((asset, index) => {
      wrapper.appendChild(renderAssetCard({
        group,
        asset,
        assetIndex: index,
        selectedAssetId,
        organizeMode,
        openAssetSheet,
      }));
    });
    return wrapper;
  }

  function renderSliceThumbnail(asset: AssetEntry): HTMLElement {
    const rect = asset.rect!;
    const canvas = document.createElement('canvas');
    const thumbSize = 72;
    canvas.width = thumbSize;
    canvas.height = thumbSize;
    canvas.style.imageRendering = 'pixelated';

    const sourceUrl = resolveAssetUrl(asset.dataUrl);
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      const scale = Math.min(thumbSize / rect.w, thumbSize / rect.h);
      const dw = rect.w * scale;
      const dh = rect.h * scale;
      const dx = (thumbSize - dw) / 2;
      const dy = (thumbSize - dh) / 2;
      ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, dx, dy, dw, dh);
    };
    img.src = sourceUrl;
    return canvas;
  }

  function renderAssetCard(options: {
    group: AssetGroup;
    asset: AssetEntry;
    assetIndex: number;
    selectedAssetId: string | null;
    organizeMode: boolean;
    openAssetSheet: (assetId: string, view?: 'menu' | 'rename' | 'delete-confirm' | 'move-to') => void;
  }): HTMLElement {
    const { group, asset, assetIndex, selectedAssetId, organizeMode, openAssetSheet } = options;
    const card = document.createElement('div');
    card.className = 'asset-library__asset';
    card.classList.toggle('asset-library__asset--selected', asset.id === selectedAssetId);

    if (asset.sourceAssetId && asset.rect) {
      card.appendChild(renderSliceThumbnail(asset));
    } else {
      const img = document.createElement('img');
      img.src = resolveAssetUrl(asset.dataUrl);
      img.alt = asset.name;
      card.appendChild(img);
    }

    const name = document.createElement('div');
    name.className = 'asset-library__asset-name';
    name.textContent = asset.name;
    card.appendChild(name);

    const meta = document.createElement('div');
    meta.className = 'asset-library__asset-meta';
    const sizeLabel = asset.width > 0 && asset.height > 0 ? `${asset.width}×${asset.height}` : 'Size unknown';
    const sourceLabel = asset.source === 'repo' ? 'Repo' : 'Local';
    const sliceLabel = asset.sourceAssetId ? ' · Slice' : '';
    meta.textContent = `${sizeLabel} · ${sourceLabel}${sliceLabel}`;

    card.appendChild(meta);

    if (organizeMode) {
      card.classList.add('asset-library__asset--organizing');
      const dragHandle = document.createElement('div');
      dragHandle.className = 'asset-library__drag-handle';
      dragHandle.textContent = '≡';
      dragHandle.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
        event.preventDefault();
        dragHandle.setPointerCapture(event.pointerId);
        beginDrag({
          event,
          card,
          grid: card.parentElement as HTMLElement,
          group,
          fromIndex: assetIndex,
          assetId: asset.id,
          captureEl: dragHandle,
        });
      });
      card.appendChild(dragHandle);

      let longPressTimer: number | null = null;
      let originX = 0;
      let originY = 0;
      card.addEventListener('pointerdown', (event) => {
        if (event.target === dragHandle) return;
        originX = event.clientX;
        originY = event.clientY;
        longPressTimer = window.setTimeout(() => {
          card.setPointerCapture(event.pointerId);
          beginDrag({
            event,
            card,
            grid: card.parentElement as HTMLElement,
            group,
            fromIndex: assetIndex,
            assetId: asset.id,
            captureEl: card,
          });
          longPressTimer = null;
        }, 300);
      });
      card.addEventListener('pointermove', (event) => {
        if (longPressTimer === null) return;
        const moved = Math.hypot(event.clientX - originX, event.clientY - originY);
        if (moved > 8) {
          window.clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      });
      const clearLongPress = () => {
        if (longPressTimer !== null) {
          window.clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      };
      card.addEventListener('pointerup', clearLongPress);
      card.addEventListener('pointercancel', clearLongPress);
    } else if (organizeGroupKey === null) {
      const moreButton = document.createElement('button');
      moreButton.type = 'button';
      moreButton.className = 'asset-library__asset-more';
      moreButton.textContent = '⋯';
      moreButton.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
      });
      moreButton.addEventListener('click', (event) => {
        event.stopPropagation();
        openAssetSheet(asset.id);
      });
      card.appendChild(moreButton);
    }

    card.addEventListener('click', () => {
      if (organizeGroupKey !== null) return;
      uxFeedback.selection.mark(card);
      assetRegistry.setSelectedAsset(asset.id);
    });

    return card;
  }

  function renderGroups(groups: AssetGroup[], selectedAssetId: string | null): void {
    librarySection.querySelectorAll('.asset-library__group').forEach((node) => node.remove());
    librarySection.querySelectorAll('.asset-library__empty, .irs-empty-state').forEach((node) => node.remove());

    if (groups.length === 0) {
      const emptyContainer = document.createElement('div');
      uxFeedback.emptyState.render(emptyContainer, {
        message: 'No assets yet.',
        actionLabel: 'Import Asset',
        onAction: () => nameInput.focus(),
      });
      librarySection.appendChild(emptyContainer);
      return;
    }

    const groupsByType = groups.reduce<Record<AssetGroupType, AssetGroup[]>>(
      (acc, group) => {
        acc[group.type].push(group);
        return acc;
      },
      { tilesets: [], props: [], entities: [] }
    );

    (Object.keys(GROUP_TYPE_LABELS) as AssetGroupType[]).forEach((type) => {
      const typeGroups = groupsByType[type];
      if (typeGroups.length === 0) return;

      typeGroups.forEach((group) => {
        const groupWrapper = document.createElement('div');
        groupWrapper.className = 'asset-library__group';

        const header = document.createElement('div');
        header.className = 'asset-library__group-header';

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'asset-library__group-toggle';
        const key = groupKey(group);
        const isOpen = expandedGroups.has(key) || group.assets.length > 0;
        if (isOpen) {
          expandedGroups.add(key);
        }

        toggle.innerHTML = `
          <span>${GROUP_TYPE_LABELS[group.type]} · ${group.name}</span>
          <span class="asset-library__group-count">${group.assets.length} assets</span>
        `;

        const organizeEnabled = organizeGroupKey === key;
        if (organizeEnabled) {
          expandedGroups.add(key);
        }

        const organizeToggle = document.createElement('button');
        organizeToggle.type = 'button';
        organizeToggle.className = 'asset-library__button';
        organizeToggle.textContent = organizeEnabled ? 'Done' : 'Organize';
        organizeToggle.addEventListener('click', (event) => {
          event.stopPropagation();
          organizeGroupKey = organizeEnabled ? null : key;
          if (!organizeEnabled) expandedGroups.add(key);
          refresh();
        });

        const assetsContainer = renderAssets(group, selectedAssetId, organizeEnabled);
        assetsContainer.classList.toggle('asset-library__assets--open', isOpen);

        toggle.addEventListener('click', () => {
          const open = !expandedGroups.has(key);
          if (open) {
            expandedGroups.add(key);
          } else {
            expandedGroups.delete(key);
          }
          assetsContainer.classList.toggle('asset-library__assets--open', open);
        });

        header.appendChild(toggle);

        if (uploadEnabled) {
          const actions = document.createElement('div');
          actions.className = 'asset-library__group-actions';

          const status = document.createElement('div');
          status.className = 'asset-library__upload-status';

          const statusKey = groupKey(group);
          const currentStatus = uploadStatus.get(statusKey);
          if (currentStatus) {
            status.textContent = currentStatus.message;
            status.classList.toggle(
              'asset-library__upload-status--error',
              currentStatus.state === 'error'
            );
            status.classList.toggle(
              'asset-library__upload-status--success',
              currentStatus.state === 'success'
            );
          }

          const uploadButton = document.createElement('button');
          uploadButton.type = 'button';
          uploadButton.className = 'asset-library__button';
          uploadButton.textContent = 'Upload';

          const hasLocalAssets = group.assets.some((asset) => asset.source === 'local');
          const isUploading = currentStatus?.state === 'uploading';
          if (!hasLocalAssets) {
            uploadButton.disabled = true;
            status.textContent = status.textContent || 'No local assets';
          }
          if (isUploading) {
            uploadButton.disabled = true;
          }

          uploadButton.addEventListener('click', async () => {
            uploadStatus.set(statusKey, {
              state: 'uploading',
              message: 'Preparing upload...',
            });
            refresh();

            try {
              const result = await assetRegistry.uploadGroup({
                groupType: group.type,
                groupSlug: group.slug,
                onProgress: (progress) => {
                  uploadStatus.set(statusKey, {
                    state: 'uploading',
                    message: `Uploading ${progress.current}/${progress.total}…`,
                  });
                  refresh();
                },
              });

              const successCount = result.results.filter((entry) => entry.success).length;
              const failCount = result.results.filter((entry) => !entry.success).length;
              const message = result.error
                ? result.error
                : failCount === 0
                  ? `Uploaded ${successCount} files`
                  : `Uploaded ${successCount}, ${failCount} failed`;

              uploadStatus.set(statusKey, {
                state: failCount === 0 && !result.error ? 'success' : 'error',
                message,
              });
              if (failCount === 0 && !result.error) {
                uxFeedback.motion.pulse(uploadButton);
                uxFeedback.toast.success(`Uploaded ${successCount} files.`);
              } else {
                uxFeedback.toast.error(message);
              }
            } catch (error) {
              const errMsg = error instanceof Error ? error.message : 'Upload failed.';
              uploadStatus.set(statusKey, {
                state: 'error',
                message: errMsg,
              });
              uxFeedback.toast.error(errMsg);
            }

            refresh();
          });

          actions.appendChild(status);
          actions.appendChild(uploadButton);
          actions.prepend(organizeToggle);
          header.appendChild(actions);
        } else {
          const actions = document.createElement('div');
          actions.className = 'asset-library__group-actions';
          actions.appendChild(organizeToggle);
          header.appendChild(actions);
        }

        groupWrapper.appendChild(header);
        groupWrapper.appendChild(assetsContainer);
        librarySection.appendChild(groupWrapper);
      });
    });
  }

  function renderAnimations(): void {
    // Clean up old canvases / observers before rebuilding
    animIntersectionObserver?.disconnect();
    animationCanvases.clear();
    animationClock.destroy();

    librarySection.querySelectorAll('.asset-library__anim-section')
      .forEach((node) => node.remove());

    const animations = assetRegistry.getAnimations();
    const animationSets = assetRegistry.getAnimationSets();

    const fallbackPoster =
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="%23121a30"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="%239aa7d6" font-size="12" font-family="sans-serif">Anim</text></svg>`
      );

    // ── Outer collapsible section ──────────────────────────────────────
    const section = document.createElement('div');
    section.className = 'asset-library__anim-section';

    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'asset-library__anim-section-header';

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'asset-library__group-toggle';
    toggleBtn.innerHTML = `
      <span>${animationsCollapsed ? '▶' : '▼'} Animations</span>
      <span class="asset-library__group-count">${animations.length} clips · ${animationSets.length} sets</span>
    `;
    toggleBtn.addEventListener('click', () => {
      animationsCollapsed = !animationsCollapsed;
      refresh();
    });

    sectionHeader.appendChild(toggleBtn);
    section.appendChild(sectionHeader);

    if (!animationsCollapsed) {
      // ── Search / filter input ────────────────────────────────────────
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.className = 'irs-input asset-library__anim-search';
      searchInput.placeholder = 'Search animations…';
      searchInput.value = animFilter;
      searchInput.addEventListener('input', () => {
        animFilter = searchInput.value;
        const lower = animFilter.toLowerCase();
        // Filter cards in-place without full refresh so the input keeps focus
        const cardEls = grid.querySelectorAll<HTMLElement>('[data-anim-id]');
        let visibleCount = 0;
        cardEls.forEach((cardEl) => {
          const name = (cardEl.dataset.animName ?? '').toLowerCase();
          const visible = !lower || name.includes(lower);
          cardEl.style.display = visible ? '' : 'none';
          if (visible) visibleCount += 1;
        });
        noMatchMsg.style.display = visibleCount === 0 && animations.length > 0 ? '' : 'none';
      });
      section.appendChild(searchInput);

      // ── Clips grid ──────────────────────────────────────────────────
      const grid = document.createElement('div');
      grid.className = 'asset-library__animations';

      const noMatchMsg = document.createElement('div');
      noMatchMsg.className = 'asset-library__anim-no-match';
      noMatchMsg.textContent = 'No animations match.';
      noMatchMsg.style.display = 'none';
      grid.appendChild(noMatchMsg);

      if (animations.length === 0) {
        const emptyContainer = document.createElement('div');
        uxFeedback.emptyState.render(emptyContainer, {
          message: 'No animations yet.',
          actionLabel: 'New Animation',
          onAction: () => config.onOpenAnimation?.(''),
        });
        grid.appendChild(emptyContainer);
      }

      // Set up IntersectionObserver for visibility-based clock register/unregister
      animIntersectionObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          const animId = (entry.target as HTMLElement).dataset.animId;
          if (!animId) continue;
          if (entry.isIntersecting) {
            const anim = assetRegistry.getAnimation(animId);
            if (anim) animationClock.register(animId, anim);
          } else {
            animationClock.unregister(animId);
          }
        }
      }, { threshold: 0 });

      animations.forEach((animation) => {
        const lower = animFilter.toLowerCase();
        const isVisible = !lower || animation.name.toLowerCase().includes(lower);

        const card = document.createElement('div');
        card.className = 'asset-library__animation-card';
        card.dataset.animId = animation.id;
        card.dataset.animName = animation.name;
        if (!isVisible) card.style.display = 'none';

        // Card click → open animation in editor
        card.addEventListener('click', () => {
          // Only open if no inline UI is active on this card
          if (activeRenameId === animation.id || activeDeleteId === animation.id || activeWhereUsedId === animation.id) return;
          uxFeedback.selection.mark(card);
          onOpenAnimation?.(animation.id);
        });

        // ── Live canvas thumbnail ──
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 96;
        thumbCanvas.height = 96;
        thumbCanvas.style.imageRendering = 'pixelated';
        thumbCanvas.dataset.animId = animation.id;

        // Show posterDataUrl (or SVG placeholder) as fallback while source image loads
        {
          const posterSrc = animation.posterDataUrl ?? fallbackPoster;
          const ctx = thumbCanvas.getContext('2d');
          if (ctx) {
            const posterImg = new Image();
            posterImg.onload = () => {
              ctx.drawImage(posterImg, 0, 0, thumbCanvas.width, thumbCanvas.height);
            };
            posterImg.src = posterSrc;
          }
        }

        // Pre-load source images for all frames
        animation.frames.forEach((frame) => {
          loadSourceImage(frame.sourceAssetId);
        });

        animationCanvases.set(animation.id, thumbCanvas);
        // Observe for clock register/unregister
        animIntersectionObserver!.observe(thumbCanvas);
        // Eagerly register (observer may not fire synchronously)
        animationClock.register(animation.id, animation);

        card.appendChild(thumbCanvas);

        // ── Name / inline rename ──
        const nameDiv = document.createElement('div');
        nameDiv.className = 'asset-library__asset-name';
        nameDiv.textContent = animation.name;

        if (activeRenameId === animation.id) {
          // Show inline rename row
          const renameRow = document.createElement('div');
          renameRow.className = 'asset-library__anim-rename-row';
          renameRow.addEventListener('click', (e) => e.stopPropagation());

          const renameInput = document.createElement('input');
          renameInput.type = 'text';
          renameInput.className = 'irs-input asset-library__anim-rename-input';
          renameInput.value = animation.name;
          renameInput.maxLength = 64;

          const commitRename = () => {
            const trimmed = renameInput.value.trim();
            if (trimmed && trimmed !== animation.name) {
              assetRegistry.updateAnimation(animation.id, { name: trimmed });
            }
            activeRenameId = null;
            refresh();
          };
          const cancelRename = () => {
            activeRenameId = null;
            refresh();
          };

          renameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
            if (e.key === 'Escape') { e.preventDefault(); cancelRename(); }
          });
          renameInput.addEventListener('blur', commitRename);

          const okBtn = document.createElement('button');
          okBtn.type = 'button';
          okBtn.className = 'asset-library__anim-rename-btn';
          okBtn.textContent = '✓';
          okBtn.addEventListener('mousedown', (e) => e.preventDefault()); // prevent blur on input
          okBtn.addEventListener('click', (e) => { e.stopPropagation(); commitRename(); });

          const cancelBtn = document.createElement('button');
          cancelBtn.type = 'button';
          cancelBtn.className = 'asset-library__anim-rename-btn';
          cancelBtn.textContent = '✕';
          cancelBtn.addEventListener('mousedown', (e) => e.preventDefault());
          cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); cancelRename(); });

          renameRow.appendChild(renameInput);
          renameRow.appendChild(okBtn);
          renameRow.appendChild(cancelBtn);
          card.appendChild(renameRow);
          queueMicrotask(() => { renameInput.focus(); renameInput.select(); });
        } else {
          card.appendChild(nameDiv);
        }

        // ── Meta ──
        const meta = document.createElement('div');
        meta.className = 'asset-library__animation-meta';
        meta.textContent = `${animation.frames.length} frames · ${animation.fps} fps`;
        card.appendChild(meta);

        // ── Action buttons ──
        const actions = document.createElement('div');
        actions.className = 'asset-library__animation-actions';

        const renameButton = document.createElement('button');
        renameButton.type = 'button';
        renameButton.className = 'asset-library__animation-action';
        renameButton.textContent = 'Rename';
        renameButton.addEventListener('click', (event) => {
          event.stopPropagation();
          activeRenameId = activeRenameId === animation.id ? null : animation.id;
          activeDeleteId = null;
          activeWhereUsedId = null;
          refresh();
        });

        const duplicateButton = document.createElement('button');
        duplicateButton.type = 'button';
        duplicateButton.className = 'asset-library__animation-action';
        duplicateButton.textContent = 'Duplicate';
        duplicateButton.addEventListener('click', (event) => {
          event.stopPropagation();
          const duplicated = assetRegistry.duplicateAnimation(animation.id);
          if (duplicated) {
            onOpenAnimation?.(duplicated.id);
          }
        });

        const whereUsedButton = document.createElement('button');
        whereUsedButton.type = 'button';
        whereUsedButton.className = 'asset-library__animation-action';
        whereUsedButton.textContent = 'Where Used';
        whereUsedButton.addEventListener('click', async (event) => {
          event.stopPropagation();
          // Toggle: if already open for this card, collapse it
          if (activeWhereUsedId === animation.id) {
            activeWhereUsedId = null;
            card.classList.remove('asset-library__animation-card--where-used-open');
            whereUsedPanel.remove();
            return;
          }
          // Show loading state, then scan
          activeWhereUsedId = animation.id;
          activeDeleteId = null;
          card.classList.add('asset-library__animation-card--where-used-open');

          whereUsedPanel.innerHTML = '<div class="asset-library__anim-where-used-hit">Scanning…</div>';
          whereUsedPanel.style.display = '';

          const scenes = await getAllScenes();
          const sceneMap = Object.fromEntries(scenes.map((scene) => [scene.id, scene]));
          const hits = collectAnimationReferences(
            animation.id, sceneMap,
            assetRegistry.getAnimationSets(),
            assetRegistry.getAnimStateMachines()
          );

          whereUsedPanel.innerHTML = '';
          if (hits.length === 0) {
            const msg = document.createElement('div');
            msg.className = 'asset-library__anim-where-used-hit';
            msg.textContent = 'Not used anywhere.';
            whereUsedPanel.appendChild(msg);
          } else {
            hits.slice(0, 20).forEach((hit) => {
              const row = document.createElement('div');
              row.className = 'asset-library__anim-where-used-hit';
              if (hit.kind === 'entity') {
                row.textContent = `Scene ${hit.sceneId} → Entity ${hit.entityId}`;
              } else if (hit.kind === 'animationSet') {
                row.textContent = `Anim Set ${hit.setId} (${hit.facing ?? '?'})`;
              } else {
                row.textContent = `State Machine ${hit.smId} → State ${hit.stateId ?? '?'}`;
              }
              whereUsedPanel.appendChild(row);
            });
            if (hits.length > 20) {
              const more = document.createElement('div');
              more.className = 'asset-library__anim-where-used-hit';
              more.textContent = `…and ${hits.length - 20} more.`;
              whereUsedPanel.appendChild(more);
            }
          }
        });

        actions.appendChild(renameButton);
        actions.appendChild(duplicateButton);
        actions.appendChild(whereUsedButton);
        card.appendChild(actions);

        // ── Where Used panel (shown below actions when active) ──
        const whereUsedPanel = document.createElement('div');
        whereUsedPanel.className = 'asset-library__anim-where-used';
        whereUsedPanel.addEventListener('click', (e) => e.stopPropagation());
        if (activeWhereUsedId !== animation.id) {
          whereUsedPanel.style.display = 'none';
        } else {
          card.classList.add('asset-library__animation-card--where-used-open');
        }
        card.appendChild(whereUsedPanel);

        // ── Delete button (× absolute in corner) ──
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'asset-library__animation-delete';
        deleteButton.textContent = '×';
        deleteButton.addEventListener('pointerdown', (event) => event.stopPropagation());
        deleteButton.addEventListener('click', async (event) => {
          event.stopPropagation();
          if (activeDeleteId === animation.id) {
            // Already showing confirm — tapping × again cancels it
            activeDeleteId = null;
            card.classList.remove('asset-library__animation-card--delete-open');
            deleteConfirmEl.style.display = 'none';
            return;
          }
          activeDeleteId = animation.id;
          activeWhereUsedId = null;
          card.classList.add('asset-library__animation-card--delete-open');

          // Build the inline delete confirm
          deleteConfirmEl.innerHTML = '';

          const scenes = await getAllScenes();
          const sceneMap = Object.fromEntries(scenes.map((scene) => [scene.id, scene]));
          const hits = collectAnimationReferences(
            animation.id, sceneMap,
            assetRegistry.getAnimationSets(),
            assetRegistry.getAnimStateMachines()
          );

          const label = document.createElement('div');
          label.className = 'asset-library__anim-delete-label';
          label.textContent = hits.length > 0
            ? `Used by ${hits.length} — delete anyway?`
            : `Delete "${animation.name}"?`;
          deleteConfirmEl.appendChild(label);

          const confirmRow = document.createElement('div');
          confirmRow.className = 'asset-library__anim-delete-row';

          const cancelBtn = document.createElement('button');
          cancelBtn.type = 'button';
          cancelBtn.className = 'asset-library__anim-cancel-btn';
          cancelBtn.textContent = 'Cancel';
          cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            activeDeleteId = null;
            card.classList.remove('asset-library__animation-card--delete-open');
            deleteConfirmEl.style.display = 'none';
          });

          const confirmBtn = document.createElement('button');
          confirmBtn.type = 'button';
          confirmBtn.className = 'asset-library__anim-delete-btn';
          confirmBtn.textContent = 'Delete';
          confirmBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const updatesByScene = new Map<string, Set<string>>();
            for (const hit of hits) {
              if (hit.kind !== 'entity') continue;
              if (!updatesByScene.has(hit.sceneId)) updatesByScene.set(hit.sceneId, new Set());
              updatesByScene.get(hit.sceneId)!.add(hit.entityId);
            }
            for (const scene of scenes) {
              const ids = updatesByScene.get(scene.id);
              if (!ids || ids.size === 0) continue;
              let changed = false;
              const activeSceneUpdates = new Map<string, Record<string, string | number | boolean | undefined>>();
              const nextEntities = scene.entities.map((entity) => {
                if (!ids.has(entity.id)) return entity;
                if (entity.properties?.animationId !== animation.id) return entity;
                changed = true;
                const nextProperties = { ...(entity.properties ?? {}) };
                delete nextProperties.animationId;
                activeSceneUpdates.set(entity.id, { animationId: undefined });
                return { ...entity, properties: nextProperties };
              });
              if (changed) {
                await saveScene({ ...scene, entities: nextEntities });
                syncActiveSceneEntityProperties(scene.id, activeSceneUpdates);
              }
            }
            assetRegistry.clearAnimationFromSets(animation.id);
            assetRegistry.clearAnimationFromStateMachines(animation.id);
            assetRegistry.removeAnimation(animation.id);
            uxFeedback.motion.pulse(confirmBtn);
            uxFeedback.undo.show('Animation deleted.', () => {}, { destructive: true });
          });

          confirmRow.appendChild(cancelBtn);
          confirmRow.appendChild(confirmBtn);
          deleteConfirmEl.appendChild(confirmRow);
          deleteConfirmEl.style.display = '';
        });
        card.appendChild(deleteButton);

        // ── Inline delete confirm panel ──
        const deleteConfirmEl = document.createElement('div');
        deleteConfirmEl.className = 'asset-library__anim-delete-confirm';
        deleteConfirmEl.addEventListener('click', (e) => e.stopPropagation());
        deleteConfirmEl.style.display = 'none';
        if (activeDeleteId === animation.id) {
          card.classList.add('asset-library__animation-card--delete-open');
        }
        card.appendChild(deleteConfirmEl);

        grid.appendChild(card);
      });

      // Check initial no-match state
      if (animFilter && animations.length > 0) {
        const lower = animFilter.toLowerCase();
        const visible = animations.filter((a) => a.name.toLowerCase().includes(lower));
        noMatchMsg.style.display = visible.length === 0 ? '' : 'none';
      }

      section.appendChild(grid);

      // ── Animation Sets section ────────────────────────────────────
      const setsTitle = document.createElement('div');
      setsTitle.className = 'asset-library__title';
      setsTitle.style.marginTop = '16px';
      setsTitle.textContent = 'Animation Sets';
      section.appendChild(setsTitle);

      // Inline create form or button
      const createSetRow = document.createElement('div');
      createSetRow.className = 'asset-library__row';
      if (inlineSetCreateOpen) {
        const createInline = document.createElement('div');
        createInline.className = 'asset-library__anim-set-create-inline';

        const createInput = document.createElement('input');
        createInput.type = 'text';
        createInput.className = 'irs-input asset-library__anim-set-create-input';
        createInput.placeholder = 'Animation set name…';
        createInput.maxLength = 64;

        const commitCreate = () => {
          const trimmed = createInput.value.trim();
          if (trimmed) {
            assetRegistry.addAnimationSet({ name: trimmed, directions: {} });
            uxFeedback.toast.success('Animation set created.');
          }
          inlineSetCreateOpen = false;
          refresh();
        };

        createInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); commitCreate(); }
          if (e.key === 'Escape') { e.preventDefault(); inlineSetCreateOpen = false; refresh(); }
        });

        const createBtn = document.createElement('button');
        createBtn.type = 'button';
        createBtn.className = 'asset-library__button';
        createBtn.textContent = 'Create';
        createBtn.addEventListener('mousedown', (e) => e.preventDefault());
        createBtn.addEventListener('click', () => { uxFeedback.motion.pulse(createBtn); commitCreate(); });

        const cancelCreateBtn = document.createElement('button');
        cancelCreateBtn.type = 'button';
        cancelCreateBtn.className = 'asset-library__button';
        cancelCreateBtn.textContent = 'Cancel';
        cancelCreateBtn.addEventListener('mousedown', (e) => e.preventDefault());
        cancelCreateBtn.addEventListener('click', () => { inlineSetCreateOpen = false; refresh(); });

        createInline.appendChild(createInput);
        createInline.appendChild(createBtn);
        createInline.appendChild(cancelCreateBtn);
        createSetRow.appendChild(createInline);
        queueMicrotask(() => createInput.focus());
      } else {
        const createSetButton = document.createElement('button');
        createSetButton.type = 'button';
        createSetButton.className = 'asset-library__button';
        createSetButton.textContent = '+ Create Animation Set';
        createSetButton.addEventListener('click', () => {
          inlineSetCreateOpen = true;
          refresh();
        });
        createSetRow.appendChild(createSetButton);
      }
      section.appendChild(createSetRow);

      if (animationSets.length === 0) {
        const emptyContainer = document.createElement('div');
        uxFeedback.emptyState.render(emptyContainer, {
          message: 'No animation sets yet.',
          actionLabel: 'Create Set',
          onAction: () => { inlineSetCreateOpen = true; refresh(); },
        });
        section.appendChild(emptyContainer);
      } else {
        const setGrid = document.createElement('div');
        setGrid.className = 'asset-library__animations';

        for (const animationSet of animationSets) {
          const card = document.createElement('div');
          card.className = 'asset-library__animation-card';

          // ── Set name / inline rename ──
          if (activeSetRenameId === animationSet.id) {
            const renameRow = document.createElement('div');
            renameRow.className = 'asset-library__anim-rename-row';
            renameRow.addEventListener('click', (e) => e.stopPropagation());

            const renameInput = document.createElement('input');
            renameInput.type = 'text';
            renameInput.className = 'irs-input asset-library__anim-rename-input';
            renameInput.value = animationSet.name;
            renameInput.maxLength = 64;

            const commitSetRename = () => {
              const trimmed = renameInput.value.trim();
              if (trimmed && trimmed !== animationSet.name) {
                assetRegistry.updateAnimationSet(animationSet.id, { name: trimmed });
              }
              activeSetRenameId = null;
              refresh();
            };
            const cancelSetRename = () => { activeSetRenameId = null; refresh(); };

            renameInput.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitSetRename(); }
              if (e.key === 'Escape') { e.preventDefault(); cancelSetRename(); }
            });
            renameInput.addEventListener('blur', commitSetRename);

            const okBtn = document.createElement('button');
            okBtn.type = 'button';
            okBtn.className = 'asset-library__anim-rename-btn';
            okBtn.textContent = '✓';
            okBtn.addEventListener('mousedown', (e) => e.preventDefault());
            okBtn.addEventListener('click', (e) => { e.stopPropagation(); commitSetRename(); });

            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'asset-library__anim-rename-btn';
            cancelBtn.textContent = '✕';
            cancelBtn.addEventListener('mousedown', (e) => e.preventDefault());
            cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); cancelSetRename(); });

            renameRow.appendChild(renameInput);
            renameRow.appendChild(okBtn);
            renameRow.appendChild(cancelBtn);
            card.appendChild(renameRow);
            queueMicrotask(() => { renameInput.focus(); renameInput.select(); });
          } else {
            const name = document.createElement('div');
            name.className = 'asset-library__asset-name';
            name.textContent = animationSet.name;
            card.appendChild(name);
          }

          // ── Direction summary ──
          const order = ['up', 'left', 'right', 'down'] as const;
          const directions = document.createElement('div');
          directions.className = 'asset-library__animation-meta';
          directions.textContent = order
            .map((facing) => {
              const val = animationSet.directions[facing];
              if (!val) return `${facing}: —`;
              const anim = assetRegistry.getAnimation(val);
              return `${facing}: ${anim ? anim.name : val}`;
            })
            .join(' · ');
          card.appendChild(directions);

          // ── Set action buttons ──
          const actions = document.createElement('div');
          actions.className = 'asset-library__animation-actions';

          const assignBtn = document.createElement('button');
          assignBtn.type = 'button';
          assignBtn.className = 'asset-library__animation-action';
          assignBtn.textContent = 'Assign Directions';
          assignBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            directionSheetSetId = animationSet.id;
            renderAnimSheet();
          });

          const renameSetBtn = document.createElement('button');
          renameSetBtn.type = 'button';
          renameSetBtn.className = 'asset-library__animation-action';
          renameSetBtn.textContent = 'Rename';
          renameSetBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            activeSetRenameId = activeSetRenameId === animationSet.id ? null : animationSet.id;
            activeSetDeleteId = null;
            refresh();
          });

          const deleteSetBtn = document.createElement('button');
          deleteSetBtn.type = 'button';
          deleteSetBtn.className = 'asset-library__animation-action';
          deleteSetBtn.style.color = '#ffc5d2';
          deleteSetBtn.textContent = 'Delete Set';
          deleteSetBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (activeSetDeleteId === animationSet.id) {
              activeSetDeleteId = null;
              setDeleteConfirmEl.style.display = 'none';
              return;
            }
            activeSetDeleteId = animationSet.id;
            activeSetRenameId = null;
            card.classList.add('asset-library__animation-card--delete-open');
            setDeleteConfirmEl.style.display = '';
          });

          actions.appendChild(assignBtn);
          actions.appendChild(renameSetBtn);
          actions.appendChild(deleteSetBtn);
          card.appendChild(actions);

          // ── Inline set delete confirm ──
          const setDeleteConfirmEl = document.createElement('div');
          setDeleteConfirmEl.className = 'asset-library__anim-delete-confirm';
          setDeleteConfirmEl.addEventListener('click', (e) => e.stopPropagation());
          setDeleteConfirmEl.style.display = 'none';

          const setDeleteLabel = document.createElement('div');
          setDeleteLabel.className = 'asset-library__anim-delete-label';
          setDeleteLabel.textContent = `Delete set "${animationSet.name}"?`;
          setDeleteConfirmEl.appendChild(setDeleteLabel);

          const setDeleteRow = document.createElement('div');
          setDeleteRow.className = 'asset-library__anim-delete-row';

          const setDeleteCancel = document.createElement('button');
          setDeleteCancel.type = 'button';
          setDeleteCancel.className = 'asset-library__anim-cancel-btn';
          setDeleteCancel.textContent = 'Cancel';
          setDeleteCancel.addEventListener('click', (e) => {
            e.stopPropagation();
            activeSetDeleteId = null;
            card.classList.remove('asset-library__animation-card--delete-open');
            setDeleteConfirmEl.style.display = 'none';
          });

          const setDeleteConfirm = document.createElement('button');
          setDeleteConfirm.type = 'button';
          setDeleteConfirm.className = 'asset-library__anim-delete-btn';
          setDeleteConfirm.textContent = 'Delete';
          setDeleteConfirm.addEventListener('click', async (e) => {
            e.stopPropagation();
            const count = await clearAnimationSetEntityReferences(animationSet.id);
            if (count > 0) {
              setDeleteLabel.textContent = `Used by ${count} entities — deleting…`;
            }
            assetRegistry.removeAnimationSet(animationSet.id);
          });

          setDeleteRow.appendChild(setDeleteCancel);
          setDeleteRow.appendChild(setDeleteConfirm);
          setDeleteConfirmEl.appendChild(setDeleteRow);
          card.appendChild(setDeleteConfirmEl);

          if (activeSetDeleteId === animationSet.id) {
            card.classList.add('asset-library__animation-card--delete-open');
            setDeleteConfirmEl.style.display = '';
          }

          setGrid.appendChild(card);
        }

        section.appendChild(setGrid);
      }
    }

    librarySection.appendChild(section);

    // Start rAF loop for live thumbnails
    if (animations.length > 0 && !animationsCollapsed) {
      startRafLoop();
    }
  }

  function renderAnimSheet(): void {
    animScrim.innerHTML = '';
    directionPreviewCanvasMap.clear();
    if (!directionSheetSetId) {
      animScrim.classList.remove('asset-library__anim-scrim--open');
      return;
    }

    const animationSet = assetRegistry.getAnimationSets().find((s) => s.id === directionSheetSetId);
    if (!animationSet) {
      directionSheetSetId = null;
      animScrim.classList.remove('asset-library__anim-scrim--open');
      return;
    }

    animScrim.classList.add('asset-library__anim-scrim--open');

    const sheet = document.createElement('div');
    sheet.className = 'asset-library__sheet';
    sheet.addEventListener('click', (e) => e.stopPropagation());

    const title = document.createElement('div');
    title.className = 'asset-library__sheet-title';
    title.textContent = `Assign Directions — ${animationSet.name}`;
    sheet.appendChild(title);

    // Working copy of directions that will be saved on "Save"
    const pendingDirections: Record<string, string> = {};
    (['up', 'down', 'left', 'right'] as const).forEach((facing) => {
      const val = animationSet.directions[facing];
      if (val) pendingDirections[facing] = val;
    });

    const allAnimations = assetRegistry.getAnimations();

    (['up', 'down', 'left', 'right'] as const).forEach((facing) => {
      const row = document.createElement('div');
      row.className = 'asset-library__direction-row';

      const label = document.createElement('div');
      label.className = 'asset-library__direction-label';
      label.textContent = facing.charAt(0).toUpperCase() + facing.slice(1);

      // ── Mini live-preview canvas for this direction ──
      const prevCanvas = document.createElement('canvas');
      prevCanvas.width = 44;
      prevCanvas.height = 44;
      prevCanvas.className = 'asset-library__direction-preview';

      let prevAnimId = pendingDirections[facing] ?? '';

      const registerPreviewAnim = (animId: string): void => {
        if (!animId) return;
        const anim = allAnimations.find((a) => a.id === animId);
        if (!anim) return;
        animationClock.register(animId, anim);
        anim.frames.forEach((f) => loadSourceImage(f.sourceAssetId));
        if (!directionPreviewCanvasMap.has(animId)) {
          directionPreviewCanvasMap.set(animId, []);
        }
        directionPreviewCanvasMap.get(animId)!.push(prevCanvas);
        // Draw immediately in case the clock has a snapshot already
        drawAnimationFrame(animId, prevCanvas);
      };

      const unregisterPreviewAnim = (animId: string): void => {
        if (!animId) return;
        const arr = directionPreviewCanvasMap.get(animId);
        if (arr) {
          const idx = arr.indexOf(prevCanvas);
          if (idx !== -1) arr.splice(idx, 1);
          if (arr.length === 0) directionPreviewCanvasMap.delete(animId);
        }
      };

      // Register initial assignment
      if (prevAnimId) {
        registerPreviewAnim(prevAnimId);
      } else {
        // Show muted placeholder when nothing is assigned
        const ctx = prevCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'rgba(83, 101, 164, 0.15)';
          ctx.fillRect(0, 0, 44, 44);
        }
      }

      const select = document.createElement('select');
      select.className = 'asset-library__direction-select';

      const noneOpt = document.createElement('option');
      noneOpt.value = '';
      noneOpt.textContent = '— None —';
      select.appendChild(noneOpt);

      allAnimations.forEach((anim) => {
        const opt = document.createElement('option');
        opt.value = anim.id;
        opt.textContent = anim.name;
        if (pendingDirections[facing] === anim.id) opt.selected = true;
        select.appendChild(opt);
      });

      select.addEventListener('change', () => {
        const newAnimId = select.value;

        // Update pendingDirections
        if (newAnimId) {
          pendingDirections[facing] = newAnimId;
        } else {
          delete pendingDirections[facing];
        }

        // Swap preview canvas registration
        unregisterPreviewAnim(prevAnimId);
        prevAnimId = newAnimId;

        const ctx = prevCanvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, 44, 44);

        if (newAnimId) {
          registerPreviewAnim(newAnimId);
        } else {
          // Show muted placeholder
          if (ctx) {
            ctx.fillStyle = 'rgba(83, 101, 164, 0.15)';
            ctx.fillRect(0, 0, 44, 44);
          }
        }
      });

      row.appendChild(label);
      row.appendChild(prevCanvas);
      row.appendChild(select);
      sheet.appendChild(row);
    });

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'asset-library__sheet-button';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => {
      assetRegistry.updateAnimationSet(animationSet.id, {
        directions: pendingDirections as Record<'up' | 'down' | 'left' | 'right', string>,
      });
      directionSheetSetId = null;
      renderAnimSheet();
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'asset-library__sheet-button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      directionSheetSetId = null;
      renderAnimSheet();
    });

    sheet.appendChild(saveBtn);
    sheet.appendChild(cancelBtn);
    animScrim.appendChild(sheet);
  }

  function renderSheet(): void {
    sheetScrim.innerHTML = '';
    if (!sheetAssetId) {
      sheetScrim.classList.remove('asset-library__sheet-scrim--open');
      return;
    }

    const state = assetRegistry.getState();
    const activeGroup = state.groups.find((group) => group.assets.some((asset) => asset.id === sheetAssetId));
    const activeAsset = activeGroup?.assets.find((asset) => asset.id === sheetAssetId);
    if (!activeAsset || !activeGroup) {
      sheetAssetId = null;
      sheetScrim.classList.remove('asset-library__sheet-scrim--open');
      return;
    }

    sheetScrim.classList.add('asset-library__sheet-scrim--open');
    const sheet = document.createElement('div');
    sheet.className = 'asset-library__sheet';
    sheet.addEventListener('click', (event) => event.stopPropagation());

    if (sheetView === 'menu') {
      const actions: Array<{ label: string; onClick: () => void; danger?: boolean }> = [
        { label: 'Rename', onClick: () => openAssetSheet(activeAsset.id, 'rename') },
        {
          label: 'Move to\u2026',
          onClick: () => {
            moveToType = activeGroup.type;
            openAssetSheet(activeAsset.id, 'move-to');
          },
        },
        { label: 'Delete', onClick: () => openAssetSheet(activeAsset.id, 'delete-confirm'), danger: true },
        {
          label: 'Organize Group',
          onClick: () => {
            organizeGroupKey = groupKey(activeGroup);
            expandedGroups.add(organizeGroupKey);
            sheetAssetId = null;
            refresh();
          },
        },
        {
          label: 'Cancel',
          onClick: () => {
            sheetAssetId = null;
            refresh();
          },
        },
      ];

      actions.forEach((action) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `asset-library__sheet-button${action.danger ? ' asset-library__sheet-button--danger' : ''}`;
        button.textContent = action.label;
        button.addEventListener('click', action.onClick);
        sheet.appendChild(button);
      });
    }

    if (sheetView === 'rename') {
      const title = document.createElement('div');
      title.className = 'asset-library__sheet-title';
      title.textContent = 'Rename Asset';
      sheet.appendChild(title);

      const input = document.createElement('input');
      input.className = 'irs-input';
      input.type = 'text';
      input.value = activeAsset.name;
      input.maxLength = 64;
      sheet.appendChild(input);

      const saveButton = document.createElement('button');
      saveButton.type = 'button';
      saveButton.className = 'asset-library__sheet-button';
      saveButton.textContent = 'Save';
      saveButton.addEventListener('click', () => {
        assetRegistry.renameAsset(activeAsset.id, input.value);
        sheetAssetId = null;
        refresh();
      });
      sheet.appendChild(saveButton);

      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'asset-library__sheet-button';
      cancelButton.textContent = 'Cancel';
      cancelButton.addEventListener('click', () => openAssetSheet(activeAsset.id, 'menu'));
      sheet.appendChild(cancelButton);
      queueMicrotask(() => input.focus());
    }

    if (sheetView === 'delete-confirm') {
      const title = document.createElement('div');
      title.className = 'asset-library__sheet-title';
      title.textContent = 'Delete this asset?';
      sheet.appendChild(title);

      const note = document.createElement('div');
      note.className = 'asset-library__sheet-note';
      note.textContent = activeAsset.name;
      sheet.appendChild(note);

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'asset-library__sheet-button asset-library__sheet-button--danger';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => {
        uxFeedback.motion.pulse(deleteButton);
        assetRegistry.removeAsset(activeAsset.id);
        sheetAssetId = null;
        uxFeedback.undo.show('Asset removed.', () => {}, { destructive: true });
        refresh();
      });
      sheet.appendChild(deleteButton);

      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'asset-library__sheet-button';
      cancelButton.textContent = 'Cancel';
      cancelButton.addEventListener('click', () => openAssetSheet(activeAsset.id, 'menu'));
      sheet.appendChild(cancelButton);
    }

    if (sheetView === 'move-to') {
      const title = document.createElement('div');
      title.className = 'asset-library__sheet-title';
      title.textContent = 'Move to\u2026';
      sheet.appendChild(title);

      // Category type selector row
      const typeRow = document.createElement('div');
      typeRow.className = 'asset-library__move-type-row';
      const types: AssetGroupType[] = ['tilesets', 'props', 'entities'];
      types.forEach((type) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'asset-library__move-type-btn';
        btn.classList.toggle('asset-library__move-type-btn--active', type === moveToType);
        btn.textContent = GROUP_TYPE_LABELS[type];
        btn.addEventListener('click', () => {
          moveToType = type;
          openAssetSheet(activeAsset.id, 'move-to');
        });
        typeRow.appendChild(btn);
      });
      sheet.appendChild(typeRow);

      // Group list for the selected type
      const groupList = document.createElement('div');
      groupList.className = 'asset-library__move-group-list';
      const groupsOfType = assetRegistry.getGroupsByType(moveToType);
      const currentKey = groupKey(activeGroup);

      groupsOfType.forEach((grp) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'asset-library__move-group-btn';
        const key = groupKey(grp);
        const isCurrent = key === currentKey;
        btn.classList.toggle('asset-library__move-group-btn--current', isCurrent);
        btn.textContent = `${grp.name}${isCurrent ? ' (current)' : ''}`;
        if (!isCurrent) {
          btn.addEventListener('click', () => {
            assetRegistry.moveAsset({
              assetId: activeAsset.id,
              toGroupType: grp.type,
              toGroupSlug: grp.slug,
            });
            sheetAssetId = null;
            refresh();
          });
        }
        groupList.appendChild(btn);
      });
      sheet.appendChild(groupList);

      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'asset-library__sheet-button';
      cancelButton.textContent = 'Cancel';
      cancelButton.addEventListener('click', () => openAssetSheet(activeAsset.id, 'menu'));
      sheet.appendChild(cancelButton);
    }

    sheetScrim.appendChild(sheet);
  }

  function refresh(): void {
    const state = assetRegistry.getState();
    renderGroups(state.groups, state.selectedAssetId);
    renderAnimations();
    renderSheet();
    renderAnimSheet();
  }

  function handleCreateGroup(): void {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }
    const type = typeSelect.value as AssetGroupType;
    assetRegistry.createGroup(type, name);
    nameInput.value = '';
  }

  createButton.addEventListener('click', handleCreateGroup);

  const unsubscribe = assetRegistry.onChange(() => refresh());

  refresh();

  return {
    refresh,
    destroy: () => {
      unsubscribe();
      stopRafLoop();
      animIntersectionObserver?.disconnect();
      animIntersectionObserver = null;
      animationClock.destroy();
      animationCanvases.clear();
      sourceImageCache.clear();
      sheetScrim.remove();
      animScrim.remove();
      container.removeChild(root);
    },
  };
}
