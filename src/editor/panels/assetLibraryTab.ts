import type { AssetRegistry, AssetEntry, AssetGroup, AssetGroupType } from '@/editor/assets';
import type { EntityManager } from '@/editor/entities/entityManager';
import { makeGroupKey } from '@/editor/assets/groupKey';
import { collectAnimationReferences } from '@/editor/assets/animationRefs';
import { getAllScenes, saveScene } from '@/storage/hot';
import { resolveAssetUrl } from '@/shared/paths';
import type { Scene } from '@/types';
import { createAnimationClock } from '@/editor/canvas/animationClock';
import { uxFeedback } from '@/editor/uxFeedback';
import { createEmptyState } from './leftBerry';
import { editorEventBus } from '@/editor/core';
import { createAssetCapsule } from './assetCapsule';
import type { AssetCapsuleController } from './assetCapsule';
import { createVirtualScroller } from './virtualScroller';
import { createSortableScroller } from './sortableScroller';
import { createGestureDebugOverlay } from '../debug/gestureDebugOverlay';

// Set to true to log which pointer event ends a drag gesture (useful when
// diagnosing instant-cancel / "flash" regressions on mobile).
const DEBUG_DND = true;
// ENABLE_GESTURE_OVERLAY_IN_DEV kept for reference; overlay is currently force-enabled.
// const ENABLE_GESTURE_OVERLAY_IN_DEV = true;

const STYLES = `
  .irs-asset-library {
    display: flex;
    flex-direction: column;
    gap: 12px;
    color: var(--irs-text-primary);
  }

  .irs-asset-library__section {
    background: var(--irs-surface-panel);
    border: 1px solid var(--irs-border-heavy);
    border-radius: var(--irs-radius-xl);
    padding: 12px;
  }

  .irs-asset-library__title {
    font-size: 13px;
    font-weight: 700;
    color: var(--irs-text-primary);
    margin-bottom: 8px;
  }

  .irs-asset-library__row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .irs-asset-library__select {
    min-height: 44px;
    padding: 8px 10px;
    border-radius: var(--irs-radius-md);
    border: 1px solid var(--irs-border-heavy);
    background: var(--irs-surface-panel);
    color: var(--irs-text-primary);
    font-size: 13px;
  }

  .irs-asset-library__hint {
    font-size: 12px;
    color: var(--irs-text-secondary);
  }

  .irs-asset-library__group {
    border-top: 1px solid var(--irs-border-heavy);
    padding-top: 10px;
    margin-top: 10px;
  }

  .irs-asset-library__group:first-of-type {
    border-top: none;
    padding-top: 0;
    margin-top: 0;
  }

  .irs-asset-library__group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .irs-asset-library__group-toggle {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 8px 10px;
    border-radius: var(--irs-radius-md);
    border: 1px solid transparent;
    background: var(--irs-surface-panel);
    color: var(--irs-text-primary);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
  }

  .irs-asset-library__group-toggle:active {
    background: var(--irs-accent-primary-active);
  }

  .irs-asset-library__group-count {
    font-size: 12px;
    color: var(--irs-text-secondary);
  }

  .irs-asset-library__group-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .irs-asset-library__upload-status {
    font-size: 11px;
    color: var(--irs-text-secondary);
    max-width: 160px;
    text-align: right;
  }

  .irs-asset-library__upload-status--error {
    color: var(--irs-accent-danger);
  }

  .irs-asset-library__upload-status--success {
    color: var(--irs-accent-success);
  }

  .irs-asset-library__assets {
    margin-top: 10px;
    display: none;
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: 10px;
  }

  .irs-asset-library__assets--open {
    display: grid;
  }

  .irs-asset-library__asset-name {
    font-size: 11px;
    color: var(--irs-text-primary);
    max-width: 100%;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-word;
  }

  .irs-asset-library__asset--organizing {
    border-color: var(--irs-border-blue-alpha);
    background: var(--irs-surface-panel);
    box-shadow: 0 0 0 1px var(--irs-border-blue-alpha) inset;
    user-select: none;
  }

.irs-asset-library__ghost {
    position: fixed;
    width: 84px;
    pointer-events: none;
    z-index: 80;
    opacity: 0.9;
    transform: scale(1.03);
    box-shadow: 0 10px 20px var(--irs-surface-dark-alpha);
  }

  .irs-asset-library__placeholder {
    border-radius: var(--irs-radius-lg);
    border: 2px dashed var(--irs-border-blue-alpha);
    background: var(--irs-surface-panel);
    min-height: 132px;
  }

  .irs-asset-library__sheet-scrim {
    z-index: 120;
  }

  .irs-asset-library__sheet {
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: max(12px, env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    gap: 8px;
    transform: translateY(12px);
    transition: transform 140ms ease;
  }

  .irs-overlay--visible .irs-asset-library__sheet {
    transform: translateY(0);
  }

  .irs-asset-library__sheet-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--irs-text-primary);
    margin-bottom: 4px;
  }

  .irs-asset-library__sheet-note {
    font-size: 12px;
    color: var(--irs-text-secondary);
  }

  .irs-asset-library__empty {
    font-size: 12px;
    color: var(--irs-text-secondary);
    padding: 4px 0;
  }

  .irs-asset-library__move-type-row {
    display: flex;
    gap: 6px;
  }

  .irs-asset-library__move-type-btn {
    flex: 1;
  }

  .irs-asset-library__move-group-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 200px;
    overflow-y: auto;
  }

  .irs-asset-library__move-group-btn {
    text-align: left;
  }

  .irs-asset-library__move-group-btn--current {
    opacity: 0.4;
    cursor: default;
  }

  .irs-asset-library__animations {
    margin-top: 12px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
    gap: 10px;
  }

  .irs-asset-library__animation-card {
    border-radius: var(--irs-radius-lg);
    border: 2px solid transparent;
    background: var(--irs-surface-panel);
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: var(--irs-text-primary);
    font-size: 11px;
    position: relative;
  }

  .irs-asset-library__animation-card img {
    width: 100%;
    border-radius: var(--irs-radius-md);
    object-fit: cover;
  }

  .irs-asset-library__animation-meta {
    font-size: 10px;
    color: var(--irs-text-secondary);
  }

  .irs-asset-library__animation-delete {
    position: absolute;
    top: 6px;
    right: 6px;
    cursor: pointer;
  }

  .irs-asset-library__animation-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .irs-asset-library__animation-card canvas {
    width: 100%;
    border-radius: var(--irs-radius-md);
    image-rendering: pixelated;
    display: block;
  }

  .irs-asset-library__anim-section {
    margin-top: 12px;
  }

  .irs-asset-library__anim-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }

  .irs-asset-library__anim-search {
    width: 100%;
    margin-bottom: 10px;
  }

  .irs-asset-library__anim-rename-row {
    display: flex;
    gap: 4px;
    align-items: center;
    margin-top: 4px;
  }

  .irs-asset-library__anim-rename-input {
    flex: 1;
    min-height: 36px;
    padding: 4px 8px;
    min-width: 0;
  }

  .irs-asset-library__anim-where-used {
    margin-top: 6px;
    padding: 6px 8px;
    border-radius: var(--irs-radius-sm);
    background: var(--irs-surface-input);
    border: 1px solid var(--irs-border-heavy);
    font-size: 10px;
    color: var(--irs-text-secondary);
    max-height: 120px;
    overflow-y: auto;
  }

  .irs-asset-library__anim-where-used-hit {
    padding: 3px 0;
    border-bottom: 1px solid var(--irs-border-blue-alpha);
    word-break: break-word;
  }

  .irs-asset-library__anim-where-used-hit:last-child {
    border-bottom: none;
  }

  .irs-asset-library__anim-delete-confirm {
    margin-top: 6px;
    padding: 6px 8px;
    border-radius: var(--irs-radius-sm);
    background: var(--irs-surface-panel);
    border: 1px solid var(--irs-accent-danger);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .irs-asset-library__anim-delete-label {
    font-size: 10px;
    color: var(--irs-accent-danger);
  }

  .irs-asset-library__anim-delete-row {
    display: flex;
    gap: 6px;
  }

  .irs-asset-library__anim-set-create-inline {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-top: 6px;
    flex-wrap: wrap;
  }

  .irs-asset-library__anim-set-create-input {
    flex: 1;
    min-width: 100px;
  }

  .irs-asset-library__anim-scrim {
    z-index: 120;
  }

  .irs-asset-library__direction-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
    border-bottom: 1px solid var(--irs-border-blue-alpha);
  }

  .irs-asset-library__direction-row:last-of-type {
    border-bottom: none;
  }

  .irs-asset-library__direction-label {
    width: 48px;
    font-size: 12px;
    color: var(--irs-text-secondary);
    flex-shrink: 0;
  }

  .irs-asset-library__direction-select {
    flex: 1;
    min-height: 44px;
    padding: 8px 10px;
    border-radius: var(--irs-radius-md);
    border: 1px solid var(--irs-border-heavy);
    background: var(--irs-surface-panel);
    color: var(--irs-text-primary);
    font-size: 12px;
  }

  .irs-asset-library__direction-preview {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: var(--irs-radius-sm);
    background: var(--irs-surface-panel);
    border: 1px solid var(--irs-border-blue-alpha);
    image-rendering: pixelated;
  }

  .irs-asset-library__animation-card--where-used-open {
    border-color: var(--irs-border-blue-alpha);
  }

  .irs-asset-library__animation-card--delete-open {
    border-color: var(--irs-accent-danger);
  }

  .irs-asset-library__anim-no-match {
    font-size: 12px;
    color: var(--irs-text-secondary);
    padding: 8px 0;
    grid-column: 1 / -1;
  }

  .irs-asset-subtabs {
    display: flex;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    gap: 4px;
    padding: 4px 0 8px;
    border-bottom: 1px solid var(--irs-border-heavy);
    margin-bottom: 12px;
  }
  .irs-asset-subtabs::-webkit-scrollbar {
    display: none;
  }
  .irs-asset-subtabs__tab {
    flex-shrink: 0;
    min-height: var(--irs-touch-target);
    padding: 0 14px;
    border-radius: var(--irs-radius-md);
    border: 1px solid transparent;
    background: transparent;
    color: var(--irs-text-secondary);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
  }
  .irs-asset-subtabs__tab--active {
    background: var(--irs-color-blue-alpha-22);
    border-color: var(--irs-accent-primary);
    color: var(--irs-text-primary);
    font-weight: 700;
  }

  .irs-asset-library__group-menu-btn {
    min-height: var(--irs-touch-target);
    min-width: var(--irs-touch-target);
    padding: 0 8px;
    border-radius: var(--irs-radius-md);
    border: 1px solid transparent;
    background: transparent;
    color: var(--irs-text-secondary);
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .irs-asset-library__group-menu-btn:active {
    background: var(--irs-accent-primary-active);
  }

  .irs-asset-library__group-rename-row {
    display: flex;
    gap: 4px;
    align-items: center;
    padding: 6px 0 4px;
    flex-wrap: wrap;
  }

  .irs-asset-library__group-rename-input {
    flex: 1;
    min-height: 36px;
    padding: 4px 8px;
    min-width: 100px;
  }

  .irs-asset-library__group-grid-row {
    display: flex;
    gap: 4px;
    align-items: center;
    padding: 6px 0 4px;
    flex-wrap: wrap;
  }

  .irs-asset-library__group-grid-label {
    font-size: 12px;
    color: var(--irs-text-secondary);
  }

  .irs-asset-library__group-grid-input {
    width: 64px;
    min-height: 36px;
    padding: 4px 8px;
  }

  .irs-asset-library__subtab-row {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 4px 0 8px;
    border-bottom: 1px solid var(--irs-border-heavy);
    margin-bottom: 12px;
  }

  .irs-asset-library__subtabs-scroll {
    flex: 1;
    display: flex;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    gap: 4px;
    padding: 4px 0;
  }
  .irs-asset-library__subtabs-scroll::-webkit-scrollbar {
    display: none;
  }

  .irs-asset-library__subtab-create-btn {
    flex-shrink: 0;
    min-height: var(--irs-touch-target);
    min-width: var(--irs-touch-target);
    padding: 0 10px;
    border-radius: var(--irs-radius-md);
    border: 1px solid transparent;
    background: transparent;
    color: var(--irs-text-secondary);
    font-size: 20px;
    font-weight: 400;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .irs-asset-library__subtab-create-btn:active {
    background: var(--irs-accent-primary-active);
    color: var(--irs-text-primary);
  }

  .irs-asset-library__inline-group-create {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 6px 0 8px;
    flex-wrap: wrap;
  }

  .irs-asset-library__inline-group-create-input {
    flex: 1;
    min-width: 100px;
  }

  .irs-asset-library__selection-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    flex-wrap: wrap;
  }

  .irs-asset-library__selection-count {
    flex: 1;
    font-size: 13px;
    font-weight: 600;
    color: var(--irs-text-primary);
  }

  /* Virtual scroller viewport – replaces overflow-y:auto for the asset tab */
  .irs-asset-viewport {
    overflow: hidden;
    touch-action: none;
    position: relative;
    flex: 1;
    min-height: 0;
  }

  /* Virtual scroller content – translated via transform, never overflow-scrolled */
  .irs-asset-content {
    will-change: transform;
    transform: translate3d(0, 0, 0);
  }
`;

type AssetSubtabId = 'tiles' | 'props' | 'entities' | 'animations' | 'sources';

interface AssetSubtab {
  id: AssetSubtabId;
  label: string;
  groupType?: AssetGroupType;
}

const ASSET_SUBTABS: AssetSubtab[] = [
  { id: 'tiles',       label: 'Tiles',      groupType: 'tilesets'  },
  { id: 'props',       label: 'Props',      groupType: 'props'     },
  { id: 'entities',    label: 'Entities',   groupType: 'entities'  },
  { id: 'animations',  label: 'Animations'                         },
  { id: 'sources',     label: 'Sources',    groupType: 'sources'   },
];

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
  sources: 'Sources',
};

/**
 * Returns the group types an asset can be reclassified into (excludes its current type
 * and excludes 'sources' since sources are not manually reclassified).
 */
export function getMoveTargets(assetId: string, registry: AssetRegistry): AssetGroupType[] {
  const state = registry.getState();
  const currentGroup = state.groups.find((g) => g.assets.some((a) => a.id === assetId));
  if (!currentGroup) return [];
  const movableTypes: AssetGroupType[] = ['tilesets', 'props', 'entities'];
  return movableTypes.filter((t) => t !== currentGroup.type);
}

function ensureStyles(): void {
  if (document.getElementById('irs-asset-library-tab-styles')) return;
  const styleEl = document.createElement('style');
  styleEl.id = 'irs-asset-library-tab-styles';
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

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

  ensureStyles();

  const gestureDebug = createGestureDebugOverlay();
  // DEBUG: always force-enable the gesture overlay so it boots unconditionally.
  // To disable, change true → false below (or delete this line and restore the
  // original flag-based check once the drag issue is resolved).
  const debugEnabled = true;
  gestureDebug.setEnabled(debugEnabled);
  // Original check (re-enable when done debugging):
  // const debugEnabled =
  //   (window as { __IRS_DEBUG_GESTURES?: boolean }).__IRS_DEBUG_GESTURES === true ||
  //   localStorage.getItem('__IRS_DEBUG_GESTURES') === 'true' ||
  //   sessionStorage.getItem('__IRS_DEBUG_GESTURES') === 'true' ||
  //   (import.meta.env.DEV && ENABLE_GESTURE_OVERLAY_IN_DEV);

  let dragFinishReason = '';
  let lastOverlayMoveTs = 0;

  function logGesture(label: string, data?: Record<string, unknown>): void {
    gestureDebug.log(label, data);
  }

  function setGestureState(patch: Record<string, unknown>): void {
    gestureDebug.setState(patch);
  }

  function logGestureMoveThrottled(data: Record<string, unknown>): void {
    const now = performance.now();
    if (now - lastOverlayMoveTs < 80) return;
    lastOverlayMoveTs = now;
    logGesture('drag.pointermove', data);
  }

  setGestureState({ longPressMs: 260, scrollThresholdPx: 8, dragStartSlopPx: 6 });

  const expandedGroups = new Set<string>();
  // Legacy organize mode removed — drag is now always available (selection-first model).
  const uploadStatus = new Map<
    string,
    { state: 'idle' | 'uploading' | 'success' | 'error'; message: string }
  >();
  let sheetAssetId: string | null = null;
  let sheetView: 'menu' | 'rename' | 'delete-confirm' | 'move-to' = 'menu';
  let moveToType: AssetGroupType = 'tilesets';
  let activeSubtab: AssetSubtabId = 'tiles';

  // Multi-select state: assets selected via long-press gesture (selection-first model)
  const selectedAssetIds = new Set<string>();

  // Maps each capsule DOM element → its controller so gesture callbacks can
  // update visual state (lit, selected) without a full re-render.
  const capsuleMap = new WeakMap<HTMLElement, AssetCapsuleController>();

  // Group management state
  type GroupEditMode = 'rename' | 'set-grid';
  let groupEditState: { type: AssetGroupType; slug: string; mode: GroupEditMode } | null = null;
  let inlineGroupCreateOpen = false;

  function clearSelection(): void {
    selectedAssetIds.clear();
  }

  type DragState = {
    groupType: AssetGroupType;
    groupSlug: string;
    assetId: string;
    /** Additional asset ids dragged together in multi-select mode */
    extraAssetIds: string[];
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
    /** Prior inline style values saved before hiding the card; restored in finishDrag. */
    prevPosition: string;
    prevOpacity: string;
    prevPointerEvents: string;
    onPointerMove: (event: PointerEvent) => void;
    onPointerUp: (event: PointerEvent) => void;
    onPointerCancel: (event: PointerEvent) => void;
    onLostPointerCapture: (event: PointerEvent) => void;
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
  root.className = 'irs-asset-library';

  const createSection = document.createElement('section');
  createSection.className = 'irs-asset-library__section';

  const createTitle = document.createElement('div');
  createTitle.className = 'irs-asset-library__title';
  createTitle.textContent = 'Create Group';

  const createRow = document.createElement('div');
  createRow.className = 'irs-asset-library__row';

  const nameInput = document.createElement('input');
  nameInput.className = 'irs-input';
  nameInput.type = 'text';
  nameInput.placeholder = 'Group name (e.g., Trees)';
  nameInput.maxLength = 32;

  const typeSelect = document.createElement('select');
  typeSelect.className = 'irs-asset-library__select';
  typeSelect.innerHTML = `
    <option value="tilesets">Tilesets</option>
    <option value="props">Props</option>
    <option value="entities">Entities</option>
  `;

  const createButton = document.createElement('button');
  createButton.type = 'button';
  createButton.className = 'irs-btn irs-btn--primary';
  createButton.textContent = 'Add Group';

  const createHint = document.createElement('div');
  createHint.className = 'irs-asset-library__hint';
  createHint.textContent = 'Groups organize assets for paint, props, and entity palettes.';

  createRow.appendChild(nameInput);
  createRow.appendChild(typeSelect);
  createRow.appendChild(createButton);
  createSection.appendChild(createTitle);
  createSection.appendChild(createRow);
  createSection.appendChild(createHint);

  root.appendChild(createSection);

  const librarySection = document.createElement('section');
  librarySection.className = 'irs-asset-library__section';

  const libraryTitle = document.createElement('div');
  libraryTitle.className = 'irs-asset-library__title';
  libraryTitle.textContent = 'Assets Library';

  // Subtab row: scrollable tab bar + "+" create-group button
  const subtabRow = document.createElement('div');
  subtabRow.className = 'irs-asset-library__subtab-row';

  // Scrollable tab strip
  const subtabBar = document.createElement('div');
  subtabBar.className = 'irs-asset-library__subtabs-scroll';
  ASSET_SUBTABS.forEach((tab) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'irs-asset-subtabs__tab';
    btn.textContent = tab.label;
    btn.dataset.subtab = tab.id;
    btn.addEventListener('click', () => {
      activeSubtab = tab.id;
      inlineGroupCreateOpen = false;
      groupEditState = null;
      clearSelection();
      refresh();
    });
    subtabBar.appendChild(btn);
  });

  // "+" button: only shown/active for tiles/props/entities tabs
  const subtabCreateBtn = document.createElement('button');
  subtabCreateBtn.type = 'button';
  subtabCreateBtn.className = 'irs-asset-library__subtab-create-btn';
  subtabCreateBtn.setAttribute('aria-label', 'New group');
  subtabCreateBtn.setAttribute('title', 'New group');
  subtabCreateBtn.textContent = '+';
  subtabCreateBtn.addEventListener('click', () => {
    if (['tiles', 'props', 'entities'].includes(activeSubtab)) {
      inlineGroupCreateOpen = !inlineGroupCreateOpen;
      groupEditState = null;
      refresh();
    }
  });

  subtabRow.appendChild(subtabBar);
  subtabRow.appendChild(subtabCreateBtn);

  librarySection.appendChild(libraryTitle);
  librarySection.appendChild(subtabRow);

  // Selection bar — always present; shown when selectedAssetIds.size > 0
  const selectionBar = document.createElement('div');
  selectionBar.className = 'irs-asset-library__selection-bar';
  selectionBar.style.display = 'none';
  librarySection.appendChild(selectionBar);

  root.appendChild(librarySection);

  const sheetScrim = document.createElement('div');
  sheetScrim.className = 'irs-overlay irs-asset-library__sheet-scrim';
  sheetScrim.addEventListener('click', () => {
    sheetAssetId = null;
    refresh();
  });
  root.appendChild(sheetScrim);

  // Tap outside any asset capsule clears the selection (within the panel).
  root.addEventListener('pointerdown', (e) => {
    if (selectedAssetIds.size === 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('.irs-asset-capsule')) return;
    if (target.closest('.irs-asset-library__selection-bar')) return;
    clearSelection();
    refresh();
  });

  // Separate scrim for animation direction assignment bottom sheet
  const animScrim = document.createElement('div');
  animScrim.className = 'irs-overlay irs-asset-library__anim-scrim';
  animScrim.addEventListener('click', () => {
    directionSheetSetId = null;
    renderAnimSheet();
  });
  root.appendChild(animScrim);

  // Wrap the asset library in a gesture-owned viewport so we can replace
  // native overflow-y:auto with a custom translateY scroller.  Only this
  // tab is affected; other berry tabs keep their default scroll behaviour.
  const viewportEl = document.createElement('div');
  viewportEl.className = 'irs-asset-viewport';
  const contentEl = document.createElement('div');
  contentEl.className = 'irs-asset-content';
  viewportEl.appendChild(contentEl);
  contentEl.appendChild(root);
  container.appendChild(viewportEl);

  function groupKey(group: AssetGroup): string {
    return `${group.type}:${group.slug}`;
  }

  function openAssetSheet(assetId: string, view: 'menu' | 'rename' | 'delete-confirm' | 'move-to' = 'menu'): void {
    sheetAssetId = assetId;
    sheetView = view;
    refresh();
  }

  /**
   * Opens the settings sheet for the current selection.
   * If one asset is selected, all actions (including Rename) are available.
   * If multiple are selected, only batch-capable actions (Move, Delete) are shown.
   */
  function openSelectionSheet(): void {
    if (selectedAssetIds.size === 0) return;
    const firstId = [...selectedAssetIds][0];
    sheetAssetId = firstId;
    sheetView = 'menu';
    refresh();
  }

  /**
   * Updates the selection bar visibility and content.
   * Shows count + "Settings" + "Clear" when any assets are selected.
   */
  function renderSelectionBar(): void {
    if (selectedAssetIds.size === 0) {
      selectionBar.style.display = 'none';
      return;
    }
    selectionBar.style.display = '';
    selectionBar.innerHTML = '';

    const countEl = document.createElement('span');
    countEl.className = 'irs-asset-library__selection-count';
    countEl.textContent = `${selectedAssetIds.size} selected`;

    const settingsBtn = document.createElement('button');
    settingsBtn.type = 'button';
    settingsBtn.className = 'irs-btn irs-btn--secondary';
    settingsBtn.textContent = 'Settings';
    settingsBtn.addEventListener('pointerdown', (e) => e.stopPropagation()); // don't trigger clear-on-outside
    settingsBtn.addEventListener('click', () => openSelectionSheet());

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'irs-btn irs-btn--secondary';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    clearBtn.addEventListener('click', () => {
      clearSelection();
      refresh();
    });

    selectionBar.appendChild(countEl);
    selectionBar.appendChild(settingsBtn);
    selectionBar.appendChild(clearBtn);
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
    extraAssetIds?: string[];
  }): void {
    if (dragState) {
      logGesture('beginDrag.skipped', { reason: 'dragState-active' });
      return;
    }
    const { event, card, grid, group, fromIndex, assetId, extraAssetIds = [] } = options;
    const rect = card.getBoundingClientRect();
    logGesture('beginDrag.start', {
      pointerId: event.pointerId,
      assetId,
      selectedCount: selectedAssetIds.size,
      rectWidth: rect.width,
      rectHeight: rect.height,
      groupKey: grid.dataset.groupKey ?? '',
      fromIndex,
    });
    setGestureState({
      activePointerId: event.pointerId,
      captureDocument: false,
      captureViewport: viewportEl.hasPointerCapture(event.pointerId),
      lastFinishReason: '',
    });

    const ghost = card.cloneNode(true) as HTMLElement;
    ghost.classList.add('irs-asset-library__ghost');
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    document.body.appendChild(ghost);

    const placeholder = document.createElement('div');
    placeholder.className = 'irs-asset-library__placeholder';
    placeholder.style.width = `${rect.width}px`;
    placeholder.style.height = `${rect.height}px`;
    grid.insertBefore(placeholder, card);

    const firstRowEl = grid.querySelector<HTMLElement>('.irs-asset-capsule');
    const layoutProbeBefore = {
      cardHeight: card.offsetHeight,
      cardWidth: card.offsetWidth,
      firstRowHeight: firstRowEl?.offsetHeight ?? 0,
      placeholderHeight: placeholder.offsetHeight,
    };
    logGesture('layout-probe.before', layoutProbeBefore);

    // Use documentElement as the capture target instead of the card.
    // The ghost element has pointer-events:none so it can't hold capture.
    // documentElement is always visible and reliably holds capture for the
    // full gesture.
    const dragCaptureEl = document.documentElement;
    logGesture('capture.document.before', {
      pointerId: event.pointerId,
      hasCapture: dragCaptureEl.hasPointerCapture(event.pointerId),
    });
    try {
      dragCaptureEl.setPointerCapture(event.pointerId);
      logGesture('capture.document.after', {
        pointerId: event.pointerId,
        hasCapture: dragCaptureEl.hasPointerCapture(event.pointerId),
      });
      setGestureState({ captureDocument: dragCaptureEl.hasPointerCapture(event.pointerId) });
    } catch (_) {
      // Pointer already released; finishDrag will handle cleanup.
      logGesture('capture.document.error', { pointerId: event.pointerId });
    }

    // Hide the original card without using display:none.
    // display:none removes the element from the render tree; on some mobile
    // browsers this destabilises the pointer stream even after capture has
    // been transferred to documentElement, causing an immediate lostpointercapture
    // and a "flash then cancel" symptom.
    // position:absolute takes the card out of the grid's flow (so the placeholder
    // fills the slot visually) while still keeping it in the render tree.
    const prevPosition = card.style.position;
    const prevOpacity = card.style.opacity;
    const prevPointerEvents = card.style.pointerEvents;
    card.style.position = 'absolute';
    card.style.opacity = '0';
    card.style.pointerEvents = 'none';

    const onPointerMove = (moveEvent: PointerEvent) => {
      handleDragMove(moveEvent);
    };
    const onPointerUp = (upEvent: PointerEvent) => {
      dragFinishReason = 'pointerup';
      logGesture('drag.pointerup', { pointerId: upEvent.pointerId });
      try {
        finishDrag(upEvent);
      } catch (error) {
        dragFinishReason = 'exception';
        logGesture('finishDrag.exception', { pointerId: upEvent.pointerId, error: String(error) });
        throw error;
      }
    };
    const onPointerCancel = (cancelEvent: PointerEvent) => {
      dragFinishReason = 'pointercancel';
      logGesture('drag.pointercancel', { pointerId: cancelEvent.pointerId });
      try {
        finishDrag(cancelEvent);
      } catch (error) {
        dragFinishReason = 'exception';
        logGesture('finishDrag.exception', { pointerId: cancelEvent.pointerId, error: String(error) });
        throw error;
      }
    };
    const onLostPointerCapture = (lostEvent: PointerEvent) => {
      finishDragOnCaptureLoss(lostEvent);
    };

    dragState = {
      groupType: group.type,
      groupSlug: group.slug,
      assetId,
      extraAssetIds,
      fromIndex,
      pointerId: event.pointerId,
      captureEl: dragCaptureEl,
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
      prevPosition,
      prevOpacity,
      prevPointerEvents,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onLostPointerCapture,
    };

    dragCaptureEl.addEventListener('pointermove', onPointerMove);
    dragCaptureEl.addEventListener('pointerup', onPointerUp);
    dragCaptureEl.addEventListener('pointercancel', onPointerCancel);
    dragCaptureEl.addEventListener('lostpointercapture', onLostPointerCapture);

    requestAnimationFrame(() => {
      const after = {
        cardHeight: card.offsetHeight,
        cardWidth: card.offsetWidth,
        firstRowHeight: firstRowEl?.offsetHeight ?? 0,
        placeholderHeight: placeholder.offsetHeight,
      };
      const delta = {
        cardHeight: after.cardHeight - layoutProbeBefore.cardHeight,
        cardWidth: after.cardWidth - layoutProbeBefore.cardWidth,
        firstRowHeight: after.firstRowHeight - layoutProbeBefore.firstRowHeight,
        placeholderHeight: after.placeholderHeight - layoutProbeBefore.placeholderHeight,
      };
      logGesture('layout-probe.after-raf', { ...after, delta });
      setGestureState({
        layoutProbe: `cardΔh:${delta.cardHeight} rowΔh:${delta.firstRowHeight} phΔh:${delta.placeholderHeight}`,
      });
    });
  }

  function handleDragMove(event: PointerEvent): void {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const active = dragState;
    active.ghost.style.left = `${event.clientX - active.offsetX}px`;
    active.ghost.style.top = `${event.clientY - active.offsetY}px`;

    // Detect cross-group movement: find which group grid the pointer is over
    const elementUnderPointer = document.elementFromPoint(event.clientX, event.clientY);
    const gridUnderPointer = elementUnderPointer?.closest<HTMLElement>('[data-group-key]');
    const groupKeyUnderPointer = gridUnderPointer?.dataset.groupKey ?? '';
    logGestureMoveThrottled({
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      target: elementUnderPointer instanceof Element ? elementUnderPointer.tagName.toLowerCase() : 'none',
      groupKey: groupKeyUnderPointer,
    });
    setGestureState({
      elementFromPoint: elementUnderPointer instanceof Element ? elementUnderPointer : null,
      closestGroupKey: groupKeyUnderPointer,
    });
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

    const cardNodes = Array.from(active.targetGrid.querySelectorAll<HTMLElement>('.irs-asset-capsule')).filter(
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

    // Autoscroll: drive the virtual scroller when the pointer is near the
    // top or bottom edge of the viewport during a drag.
    const edge = 72;
    const bounds = viewportEl.getBoundingClientRect();
    if (event.clientY < bounds.top + edge) {
      virtualScroller.scrollBy(-10);
    } else if (event.clientY > bounds.bottom - edge) {
      virtualScroller.scrollBy(10);
    }
  }

  function finishDrag(event: PointerEvent): void {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const finishReason = dragFinishReason || event.type;
    logGesture('finishDrag.start', {
      finishReason,
      pointerId: event.pointerId,
      eventType: event.type,
    });
    setGestureState({
      lastFinishReason: finishReason,
      captureDocument: document.documentElement.hasPointerCapture(event.pointerId),
      captureViewport: viewportEl.hasPointerCapture(event.pointerId),
    });
    if (DEBUG_DND) console.log(`[DND] end via ${event.type}`);
    const next = dragState;
    dragState = null;
    next.captureEl.removeEventListener('pointermove', next.onPointerMove);
    next.captureEl.removeEventListener('pointerup', next.onPointerUp);
    next.captureEl.removeEventListener('pointercancel', next.onPointerCancel);
    next.captureEl.removeEventListener('lostpointercapture', next.onLostPointerCapture);

    next.ghost.remove();
    next.placeholder.remove();
    // Restore the card's prior inline style values (position/opacity/pointerEvents
    // were overridden in beginDrag to keep the element in the render tree while
    // hiding it from view; '' restores the cascade for properties that had no
    // prior inline value).
    next.card.style.position = next.prevPosition;
    next.card.style.opacity = next.prevOpacity;
    next.card.style.pointerEvents = next.prevPointerEvents;

    const crossGroup =
      next.targetGroupType !== next.groupType ||
      next.targetGroupSlug !== next.groupSlug;

    if (crossGroup) {
      // Cross-group move (primary asset only; multi-select cross-group not supported in v1)
      assetRegistry.moveAsset({
        assetId: next.assetId,
        toGroupType: next.targetGroupType,
        toGroupSlug: next.targetGroupSlug,
        toIndex: next.toIndex,
      });
      clearSelection();
      refresh();
      logGesture('finishDrag.commit', {
        finishReason,
        crossGroup: true,
        didCommit: true,
        fromGroup: `${next.groupType}:${next.groupSlug}`,
        toGroup: `${next.targetGroupType}:${next.targetGroupSlug}`,
        selectedCount: 1 + next.extraAssetIds.length,
      });
    } else {
      const didReorder = next.toIndex !== next.fromIndex;
      if (didReorder) {
        // Resolve the "insert before" target using stable asset IDs rather than
        // array indices.  The DOM capsule list is filtered to paintable assets
        // only (isSource entries are hidden), so DOM-derived indices do not
        // correspond 1-to-1 with indices in the registry's group.assets array.
        // Using the asset id of the card currently at next.toIndex (the card
        // that the placeholder sits before at drop time) avoids that mismatch.
        const cardNodes = Array.from(
          next.targetGrid.querySelectorAll<HTMLElement>('.irs-asset-capsule')
        ).filter((node) => node !== next.card);
        const beforeEl = cardNodes[next.toIndex] ?? null;
        const beforeId = beforeEl?.dataset.assetId ?? null;

        // Reorder all selected assets together, maintaining relative order
        const allIds = [next.assetId, ...next.extraAssetIds];
        if (allIds.length > 1) {
          // For multi-asset: reorder primary by ID, then move extras adjacent
          // to it using real indices from the (now-updated) registry state.
          assetRegistry.reorderAssetById({
            groupType: next.groupType,
            groupSlug: next.groupSlug,
            movedId: next.assetId,
            beforeId,
          });
          // Re-insert extras after primary (in original relative order)
          const state = assetRegistry.getState();
          const grp = state.groups.find(
            (g) => g.type === next.groupType && g.slug === next.groupSlug
          );
          if (grp) {
            const primaryNewIndex = grp.assets.findIndex((a) => a.id === next.assetId);
            let insertAfter = primaryNewIndex + 1;
            for (const extraId of next.extraAssetIds) {
              const extraIndex = grp.assets.findIndex((a) => a.id === extraId);
              if (extraIndex !== -1 && extraIndex !== insertAfter) {
                assetRegistry.reorderAsset({
                  groupType: next.groupType,
                  groupSlug: next.groupSlug,
                  fromIndex: extraIndex,
                  toIndex: insertAfter,
                });
              }
              insertAfter += 1;
            }
          }
        } else {
          assetRegistry.reorderAssetById({
            groupType: next.groupType,
            groupSlug: next.groupSlug,
            movedId: next.assetId,
            beforeId,
          });
        }
        clearSelection();
        refresh();
      }
      logGesture('finishDrag.commit', {
        finishReason,
        crossGroup: false,
        didCommit: didReorder,
        fromIndex: next.fromIndex,
        toIndex: next.toIndex,
        selectedCount: 1 + next.extraAssetIds.length,
      });
    }
    dragFinishReason = '';
  }

  function finishDragOnCaptureLoss(event: Event): void {
    if (!(event instanceof PointerEvent)) return;
    dragFinishReason = 'lostpointercapture';
    logGesture('drag.lostpointercapture', {
      pointerId: event.pointerId,
      target: event.target instanceof HTMLElement ? event.target.tagName.toLowerCase() : 'unknown',
    });
    setGestureState({
      lastLostCaptureTarget:
        event.target instanceof HTMLElement ? event.target.tagName.toLowerCase() : 'unknown',
      captureDocument: document.documentElement.hasPointerCapture(event.pointerId),
      captureViewport: viewportEl.hasPointerCapture(event.pointerId),
    });
    finishDrag(event);
  }

  function renderAssets(group: AssetGroup, selectedAssetId: string | null): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'irs-asset-library__assets';
    wrapper.setAttribute('data-group-key', makeGroupKey(group.type, group.slug));
    // Apply gridHint CSS variable for fixed-column grid
    if (group.gridHint?.cols) {
      wrapper.style.setProperty('--irs-group-cols', String(group.gridHint.cols));
      wrapper.style.gridTemplateColumns = `repeat(${group.gridHint.cols}, minmax(0, 1fr))`;
    }

    if (group.assets.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'irs-asset-library__empty';
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
  }): HTMLElement {
    const { asset, selectedAssetId } = options;

    const sizeLabel = asset.width > 0 && asset.height > 0 ? `${asset.width}×${asset.height}` : 'Size unknown';
    const sourceLabel = asset.source === 'repo' ? 'Repo' : 'Local';
    const sliceLabel = asset.sourceAssetId ? ' · Slice' : '';
    const badgeText = `${sizeLabel} · ${sourceLabel}${sliceLabel}`;

    const thumbnailCanvas = (asset.sourceAssetId && asset.rect)
      ? renderSliceThumbnail(asset) as HTMLCanvasElement
      : undefined;
    const thumbnailUrl = thumbnailCanvas ? undefined : resolveAssetUrl(asset.dataUrl);

    const isMultiSelected = selectedAssetIds.has(asset.id);

    const capsule = createAssetCapsule({
      assetId: asset.id,
      name: asset.name,
      thumbnailUrl,
      thumbnailCanvas,
      selected: asset.id === selectedAssetId || isMultiSelected,
      badge: badgeText,
    });

    const card = capsule.el;

    // Tag the element so the viewport-level sortableScroller can identify it.
    card.dataset.assetId = asset.id;

    // Register in the capsule map so gesture callbacks can update visual state
    // (lit highlight, selected border) without a full re-render.
    capsuleMap.set(card, capsule);

    // Gesture detection (long-press / scroll / drag) is owned by the
    // sortableScroller attached to the viewport element.  Its callbacks are
    // configured once (just before the first refresh) and look up per-asset
    // state via card.dataset.assetId and capsuleMap.

    return card;
  }

  function openGroupMenu(group: AssetGroup, anchorEl: HTMLElement): void {
    // Remove any existing group popup
    document.getElementById('irs-group-menu-popup')?.remove();

    const popup = document.createElement('div');
    popup.id = 'irs-group-menu-popup';
    popup.className = 'irs-asset-settings-popup'; // reuse existing popup styles

    let destroyed = false;
    function dismiss(): void {
      if (destroyed) return;
      destroyed = true;
      popup.remove();
      document.removeEventListener('pointerdown', onOutside, true);
      document.removeEventListener('keydown', onKey, true);
    }

    function addMenuBtn(label: string, onClick: () => void, danger = false): void {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'irs-asset-settings-popup__btn' + (danger ? ' irs-asset-settings-popup__btn--danger' : '');
      btn.textContent = label;
      btn.addEventListener('pointerdown', (e) => e.stopPropagation());
      btn.addEventListener('click', () => { dismiss(); onClick(); });
      popup.appendChild(btn);
    }

    function addMenuDivider(): void {
      const div = document.createElement('div');
      div.className = 'irs-asset-settings-popup__divider';
      popup.appendChild(div);
    }

    addMenuBtn('Rename', () => {
      groupEditState = { type: group.type, slug: group.slug, mode: 'rename' };
      expandedGroups.add(groupKey(group));
      refresh();
    });

    addMenuBtn('Set grid width', () => {
      groupEditState = { type: group.type, slug: group.slug, mode: 'set-grid' };
      expandedGroups.add(groupKey(group));
      refresh();
    });

    if (group.slug !== 'ungrouped') {
      addMenuDivider();
      addMenuBtn('Delete', () => {
        const count = group.assets.length;
        assetRegistry.deleteGroup(group.type, group.slug);
        uxFeedback.undo.show(
          count > 0
            ? `"${group.name}" deleted — ${count} asset${count !== 1 ? 's' : ''} moved to Ungrouped.`
            : `Group "${group.name}" deleted.`,
          () => {},
          { destructive: count > 0 }
        );
      }, true);
    }

    document.body.appendChild(popup);

    const anchorRect = anchorEl.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const MARGIN = 8;

    const spaceBelow = vh - anchorRect.bottom;
    const spaceAbove = anchorRect.top;
    let top: number;
    if (spaceBelow >= popupRect.height + MARGIN || spaceBelow >= spaceAbove) {
      top = anchorRect.bottom + MARGIN;
    } else {
      top = anchorRect.top - popupRect.height - MARGIN;
    }
    let left = anchorRect.left;
    left = Math.max(MARGIN, Math.min(left, vw - popupRect.width - MARGIN));
    top = Math.max(MARGIN, Math.min(top, vh - popupRect.height - MARGIN));
    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;

    const onOutside = (e: PointerEvent): void => {
      if (!popup.contains(e.target as Node)) dismiss();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') { e.stopPropagation(); dismiss(); }
    };

    queueMicrotask(() => {
      if (!destroyed) {
        document.addEventListener('pointerdown', onOutside, true);
        document.addEventListener('keydown', onKey, true);
      }
    });
  }

  function renderGroups(
    groups: AssetGroup[],
    selectedAssetId: string | null,
    skipEmptyState?: boolean
  ): void {
    librarySection.querySelectorAll('.irs-asset-library__group').forEach((node) => node.remove());
    librarySection.querySelectorAll('.irs-asset-library__empty, .irs-empty-state').forEach((node) => node.remove());
    librarySection.querySelectorAll('.irs-asset-library__inline-group-create').forEach((node) => node.remove());

    // Exclude source assets from the main groups; they appear in the Sources section below.
    const paintableGroups = groups.map((group) => ({
      ...group,
      assets: group.assets.filter((asset) => !asset.isSource),
    }));

    // Render inline group create form when "+" was clicked
    if (inlineGroupCreateOpen && !skipEmptyState) {
      const activeTab = ASSET_SUBTABS.find((t) => t.id === activeSubtab);
      const createType: AssetGroupType = (activeTab?.groupType ?? 'tilesets') as AssetGroupType;

      const inlineCreateRow = document.createElement('div');
      inlineCreateRow.className = 'irs-asset-library__inline-group-create';

      const inlineInput = document.createElement('input');
      inlineInput.type = 'text';
      inlineInput.className = 'irs-input irs-asset-library__inline-group-create-input';
      inlineInput.placeholder = 'Group name…';
      inlineInput.maxLength = 32;

      const commitCreate = (): void => {
        const trimmed = inlineInput.value.trim();
        if (trimmed) {
          const newGroup = assetRegistry.createGroup(createType, trimmed);
          expandedGroups.add(groupKey(newGroup));
          uxFeedback.toast.success(`Group "${newGroup.name}" created.`);
        }
        inlineGroupCreateOpen = false;
        refresh();
      };
      const cancelCreate = (): void => {
        inlineGroupCreateOpen = false;
        refresh();
      };

      inlineInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); commitCreate(); }
        if (e.key === 'Escape') { e.preventDefault(); cancelCreate(); }
      });

      const createBtn = document.createElement('button');
      createBtn.type = 'button';
      createBtn.className = 'irs-btn irs-btn--primary';
      createBtn.textContent = 'Create';
      createBtn.addEventListener('mousedown', (e) => e.preventDefault());
      createBtn.addEventListener('click', () => { uxFeedback.motion.pulse(createBtn); commitCreate(); });

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'irs-btn irs-btn--secondary';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('mousedown', (e) => e.preventDefault());
      cancelBtn.addEventListener('click', cancelCreate);

      inlineCreateRow.appendChild(inlineInput);
      inlineCreateRow.appendChild(createBtn);
      inlineCreateRow.appendChild(cancelBtn);
      librarySection.appendChild(inlineCreateRow);
      queueMicrotask(() => inlineInput.focus());
    }

    if (groups.length === 0) {
      if (!skipEmptyState) {
        const emptyContainer = document.createElement('div');
        uxFeedback.emptyState.render(emptyContainer, {
          message: 'No assets yet.',
          actionLabel: 'New Group',
          onAction: () => { inlineGroupCreateOpen = true; refresh(); },
        });
        librarySection.appendChild(emptyContainer);
      }
      return;
    }

    const groupsByType = paintableGroups.reduce<Record<AssetGroupType, AssetGroup[]>>(
      (acc, group) => {
        if (group.type !== 'sources') {
          acc[group.type].push(group);
        }
        return acc;
      },
      { tilesets: [], props: [], entities: [], sources: [] }
    );

    ((['tilesets', 'props', 'entities'] as AssetGroupType[])).forEach((type) => {
      const typeGroups = groupsByType[type];
      if (typeGroups.length === 0) return;

      typeGroups.forEach((group) => {
        const groupWrapper = document.createElement('div');
        groupWrapper.className = 'irs-asset-library__group';

        const header = document.createElement('div');
        header.className = 'irs-asset-library__group-header';

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'irs-asset-library__group-toggle';
        const key = groupKey(group);
        const isOpen = expandedGroups.has(key) || group.assets.length > 0;
        if (isOpen) {
          expandedGroups.add(key);
        }

        toggle.innerHTML = `
          <span style="flex-shrink:0;font-size:10px;color:var(--irs-text-secondary)">${isOpen ? '▼' : '▶'}</span>
          <span>${group.name}</span>
          <span class="irs-asset-library__group-count">${group.assets.length}</span>
        `;

        // "⋯" group menu button
        const groupMenuBtn = document.createElement('button');
        groupMenuBtn.type = 'button';
        groupMenuBtn.className = 'irs-asset-library__group-menu-btn';
        groupMenuBtn.setAttribute('aria-label', 'Group options');
        groupMenuBtn.setAttribute('title', 'Group options');
        groupMenuBtn.textContent = '⋯';
        groupMenuBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          openGroupMenu(group, groupMenuBtn);
        });

        const assetsContainer = renderAssets(group, selectedAssetId);
        assetsContainer.classList.toggle('irs-asset-library__assets--open', isOpen);

        toggle.addEventListener('click', () => {
          const open = !expandedGroups.has(key);
          if (open) {
            expandedGroups.add(key);
          } else {
            expandedGroups.delete(key);
            // Close any edit for this group when collapsing
            if (groupEditState?.type === group.type && groupEditState?.slug === group.slug) {
              groupEditState = null;
            }
          }
          assetsContainer.classList.toggle('irs-asset-library__assets--open', open);
          // Update indicator without full refresh
          const indicator = toggle.querySelector('span:first-child');
          if (indicator) indicator.textContent = open ? '▼' : '▶';
        });

        header.appendChild(toggle);

        if (uploadEnabled) {
          const actions = document.createElement('div');
          actions.className = 'irs-asset-library__group-actions';

          const status = document.createElement('div');
          status.className = 'irs-asset-library__upload-status';

          const statusKey = groupKey(group);
          const currentStatus = uploadStatus.get(statusKey);
          if (currentStatus) {
            status.textContent = currentStatus.message;
            status.classList.toggle(
              'irs-asset-library__upload-status--error',
              currentStatus.state === 'error'
            );
            status.classList.toggle(
              'irs-asset-library__upload-status--success',
              currentStatus.state === 'success'
            );
          }

          const uploadButton = document.createElement('button');
          uploadButton.type = 'button';
          uploadButton.className = 'irs-btn irs-btn--primary';
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
          actions.appendChild(groupMenuBtn);
          header.appendChild(actions);
        } else {
          const actions = document.createElement('div');
          actions.className = 'irs-asset-library__group-actions';
          actions.appendChild(groupMenuBtn);
          header.appendChild(actions);
        }

        groupWrapper.appendChild(header);

        // Inline edit form (rename / set-grid) shown below group header
        const isEditing = groupEditState?.type === group.type && groupEditState?.slug === group.slug;
        if (isEditing && groupEditState) {
          const editForm = document.createElement('div');
          if (groupEditState.mode === 'rename') {
            editForm.className = 'irs-asset-library__group-rename-row';

            const renameInput = document.createElement('input');
            renameInput.type = 'text';
            renameInput.className = 'irs-input irs-asset-library__group-rename-input';
            renameInput.value = group.name;
            renameInput.maxLength = 32;

            const commitRename = (): void => {
              const trimmed = renameInput.value.trim();
              if (trimmed && trimmed !== group.name) {
                assetRegistry.renameGroup(group.type, group.slug, trimmed);
              }
              groupEditState = null;
              refresh();
            };
            const cancelEdit = (): void => { groupEditState = null; refresh(); };

            renameInput.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
              if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
            });
            renameInput.addEventListener('blur', commitRename);

            const okBtn = document.createElement('button');
            okBtn.type = 'button';
            okBtn.className = 'irs-btn irs-btn--primary';
            okBtn.textContent = '✓';
            okBtn.addEventListener('mousedown', (e) => e.preventDefault());
            okBtn.addEventListener('click', (e) => { e.stopPropagation(); commitRename(); });

            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'irs-btn irs-btn--secondary';
            cancelBtn.textContent = '✕';
            cancelBtn.addEventListener('mousedown', (e) => e.preventDefault());
            cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); cancelEdit(); });

            editForm.appendChild(renameInput);
            editForm.appendChild(okBtn);
            editForm.appendChild(cancelBtn);
            queueMicrotask(() => { renameInput.focus(); renameInput.select(); });

          } else if (groupEditState.mode === 'set-grid') {
            editForm.className = 'irs-asset-library__group-grid-row';

            const label = document.createElement('span');
            label.className = 'irs-asset-library__group-grid-label';
            label.textContent = 'Columns:';

            const gridInput = document.createElement('input');
            gridInput.type = 'number';
            gridInput.className = 'irs-input irs-asset-library__group-grid-input';
            gridInput.min = '1';
            gridInput.max = '12';
            gridInput.step = '1';
            gridInput.value = String(group.gridHint?.cols ?? '');
            gridInput.placeholder = 'Auto';

            const commitGrid = (): void => {
              const val = parseInt(gridInput.value, 10);
              if (!isNaN(val) && val >= 1 && val <= 12) {
                assetRegistry.setGroupGridHint(group.type, group.slug, { cols: val });
              } else if (gridInput.value.trim() === '') {
                assetRegistry.setGroupGridHint(group.type, group.slug, undefined);
              }
              groupEditState = null;
              refresh();
            };
            const cancelEdit = (): void => { groupEditState = null; refresh(); };

            gridInput.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitGrid(); }
              if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
            });

            const applyBtn = document.createElement('button');
            applyBtn.type = 'button';
            applyBtn.className = 'irs-btn irs-btn--primary';
            applyBtn.textContent = 'Apply';
            applyBtn.addEventListener('click', commitGrid);

            const clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'irs-btn irs-btn--secondary';
            clearBtn.textContent = 'Auto';
            clearBtn.addEventListener('click', () => {
              assetRegistry.setGroupGridHint(group.type, group.slug, undefined);
              groupEditState = null;
              refresh();
            });

            editForm.appendChild(label);
            editForm.appendChild(gridInput);
            editForm.appendChild(applyBtn);
            editForm.appendChild(clearBtn);
            queueMicrotask(() => { gridInput.focus(); gridInput.select(); });
          }

          groupWrapper.appendChild(editForm);
        }

        groupWrapper.appendChild(assetsContainer);
        librarySection.appendChild(groupWrapper);
      });
    });
  }

  function renderAnimations(skip?: boolean): void {
    // Clean up old canvases / observers before rebuilding
    animIntersectionObserver?.disconnect();
    animationCanvases.clear();
    animationClock.destroy();
    stopRafLoop();

    librarySection.querySelectorAll('.irs-asset-library__anim-section')
      .forEach((node) => node.remove());

    if (skip) return;

    const animations = assetRegistry.getAnimations();
    const animationSets = assetRegistry.getAnimationSets();

    const fallbackPoster =
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="%23121a30"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="%239aa7d6" font-size="12" font-family="sans-serif">Anim</text></svg>`
      );

    // ── Outer collapsible section ──────────────────────────────────────
    const section = document.createElement('div');
    section.className = 'irs-asset-library__anim-section';

    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'irs-asset-library__anim-section-header';

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'irs-asset-library__group-toggle';
    toggleBtn.innerHTML = `
      <span>${animationsCollapsed ? '▶' : '▼'} Animations</span>
      <span class="irs-asset-library__group-count">${animations.length} clips · ${animationSets.length} sets</span>
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
      searchInput.className = 'irs-input irs-asset-library__anim-search';
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
      grid.className = 'irs-asset-library__animations';

      const noMatchMsg = document.createElement('div');
      noMatchMsg.className = 'irs-asset-library__anim-no-match';
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
        card.className = 'irs-asset-library__animation-card';
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
        nameDiv.className = 'irs-asset-library__asset-name';
        nameDiv.textContent = animation.name;

        if (activeRenameId === animation.id) {
          // Show inline rename row
          const renameRow = document.createElement('div');
          renameRow.className = 'irs-asset-library__anim-rename-row';
          renameRow.addEventListener('click', (e) => e.stopPropagation());

          const renameInput = document.createElement('input');
          renameInput.type = 'text';
          renameInput.className = 'irs-input irs-asset-library__anim-rename-input';
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
          okBtn.className = 'irs-btn irs-btn--primary';
          okBtn.textContent = '✓';
          okBtn.addEventListener('mousedown', (e) => e.preventDefault()); // prevent blur on input
          okBtn.addEventListener('click', (e) => { e.stopPropagation(); commitRename(); });

          const cancelBtn = document.createElement('button');
          cancelBtn.type = 'button';
          cancelBtn.className = 'irs-btn irs-btn--secondary';
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
        meta.className = 'irs-asset-library__animation-meta';
        meta.textContent = `${animation.frames.length} frames · ${animation.fps} fps`;
        card.appendChild(meta);

        // ── Action buttons ──
        const actions = document.createElement('div');
        actions.className = 'irs-asset-library__animation-actions';

        const renameButton = document.createElement('button');
        renameButton.type = 'button';
        renameButton.className = 'irs-btn irs-btn--secondary';
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
        duplicateButton.className = 'irs-btn irs-btn--secondary';
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
        whereUsedButton.className = 'irs-btn irs-btn--secondary';
        whereUsedButton.textContent = 'Where Used';
        whereUsedButton.addEventListener('click', async (event) => {
          event.stopPropagation();
          // Toggle: if already open for this card, collapse it
          if (activeWhereUsedId === animation.id) {
            activeWhereUsedId = null;
            card.classList.remove('irs-asset-library__animation-card--where-used-open');
            whereUsedPanel.remove();
            return;
          }
          // Show loading state, then scan
          activeWhereUsedId = animation.id;
          activeDeleteId = null;
          card.classList.add('irs-asset-library__animation-card--where-used-open');

          whereUsedPanel.innerHTML = '<div class="irs-asset-library__anim-where-used-hit">Scanning…</div>';
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
            msg.className = 'irs-asset-library__anim-where-used-hit';
            msg.textContent = 'Not used anywhere.';
            whereUsedPanel.appendChild(msg);
          } else {
            hits.slice(0, 20).forEach((hit) => {
              const row = document.createElement('div');
              row.className = 'irs-asset-library__anim-where-used-hit';
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
              more.className = 'irs-asset-library__anim-where-used-hit';
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
        whereUsedPanel.className = 'irs-asset-library__anim-where-used';
        whereUsedPanel.addEventListener('click', (e) => e.stopPropagation());
        if (activeWhereUsedId !== animation.id) {
          whereUsedPanel.style.display = 'none';
        } else {
          card.classList.add('irs-asset-library__animation-card--where-used-open');
        }
        card.appendChild(whereUsedPanel);

        // ── Delete button (× absolute in corner) ──
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'irs-btn irs-btn--danger irs-asset-library__animation-delete';
        deleteButton.textContent = '×';
        deleteButton.addEventListener('pointerdown', (event) => event.stopPropagation());
        deleteButton.addEventListener('click', async (event) => {
          event.stopPropagation();
          if (activeDeleteId === animation.id) {
            // Already showing confirm — tapping × again cancels it
            activeDeleteId = null;
            card.classList.remove('irs-asset-library__animation-card--delete-open');
            deleteConfirmEl.style.display = 'none';
            return;
          }
          activeDeleteId = animation.id;
          activeWhereUsedId = null;
          card.classList.add('irs-asset-library__animation-card--delete-open');

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
          label.className = 'irs-asset-library__anim-delete-label';
          label.textContent = hits.length > 0
            ? `Used by ${hits.length} — delete anyway?`
            : `Delete "${animation.name}"?`;
          deleteConfirmEl.appendChild(label);

          const confirmRow = document.createElement('div');
          confirmRow.className = 'irs-asset-library__anim-delete-row';

          const cancelBtn = document.createElement('button');
          cancelBtn.type = 'button';
          cancelBtn.className = 'irs-btn irs-btn--secondary';
          cancelBtn.textContent = 'Cancel';
          cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            activeDeleteId = null;
            card.classList.remove('irs-asset-library__animation-card--delete-open');
            deleteConfirmEl.style.display = 'none';
          });

          const confirmBtn = document.createElement('button');
          confirmBtn.type = 'button';
          confirmBtn.className = 'irs-btn irs-btn--danger';
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
        deleteConfirmEl.className = 'irs-asset-library__anim-delete-confirm';
        deleteConfirmEl.addEventListener('click', (e) => e.stopPropagation());
        deleteConfirmEl.style.display = 'none';
        if (activeDeleteId === animation.id) {
          card.classList.add('irs-asset-library__animation-card--delete-open');
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
      setsTitle.className = 'irs-asset-library__title';
      setsTitle.style.marginTop = '16px';
      setsTitle.textContent = 'Animation Sets';
      section.appendChild(setsTitle);

      // Inline create form or button
      const createSetRow = document.createElement('div');
      createSetRow.className = 'irs-asset-library__row';
      if (inlineSetCreateOpen) {
        const createInline = document.createElement('div');
        createInline.className = 'irs-asset-library__anim-set-create-inline';

        const createInput = document.createElement('input');
        createInput.type = 'text';
        createInput.className = 'irs-input irs-asset-library__anim-set-create-input';
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
        createBtn.className = 'irs-btn irs-btn--primary';
        createBtn.textContent = 'Create';
        createBtn.addEventListener('mousedown', (e) => e.preventDefault());
        createBtn.addEventListener('click', () => { uxFeedback.motion.pulse(createBtn); commitCreate(); });

        const cancelCreateBtn = document.createElement('button');
        cancelCreateBtn.type = 'button';
        cancelCreateBtn.className = 'irs-btn irs-btn--secondary';
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
        createSetButton.className = 'irs-btn irs-btn--primary';
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
        setGrid.className = 'irs-asset-library__animations';

        for (const animationSet of animationSets) {
          const card = document.createElement('div');
          card.className = 'irs-asset-library__animation-card';

          // ── Set name / inline rename ──
          if (activeSetRenameId === animationSet.id) {
            const renameRow = document.createElement('div');
            renameRow.className = 'irs-asset-library__anim-rename-row';
            renameRow.addEventListener('click', (e) => e.stopPropagation());

            const renameInput = document.createElement('input');
            renameInput.type = 'text';
            renameInput.className = 'irs-input irs-asset-library__anim-rename-input';
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
            okBtn.className = 'irs-btn irs-btn--primary';
            okBtn.textContent = '✓';
            okBtn.addEventListener('mousedown', (e) => e.preventDefault());
            okBtn.addEventListener('click', (e) => { e.stopPropagation(); commitSetRename(); });

            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'irs-btn irs-btn--secondary';
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
            name.className = 'irs-asset-library__asset-name';
            name.textContent = animationSet.name;
            card.appendChild(name);
          }

          // ── Direction summary ──
          const order = ['up', 'left', 'right', 'down'] as const;
          const directions = document.createElement('div');
          directions.className = 'irs-asset-library__animation-meta';
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
          actions.className = 'irs-asset-library__animation-actions';

          const assignBtn = document.createElement('button');
          assignBtn.type = 'button';
          assignBtn.className = 'irs-btn irs-btn--secondary';
          assignBtn.textContent = 'Assign Directions';
          assignBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            directionSheetSetId = animationSet.id;
            renderAnimSheet();
          });

          const renameSetBtn = document.createElement('button');
          renameSetBtn.type = 'button';
          renameSetBtn.className = 'irs-btn irs-btn--secondary';
          renameSetBtn.textContent = 'Rename';
          renameSetBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            activeSetRenameId = activeSetRenameId === animationSet.id ? null : animationSet.id;
            activeSetDeleteId = null;
            refresh();
          });

          const deleteSetBtn = document.createElement('button');
          deleteSetBtn.type = 'button';
          deleteSetBtn.className = 'irs-btn irs-btn--danger';
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
            card.classList.add('irs-asset-library__animation-card--delete-open');
            setDeleteConfirmEl.style.display = '';
          });

          actions.appendChild(assignBtn);
          actions.appendChild(renameSetBtn);
          actions.appendChild(deleteSetBtn);
          card.appendChild(actions);

          // ── Inline set delete confirm ──
          const setDeleteConfirmEl = document.createElement('div');
          setDeleteConfirmEl.className = 'irs-asset-library__anim-delete-confirm';
          setDeleteConfirmEl.addEventListener('click', (e) => e.stopPropagation());
          setDeleteConfirmEl.style.display = 'none';

          const setDeleteLabel = document.createElement('div');
          setDeleteLabel.className = 'irs-asset-library__anim-delete-label';
          setDeleteLabel.textContent = `Delete set "${animationSet.name}"?`;
          setDeleteConfirmEl.appendChild(setDeleteLabel);

          const setDeleteRow = document.createElement('div');
          setDeleteRow.className = 'irs-asset-library__anim-delete-row';

          const setDeleteCancel = document.createElement('button');
          setDeleteCancel.type = 'button';
          setDeleteCancel.className = 'irs-btn irs-btn--secondary';
          setDeleteCancel.textContent = 'Cancel';
          setDeleteCancel.addEventListener('click', (e) => {
            e.stopPropagation();
            activeSetDeleteId = null;
            card.classList.remove('irs-asset-library__animation-card--delete-open');
            setDeleteConfirmEl.style.display = 'none';
          });

          const setDeleteConfirm = document.createElement('button');
          setDeleteConfirm.type = 'button';
          setDeleteConfirm.className = 'irs-btn irs-btn--danger';
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
            card.classList.add('irs-asset-library__animation-card--delete-open');
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

  function renderSources(skip?: boolean): void {
    librarySection.querySelectorAll('.irs-asset-library__sources-section').forEach((node) => node.remove());

    if (skip) return;

    const allGroups = assetRegistry.getGroups();
    const sourceAssets = allGroups
      .flatMap((group) => group.assets)
      .filter((asset) => asset.isSource);

    const section = document.createElement('div');
    section.className = 'irs-asset-library__anim-section irs-asset-library__sources-section';

    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'irs-asset-library__anim-section-header';

    const titleBtn = document.createElement('button');
    titleBtn.type = 'button';
    titleBtn.className = 'irs-asset-library__group-toggle';
    titleBtn.innerHTML = `
      <span>Sources</span>
      <span class="irs-asset-library__group-count">${sourceAssets.length} spritesheet${sourceAssets.length !== 1 ? 's' : ''}</span>
    `;

    const note = document.createElement('div');
    note.className = 'irs-asset-library__sheet-note';
    note.style.marginTop = '4px';
    note.style.marginBottom = '8px';
    note.textContent = 'Read-only. Source spritesheets — slice them to create paintable tiles.';

    let sourcesVisible = true;

    titleBtn.addEventListener('click', () => {
      sourcesVisible = !sourcesVisible;
      grid.style.display = sourcesVisible ? '' : 'none';
      note.style.display = sourcesVisible ? '' : 'none';
    });

    sectionHeader.appendChild(titleBtn);
    section.appendChild(sectionHeader);
    section.appendChild(note);

    const grid = document.createElement('div');
    grid.className = 'irs-asset-library__animations';

    if (sourceAssets.length === 0) {
      const emptyContainer = document.createElement('div');
      uxFeedback.emptyState.render(emptyContainer, {
        message: 'No sources yet.',
        actionLabel: 'Import Spritesheet',
        onAction: () => nameInput.focus(),
      });
      section.appendChild(emptyContainer);
    } else {
      for (const asset of sourceAssets) {
        const card = document.createElement('div');
        card.className = 'irs-asset-library__animation-card';

        const img = document.createElement('img');
        img.src = resolveAssetUrl(asset.dataUrl);
        img.alt = asset.name;
        img.style.imageRendering = 'pixelated';
        card.appendChild(img);

        const name = document.createElement('div');
        name.className = 'irs-asset-library__asset-name';
        name.textContent = asset.name;
        card.appendChild(name);

        const meta = document.createElement('div');
        meta.className = 'irs-asset-library__animation-meta';
        meta.textContent = asset.source === 'repo' ? 'Repo' : 'Local';
        card.appendChild(meta);

        grid.appendChild(card);
      }
      section.appendChild(grid);
    }

    librarySection.appendChild(section);
  }

  function renderAnimSheet(): void {
    animScrim.innerHTML = '';
    directionPreviewCanvasMap.clear();
    if (!directionSheetSetId) {
      animScrim.classList.remove('irs-overlay--visible');
      return;
    }

    const animationSet = assetRegistry.getAnimationSets().find((s) => s.id === directionSheetSetId);
    if (!animationSet) {
      directionSheetSetId = null;
      animScrim.classList.remove('irs-overlay--visible');
      return;
    }

    animScrim.classList.add('irs-overlay--visible');

    const sheet = document.createElement('div');
    sheet.className = 'irs-dialog irs-asset-library__sheet';
    sheet.addEventListener('click', (e) => e.stopPropagation());

    const title = document.createElement('div');
    title.className = 'irs-asset-library__sheet-title';
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
      row.className = 'irs-asset-library__direction-row';

      const label = document.createElement('div');
      label.className = 'irs-asset-library__direction-label';
      label.textContent = facing.charAt(0).toUpperCase() + facing.slice(1);

      // ── Mini live-preview canvas for this direction ──
      const prevCanvas = document.createElement('canvas');
      prevCanvas.width = 44;
      prevCanvas.height = 44;
      prevCanvas.className = 'irs-asset-library__direction-preview';

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
      select.className = 'irs-asset-library__direction-select';

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
    saveBtn.className = 'irs-btn irs-btn--primary';
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
    cancelBtn.className = 'irs-btn irs-btn--secondary';
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
      sheetScrim.classList.remove('irs-overlay--visible');
      return;
    }

    const state = assetRegistry.getState();
    const activeGroup = state.groups.find((group) => group.assets.some((asset) => asset.id === sheetAssetId));
    const activeAsset = activeGroup?.assets.find((asset) => asset.id === sheetAssetId);
    if (!activeAsset || !activeGroup) {
      sheetAssetId = null;
      sheetScrim.classList.remove('irs-overlay--visible');
      return;
    }

    // Determine the full set of assets this sheet operates on.
    // If sheetAssetId is part of the current selection, use all selected assets (batch mode).
    // Otherwise, operate only on sheetAssetId (single-asset mode from non-selection path).
    const batchIds = selectedAssetIds.has(sheetAssetId)
      ? [...selectedAssetIds]
      : [sheetAssetId];
    const isBatch = batchIds.length > 1;

    sheetScrim.classList.add('irs-overlay--visible');
    const sheet = document.createElement('div');
    sheet.className = 'irs-dialog irs-asset-library__sheet';
    sheet.addEventListener('click', (event) => event.stopPropagation());

    if (sheetView === 'menu') {
      const actions: Array<{ label: string; onClick: () => void; danger?: boolean }> = [];

      // Rename is only available for a single-asset selection
      if (!isBatch) {
        actions.push({ label: 'Rename', onClick: () => openAssetSheet(activeAsset.id, 'rename') });
      }

      actions.push({
        label: isBatch ? `Move ${batchIds.length} assets\u2026` : 'Move to\u2026',
        onClick: () => {
          moveToType = activeGroup.type;
          openAssetSheet(activeAsset.id, 'move-to');
        },
      });

      actions.push({
        label: isBatch ? `Delete (${batchIds.length})` : 'Delete',
        onClick: () => openAssetSheet(activeAsset.id, 'delete-confirm'),
        danger: true,
      });

      actions.push({
        label: 'Cancel',
        onClick: () => {
          sheetAssetId = null;
          refresh();
        },
      });

      actions.forEach((action) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `irs-btn ${action.danger ? 'irs-btn--danger' : 'irs-btn--secondary'}`;
        button.textContent = action.label;
        button.addEventListener('click', action.onClick);
        sheet.appendChild(button);
      });
    }

    if (sheetView === 'rename') {
      // Rename always operates on a single asset (sheetAssetId)
      const title = document.createElement('div');
      title.className = 'irs-asset-library__sheet-title';
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
      saveButton.className = 'irs-btn irs-btn--primary';
      saveButton.textContent = 'Save';
      saveButton.addEventListener('click', () => {
        assetRegistry.renameAsset(activeAsset.id, input.value);
        sheetAssetId = null;
        clearSelection();
        refresh();
      });
      sheet.appendChild(saveButton);

      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'irs-btn irs-btn--secondary';
      cancelButton.textContent = 'Cancel';
      cancelButton.addEventListener('click', () => openAssetSheet(activeAsset.id, 'menu'));
      sheet.appendChild(cancelButton);
      queueMicrotask(() => input.focus());
    }

    if (sheetView === 'delete-confirm') {
      const title = document.createElement('div');
      title.className = 'irs-asset-library__sheet-title';
      title.textContent = isBatch ? `Delete ${batchIds.length} assets?` : 'Delete this asset?';
      sheet.appendChild(title);

      if (!isBatch) {
        const note = document.createElement('div');
        note.className = 'irs-asset-library__sheet-note';
        note.textContent = activeAsset.name;
        sheet.appendChild(note);
      }

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'irs-btn irs-btn--danger';
      deleteButton.textContent = isBatch ? `Delete ${batchIds.length} assets` : 'Delete';
      deleteButton.addEventListener('click', () => {
        uxFeedback.motion.pulse(deleteButton);
        // Delete all assets in the batch in deterministic order
        for (const id of batchIds) {
          assetRegistry.removeAsset(id);
        }
        clearSelection();
        sheetAssetId = null;
        uxFeedback.undo.show(
          isBatch ? `${batchIds.length} assets removed.` : 'Asset removed.',
          () => {},
          { destructive: true }
        );
        refresh();
      });
      sheet.appendChild(deleteButton);

      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'irs-btn irs-btn--secondary';
      cancelButton.textContent = 'Cancel';
      cancelButton.addEventListener('click', () => openAssetSheet(activeAsset.id, 'menu'));
      sheet.appendChild(cancelButton);
    }

    if (sheetView === 'move-to') {
      const title = document.createElement('div');
      title.className = 'irs-asset-library__sheet-title';
      title.textContent = isBatch ? `Move ${batchIds.length} assets\u2026` : 'Move to\u2026';
      sheet.appendChild(title);

      // Category type selector row
      const typeRow = document.createElement('div');
      typeRow.className = 'irs-asset-library__move-type-row';
      const types: AssetGroupType[] = ['tilesets', 'props', 'entities'];
      types.forEach((type) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        const isActiveType = type === moveToType;
        btn.className = `irs-btn ${isActiveType ? 'irs-btn--primary' : 'irs-btn--secondary'} irs-asset-library__move-type-btn`;
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
      groupList.className = 'irs-asset-library__move-group-list';
      const groupsOfType = assetRegistry.getGroupsByType(moveToType);
      const currentKey = groupKey(activeGroup);

      groupsOfType.forEach((grp) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'irs-btn irs-btn--secondary irs-asset-library__move-group-btn';
        const key = groupKey(grp);
        // For batch, "current" means ALL assets are already in this group (uncommon; just allow it)
        const isCurrent = !isBatch && key === currentKey;
        btn.classList.toggle('irs-asset-library__move-group-btn--current', isCurrent);
        btn.textContent = `${grp.name}${isCurrent ? ' (current)' : ''}`;
        if (!isCurrent) {
          btn.addEventListener('click', () => {
            // Move all batch assets to the target group in order
            for (const id of batchIds) {
              assetRegistry.moveAsset({
                assetId: id,
                toGroupType: grp.type,
                toGroupSlug: grp.slug,
              });
            }
            clearSelection();
            sheetAssetId = null;
            refresh();
          });
        }
        groupList.appendChild(btn);
      });
      sheet.appendChild(groupList);

      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'irs-btn irs-btn--secondary';
      cancelButton.textContent = 'Cancel';
      cancelButton.addEventListener('click', () => openAssetSheet(activeAsset.id, 'menu'));
      sheet.appendChild(cancelButton);
    }

    sheetScrim.appendChild(sheet);
  }

  function renderSubtabBar(): void {
    subtabBar.querySelectorAll<HTMLElement>('.irs-asset-subtabs__tab').forEach((btn) => {
      btn.classList.toggle('irs-asset-subtabs__tab--active', btn.dataset.subtab === activeSubtab);
    });
    // Show "+" button only on groupable tabs
    const isGroupableTab = ['tiles', 'props', 'entities'].includes(activeSubtab);
    subtabCreateBtn.style.display = isGroupableTab ? '' : 'none';
    subtabCreateBtn.setAttribute('aria-pressed', inlineGroupCreateOpen ? 'true' : 'false');
  }

  function refresh(): void {
    const state = assetRegistry.getState();
    renderSubtabBar();

    if (activeSubtab === 'tiles') {
      const groups = state.groups.filter((g) => g.type === 'tilesets');
      renderGroups(groups, state.selectedAssetId);
      renderAnimations(true);
      renderSources(true);
    } else if (activeSubtab === 'props') {
      const groups = state.groups.filter((g) => g.type === 'props');
      renderGroups(groups, state.selectedAssetId);
      renderAnimations(true);
      renderSources(true);
    } else if (activeSubtab === 'entities') {
      const groups = state.groups.filter((g) => g.type === 'entities');
      renderGroups(groups, state.selectedAssetId);
      renderAnimations(true);
      renderSources(true);
    } else if (activeSubtab === 'animations') {
      renderGroups([], state.selectedAssetId, true);
      renderAnimations();
      renderSources(true);
    } else {
      // sources
      renderGroups([], state.selectedAssetId, true);
      renderAnimations(true);
      renderSources();
    }

    renderSelectionBar();
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
  const unsubscribeUiContext = editorEventBus.on('UI_CONTEXT_CHANGED', ({ context }) => {
    if (context !== 'canvas') {
      return;
    }
    if (assetRegistry.getState().selectedAssetId === null) {
      return;
    }
    assetRegistry.setSelectedAsset(null);
  });

  // ── Virtual scroller + sortable gesture arbiter ─────────────────────────
  //
  // These must be set up after the DOM is in place (viewportEl / contentEl
  // already appended) but before the first refresh(), so that handleDragMove
  // can call virtualScroller.scrollBy() and the sortableScroller can begin
  // receiving pointer events on mount.

  const virtualScroller = createVirtualScroller({
    viewportEl,
    contentEl,
    getContentSize: () => contentEl.scrollHeight,
    getViewportSize: () => viewportEl.clientHeight,
  });

  // Clamp offset when the viewport or content resizes (e.g. new assets added,
  // tab resized, subtab switched).
  const resizeObserver = new ResizeObserver(() => {
    const maxOff = Math.max(0, contentEl.scrollHeight - viewportEl.clientHeight);
    if (virtualScroller.getOffset() > maxOff) {
      virtualScroller.setOffset(maxOff);
    }
  });
  resizeObserver.observe(viewportEl);
  resizeObserver.observe(contentEl);

  const sortableScrollerCtrl = createSortableScroller({
    viewportEl,
    scroller: virtualScroller,
    getItemEl: (target) => target.closest<HTMLElement>('.irs-asset-capsule'),
    onStateChange: (state, info) => {
      setGestureState({
        sortableState: state,
        activePointerId:
          typeof info?.pointerId === 'number' ? info.pointerId : (dragState?.pointerId ?? -1),
      });
      logGesture('sortable.state', { state, ...info });
    },
    onDebugSample: (info) => {
      if (typeof info.dx === 'number' || typeof info.dy === 'number' || typeof info.totalMoved === 'number') {
        setGestureState({
          dx: info.dx,
          dy: info.dy,
          maxMoved: info.totalMoved,
          longPressMs: 260,
          scrollThresholdPx: 8,
          dragStartSlopPx: 6,
        });
      }
      logGesture('sortable.sample', info);
    },

    onSelectionLit: (event, itemEl) => {
      logGesture('selection.lit', {
        assetId: itemEl.dataset.assetId ?? '',
        pointerId: event.pointerId,
      });
      capsuleMap.get(itemEl)?.setLit(true);
    },

    onDragStart: (event, itemEl) => {
      logGesture('onDragStart.called', {
        assetId: itemEl.dataset.assetId ?? '',
        pointerId: event.pointerId,
      });
      // Guard: if the DOM was rebuilt while the user was pressing (e.g. a
      // registry onChange fired), the old element may no longer be connected.
      if (!itemEl.isConnected) {
        logGesture('onDragStart.skipped', { reason: 'item-disconnected' });
        return;
      }

      capsuleMap.get(itemEl)?.setLit(false);
      virtualScroller.stopMomentum();

      const assetId = itemEl.dataset.assetId ?? '';
      const grid = itemEl.parentElement as HTMLElement;
      if (!assetId || !grid) {
        logGesture('onDragStart.skipped', {
          reason: !assetId ? 'missing-asset-id' : 'missing-grid',
        });
        return;
      }

      // Compute fromIndex from the current DOM position within the paintable
      // capsule list.  This index is in "paintable space" (isSource assets are
      // not rendered and therefore not present in the DOM), not in the raw
      // registry index space.  It is stored in dragState solely for the
      // no-op detection check (toIndex === fromIndex → skip reorder); the
      // actual registry update uses reorderAssetById with stable IDs instead.
      const allCapsules = Array.from(
        grid.querySelectorAll<HTMLElement>('.irs-asset-capsule'),
      );
      const fromIndex = allCapsules.indexOf(itemEl);
      if (fromIndex < 0) {
        logGesture('onDragStart.skipped', { reason: 'fromIndex-not-found', assetId });
        return;
      }

      // Resolve group from the grid's data-group-key attribute.
      const groupKeyAttr = grid.dataset.groupKey ?? '';
      const colonIdx = groupKeyAttr.indexOf(':');
      if (colonIdx < 0) {
        logGesture('onDragStart.skipped', { reason: 'missing-group-key', groupKeyAttr });
        return;
      }
      const groupType = groupKeyAttr.slice(0, colonIdx) as AssetGroupType;
      const groupSlug = groupKeyAttr.slice(colonIdx + 1);
      const registryState = assetRegistry.getState();
      const group = registryState.groups.find(
        (g) => g.type === groupType && g.slug === groupSlug,
      );
      if (!group) {
        logGesture('onDragStart.skipped', { reason: 'group-not-found', groupType, groupSlug });
        return;
      }

      // If this asset is part of a multi-selection, drag all selected together.
      const dragIds =
        selectedAssetIds.size > 1 && selectedAssetIds.has(assetId)
          ? Array.from(selectedAssetIds)
          : [assetId];
      if (dragIds.length > 1) {
        capsuleMap.get(itemEl)?.setBadge(`×${dragIds.length}`);
      }

      beginDrag({
        event,
        card: itemEl,
        grid,
        group,
        fromIndex,
        assetId,
        extraAssetIds: dragIds.length > 1 ? dragIds.filter((id) => id !== assetId) : [],
      });
    },

    onLongPressRelease: (_event, itemEl) => {
      // Long-press released without drag: enter selection mode for this asset.
      capsuleMap.get(itemEl)?.setLit(false);
      const assetId = itemEl.dataset.assetId ?? '';
      if (!assetId) return;
      selectedAssetIds.add(assetId);
      capsuleMap.get(itemEl)?.setSelected(true);
      refresh();
    },

    onTap: (event, itemEl) => {
      capsuleMap.get(itemEl)?.setLit(false);
      const assetId = itemEl.dataset.assetId ?? '';
      if (!assetId) return;
      if (selectedAssetIds.size > 0) {
        // Selection active: toggle this asset in/out of the set.
        if (selectedAssetIds.has(assetId)) {
          selectedAssetIds.delete(assetId);
          capsuleMap.get(itemEl)?.setSelected(false);
        } else {
          selectedAssetIds.add(assetId);
          capsuleMap.get(itemEl)?.setSelected(true);
        }
        if (selectedAssetIds.size === 0) clearSelection();
        refresh();
        return;
      }
      // Normal tap: select/paint via registry.
      uxFeedback.selection.mark(itemEl);
      assetRegistry.setSelectedAsset(assetId);
      editorEventBus.dispatch('UI_CONTEXT_CHANGED', { context: 'library' });
      void event; // suppress unused-param warning
    },

    onCancel: (itemEl) => {
      logGesture('sortable.cancel', {
        assetId: itemEl?.dataset.assetId ?? '',
      });
      if (itemEl) capsuleMap.get(itemEl)?.setLit(false);
    },
  });

  refresh();

  return {
    refresh,
    destroy: () => {
      unsubscribe();
      unsubscribeUiContext();
      stopRafLoop();
      animIntersectionObserver?.disconnect();
      animIntersectionObserver = null;
      animationClock.destroy();
      animationCanvases.clear();
      sourceImageCache.clear();
      sheetScrim.remove();
      animScrim.remove();
      sortableScrollerCtrl.destroy();
      virtualScroller.destroy();
      resizeObserver.disconnect();
      gestureDebug.destroy();
      viewportEl.remove(); // removes contentEl → root as well
    },
  };
}


export const AssetLibraryPlugin = {
  id: 'assets',
  label: 'Assets',
  icon: 'A',
  mount: (container: HTMLElement, context: import('@/editor/core/tabRegistry').EditorPluginContext) => {
    if (!context.assetLibraryEnabled || !context.assetRegistry) {
      container.appendChild(createEmptyState({
        icon: '🗂️',
        title: 'No Asset Library Available',
        description: 'Enable the asset library and load an editable project to browse assets.',
        ctaText: 'Open Sprites',
        onCtaClick: () => context.openTab('sprites'),
      }));
      return {};
    }

    return createAssetLibraryTab({
      container,
      assetRegistry: context.assetRegistry,
      uploadEnabled: context.assetUploadEnabled,
      getCurrentScene: context.getCurrentScene,
      entityManager: context.entityManager,
      onOpenAnimation: (animationId) => context.openAnimation?.(animationId),
    });
  },
} satisfies import('@/editor/core/tabRegistry').BerryTabPlugin;
