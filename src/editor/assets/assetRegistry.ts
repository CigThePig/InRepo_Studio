/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: In-editor asset registry for Editor V2 grouping and palettes.
 *
 * Defines:
 * - AssetRegistryState — persisted asset registry state (type: schema)
 * - AssetEntry — asset metadata stored in groups (type: schema); includes isSource flag
 * - AnimationAsset — animation metadata stored in registry (type: schema)
 * - AnimationFrameRef — frame references for animation assets (type: schema)
 * - AnimationLoopMode — supported loop modes for animations (type: lookup)
 * - AssetEntrySource — origin of the asset (type: lookup)
 *
 * Canonical key set:
 * - Keys come from: this file
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (updates propagate to UI immediately)
 */

import type { RepoAssetManifest } from '@/storage/cold';
import { GAME_ROOT } from '@/shared/paths';
import type {
  AssetUploadResult,
  AssetUploadProgress,
  AssetUploadItem,
  AssetUploadGroup,
} from '@/deploy/assetUpload';
import {
  DEFAULT_ASSET_GROUPS,
  createAssetGroup,
  createGroupSlug,
  normalizeGroupName,
  type AssetGroup,
  type AssetGroupType,
} from './assetGroup';
import type {
  AnimState,
  AnimTransition,
} from '@/types/animStateMachine';

export type AssetEntryType = 'tile' | 'sprite' | 'entity';
export type AssetEntrySource = 'local' | 'repo';
export type AnimationLoopMode = 'loop' | 'once' | 'pingpong';
export type Facing4 = 'down' | 'up' | 'left' | 'right';

export interface AnimationFrameRef {
  sourceAssetId: string;
  rect: { x: number; y: number; w: number; h: number };
  offset?: { x: number; y: number };
  durationMs?: number;
}

export interface AnimationAsset {
  id: string;
  name: string;
  frames: AnimationFrameRef[];
  fps: number;
  loopMode: AnimationLoopMode;
  pivot: { x: number; y: number };
  posterDataUrl?: string;
  createdAt: number;
}

export interface AnimationSetAsset {
  id: string;
  name: string;
  /**
   * Direction map intentionally uses Partial so existing sets remain valid if
   * facing options expand in future tracks.
   */
  directions: Partial<Record<Facing4, string>>;
  createdAt: number;
}

export interface AssetEntry {
  id: string;
  name: string;
  type: AssetEntryType;
  source: AssetEntrySource;
  dataUrl: string;
  width: number;
  height: number;
  createdAt: number;
  /** If this asset is a slice of a spritesheet, references the parent asset */
  sourceAssetId?: string;
  /** Region within the parent spritesheet (used when sourceAssetId is set) */
  rect?: { x: number; y: number; w: number; h: number };
  /** True for full spritesheets / raw imports that are not directly paintable */
  isSource?: boolean;
}

export interface AssetRegistryState {
  groups: AssetGroup[];
  selectedAssetId: string | null;
  animations: AnimationAsset[];
  animationSets: AnimationSetAsset[];
  animStateMachines: AnimStateMachineAsset[];
}

export interface AssetEntryInput {
  name: string;
  type: AssetEntryType;
  source?: AssetEntrySource;
  dataUrl: string;
  width: number;
  height: number;
  /** If this asset is a slice of a spritesheet, references the parent asset */
  sourceAssetId?: string;
  /** Region within the parent spritesheet (used when sourceAssetId is set) */
  rect?: { x: number; y: number; w: number; h: number };
  /** True for full spritesheets / raw imports that are not directly paintable */
  isSource?: boolean;
}

export interface AnimationAssetInput {
  name: string;
  frames: AnimationFrameRef[];
  fps: number;
  loopMode: AnimationLoopMode;
  pivot: { x: number; y: number };
  posterDataUrl?: string;
}

export interface AnimationSetAssetInput {
  name: string;
  directions: Partial<Record<Facing4, string>>;
}

export interface AnimStateMachineAsset {
  id: string;
  name: string;
  initialStateId: string;
  states: AnimState[];
  transitions: AnimTransition[];
  createdAt: number;
}

export interface AnimStateMachineAssetInput {
  name: string;
  initialStateId: string;
  states: AnimState[];
  transitions: AnimTransition[];
}

export interface AssetRegistry {
  getState(): AssetRegistryState;
  getGroups(): AssetGroup[];
  getGroupsByType(type: AssetGroupType): AssetGroup[];
  createGroup(type: AssetGroupType, name: string): AssetGroup;
  /**
   * Ensure a group with the exact slug exists. Creates it if missing.
   * Used by rehydrate to materialise groups referenced by slice category overrides
   * that may not correspond to any repo folder.
   */
  ensureGroup(type: AssetGroupType, slug: string, name?: string): AssetGroup;
  deleteGroup(type: AssetGroupType, slug: string): void;
  renameGroup(type: AssetGroupType, slug: string, newName: string): void;
  setGroupGridHint(type: AssetGroupType, slug: string, gridHint: { cols: number } | undefined): void;
  addAssets(options: {
    groupType: AssetGroupType;
    groupName: string;
    assets: AssetEntryInput[];
  }): AssetEntry[];
  renameAsset(assetId: string, nextName: string): void;
  reorderAsset(options: {
    groupType: AssetGroupType;
    groupSlug: string;
    fromIndex: number;
    toIndex: number;
  }): void;
  /**
   * Reorder an asset within its group using stable asset IDs instead of
   * array indices.  The moved asset is placed immediately before `beforeId`,
   * or appended to the end of the group when `beforeId` is null.
   *
   * Prefer this over `reorderAsset` when the UI renders a filtered subset of
   * the group (e.g. paintable assets only), because DOM-derived indices for the
   * filtered list do not align with indices in the full `group.assets` array.
   */
  reorderAssetById(options: {
    groupType: AssetGroupType;
    groupSlug: string;
    movedId: string;
    beforeId: string | null;
  }): void;
  /**
   * Move an asset from its current group to a different group (possibly a
   * different category type). Creates the destination group if it doesn't exist.
   */
  moveAsset(options: {
    assetId: string;
    toGroupType: AssetGroupType;
    toGroupSlug: string;
    toIndex?: number;
  }): void;
  removeAsset(assetId: string): void;
  getAsset(assetId: string): AssetEntry | null;
  getSelectedAsset(): AssetEntry | null;
  setSelectedAsset(assetId: string | null): void;
  getAnimations(): AnimationAsset[];
  getAnimation(animationId: string): AnimationAsset | null;
  addAnimation(input: AnimationAssetInput): AnimationAsset;
  updateAnimation(animationId: string, updates: Partial<AnimationAssetInput>): AnimationAsset | null;
  duplicateAnimation(animationId: string): AnimationAsset | null;
  removeAnimation(animationId: string): void;
  onAnimationsChanged(callback: () => void): () => void;
  getAnimationSets(): AnimationSetAsset[];
  getAnimationSet(animationSetId: string): AnimationSetAsset | null;
  addAnimationSet(input: AnimationSetAssetInput): AnimationSetAsset;
  updateAnimationSet(
    animationSetId: string,
    updates: Partial<AnimationSetAssetInput>
  ): AnimationSetAsset | null;
  removeAnimationSet(animationSetId: string): void;
  clearAnimationFromSets(animationId: string): void;
  onAnimationSetsChanged(callback: () => void): () => void;
  getAnimStateMachines(): AnimStateMachineAsset[];
  getAnimStateMachine(stateMachineId: string): AnimStateMachineAsset | null;
  addAnimStateMachine(input: AnimStateMachineAssetInput): AnimStateMachineAsset;
  updateAnimStateMachine(
    stateMachineId: string,
    updates: Partial<AnimStateMachineAssetInput>
  ): AnimStateMachineAsset | null;
  removeAnimStateMachine(stateMachineId: string): void;
  clearAnimationFromStateMachines(animationId: string): void;
  onAnimStateMachinesChanged(callback: () => void): () => void;
  refreshFromRepo(manifest: RepoAssetManifest): void;
  uploadGroup(options: {
    groupType: AssetGroupType;
    groupSlug: string;
    onProgress?: (progress: AssetUploadProgress) => void;
  }): Promise<AssetUploadResult>;
  onChange(callback: (state: AssetRegistryState) => void): () => void;
}

export const DEFAULT_ASSET_REGISTRY_STATE: AssetRegistryState = {
  groups: DEFAULT_ASSET_GROUPS,
  selectedAssetId: null,
  animations: [],
  animationSets: [],
  animStateMachines: [],
};

export type AssetGroupUploadHandler = (options: {
  group: AssetUploadGroup;
  assets: AssetUploadItem[];
  onProgress?: (progress: AssetUploadProgress) => void;
}) => Promise<AssetUploadResult>;

export interface AssetRegistryOptions {
  initialState?: Partial<AssetRegistryState>;
  uploadHandler?: AssetGroupUploadHandler;
}

function cloneGroup(group: AssetGroup): AssetGroup {
  return {
    type: group.type,
    name: group.name,
    slug: group.slug,
    assets: group.assets.map((asset) => ({
      ...asset,
      rect: asset.rect ? { ...asset.rect } : undefined,
    })),
    gridHint: group.gridHint ? { ...group.gridHint } : undefined,
  };
}

function cloneAnimation(animation: AnimationAsset): AnimationAsset {
  return {
    ...animation,
    pivot: { ...animation.pivot },
    frames: animation.frames.map((frame) => ({
      sourceAssetId: frame.sourceAssetId,
      rect: { ...frame.rect },
      offset: frame.offset ? { ...frame.offset } : undefined,
      durationMs: frame.durationMs,
    })),
  };
}

function cloneAnimationSet(animationSet: AnimationSetAsset): AnimationSetAsset {
  return {
    ...animationSet,
    directions: { ...animationSet.directions },
  };
}

function cloneAnimStateMachine(sm: AnimStateMachineAsset): AnimStateMachineAsset {
  return {
    ...sm,
    states: sm.states.map((state) => ({
      ...state,
      position: { ...state.position },
    })),
    transitions: sm.transitions.map((transition) => ({
      ...transition,
      condition: { ...transition.condition },
    })),
  };
}

function applySourceHeuristic(asset: AssetEntry): AssetEntry {
  if (asset.isSource != null) return asset; // already classified
  if (asset.sourceAssetId != null) return asset; // slices are never sources
  if (asset.type !== 'tile') return asset; // only tile-type can be a source spritesheet
  return { ...asset, isSource: true };
}

function normalizeGroups(groups: AssetGroup[]): AssetGroup[] {
  return groups.map((group) => {
    const normalizedName = normalizeGroupName(group.name);
    return {
      type: group.type,
      name: normalizedName,
      slug: group.slug ? createGroupSlug(group.slug) : createGroupSlug(normalizedName),
      assets: (group.assets ?? []).map((asset) => {
        const normalized: AssetEntry = {
          ...asset,
          dataUrl:
            asset.source === 'repo'
              ? normalizeRepoAssetPath(asset.dataUrl)
              : asset.dataUrl,
          source: asset.source ?? 'local',
        };
        return applySourceHeuristic(normalized);
      }),
      gridHint: group.gridHint ? { ...group.gridHint } : undefined,
    };
  });
}

function normalizeRepoAssetPath(value: string): string {
  if (/^(data:|https?:)/i.test(value)) {
    const marker = `/${GAME_ROOT}/`;
    const index = value.indexOf(marker);
    if (index >= 0) {
      return value.slice(index + marker.length);
    }
    return value;
  }
  return value;
}

function buildDefaultGroups(): AssetGroup[] {
  return DEFAULT_ASSET_GROUPS.map((group) => cloneGroup(group));
}

function ensureDefaultGroups(groups: AssetGroup[]): AssetGroup[] {
  const next = normalizeGroups(groups);
  const defaults = buildDefaultGroups();
  defaults.forEach((fallback) => {
    const exists = next.some(
      (group) => group.type === fallback.type && group.slug === fallback.slug
    );
    if (!exists) {
      next.push(fallback);
    }
  });
  return next;
}

function generateAssetId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `asset-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function generateAnimationId(): string {
  return generateAssetId();
}

function generateAnimationSetId(): string {
  return generateAssetId();
}

function generateStateMachineId(): string {
  return generateAssetId();
}

function buildRepoAssetId(type: AssetGroupType, slug: string, fileName: string): string {
  return `repo:${type}:${slug}:${fileName}`;
}

export function makeUniqueAnimationName(baseName: string, existingNames: Iterable<string>): string {
  const normalized = baseName.trim() || 'Animation';
  const used = new Set(Array.from(existingNames, (name) => name.trim().toLowerCase()));
  if (!used.has(normalized.toLowerCase())) {
    return normalized;
  }

  const copyBase = `${normalized} (copy)`;
  if (!used.has(copyBase.toLowerCase())) {
    return copyBase;
  }

  let index = 2;
  while (used.has(`${normalized} (copy ${index})`.toLowerCase())) {
    index += 1;
  }
  return `${normalized} (copy ${index})`;
}

export function makeUniqueAnimationSetName(baseName: string, existingNames: Iterable<string>): string {
  const normalized = baseName.trim() || 'Animation Set';
  const used = new Set(Array.from(existingNames, (name) => name.trim().toLowerCase()));
  if (!used.has(normalized.toLowerCase())) {
    return normalized;
  }

  const copyBase = `${normalized} (copy)`;
  if (!used.has(copyBase.toLowerCase())) {
    return copyBase;
  }

  let index = 2;
  while (used.has(`${normalized} (copy ${index})`.toLowerCase())) {
    index += 1;
  }
  return `${normalized} (copy ${index})`;
}

export function makeUniqueStateMachineName(baseName: string, existingNames: Iterable<string>): string {
  const normalized = baseName.trim() || 'State Machine';
  const used = new Set(Array.from(existingNames, (name) => name.trim().toLowerCase()));
  if (!used.has(normalized.toLowerCase())) {
    return normalized;
  }

  const copyBase = `${normalized} (copy)`;
  if (!used.has(copyBase.toLowerCase())) {
    return copyBase;
  }

  let index = 2;
  while (used.has(`${normalized} (copy ${index})`.toLowerCase())) {
    index += 1;
  }
  return `${normalized} (copy ${index})`;
}

function getUniqueSlug(groups: AssetGroup[], type: AssetGroupType, name: string): string {
  const base = createGroupSlug(name);
  let slug = base;
  let index = 2;
  while (groups.some((group) => group.type === type && group.slug === slug)) {
    slug = `${base}-${index}`;
    index += 1;
  }
  return slug;
}

function isImageFile(fileName: string): boolean {
  return /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(fileName);
}

function buildRepoAssets(manifest: RepoAssetManifest, group: RepoAssetManifest['groups'][number]): AssetEntry[] {
  return group.files.filter(isImageFile).map((file) => {
    const normalizedPath = group.path.replace(/^game\//, '');
    const assetPath = `${normalizedPath}/${file}`;
    const name = file.replace(/\.[^/.]+$/, '');
    return {
      id: buildRepoAssetId(group.type, group.slug, file),
      name,
      type: group.type === 'entities' ? 'entity' : group.type === 'props' ? 'sprite' : 'tile',
      source: 'repo',
      dataUrl: assetPath,
      width: 0,
      height: 0,
      createdAt: manifest.scannedAt,
    };
  });
}

function syncSelectedAssetId(groups: AssetGroup[], selectedAssetId: string | null): string | null {
  if (!selectedAssetId) return null;
  const exists = groups.some((group) => group.assets.some((asset) => asset.id === selectedAssetId));
  return exists ? selectedAssetId : null;
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0
    || toIndex < 0
    || fromIndex >= items.length
    || toIndex >= items.length
    || fromIndex === toIndex
  ) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function createAssetRegistry(options?: AssetRegistryOptions): AssetRegistry {
  const initialState = options?.initialState;
  const uploadHandler = options?.uploadHandler;
  let state: AssetRegistryState = {
    ...DEFAULT_ASSET_REGISTRY_STATE,
    ...initialState,
    groups: ensureDefaultGroups(initialState?.groups ?? DEFAULT_ASSET_REGISTRY_STATE.groups),
    animations: initialState?.animations?.map((animation) => cloneAnimation(animation)) ?? [],
    animationSets: initialState?.animationSets?.map((set) => cloneAnimationSet(set)) ?? [],
    animStateMachines: initialState?.animStateMachines?.map((sm) => cloneAnimStateMachine(sm)) ?? [],
  };

  const listeners = new Set<(state: AssetRegistryState) => void>();
  const animationListeners = new Set<() => void>();
  const animationSetListeners = new Set<() => void>();
  const stateMachineListeners = new Set<() => void>();

  function emit(next: AssetRegistryState): void {
    state = next;
    listeners.forEach((listener) => listener(state));
  }

  function updateGroups(nextGroups: AssetGroup[]): void {
    emit({
      ...state,
      groups: nextGroups,
    });
  }

  function updateAnimations(nextAnimations: AnimationAsset[]): void {
    emit({
      ...state,
      animations: nextAnimations,
    });
    animationListeners.forEach((listener) => listener());
  }

  function updateAnimationSets(nextAnimationSets: AnimationSetAsset[]): void {
    emit({
      ...state,
      animationSets: nextAnimationSets,
    });
    animationSetListeners.forEach((listener) => listener());
  }

  function updateAnimStateMachines(nextStateMachines: AnimStateMachineAsset[]): void {
    emit({
      ...state,
      animStateMachines: nextStateMachines,
    });
    stateMachineListeners.forEach((listener) => listener());
  }

  function findGroupIndex(type: AssetGroupType, slug: string): number {
    return state.groups.findIndex(
      (group) => group.type === type && group.slug === slug
    );
  }

  function createGroup(type: AssetGroupType, name: string): AssetGroup {
    const normalizedName = normalizeGroupName(name);
    const slug = getUniqueSlug(state.groups, type, normalizedName);
    const group: AssetGroup = {
      ...createAssetGroup(type, normalizedName),
      slug,
    };

    updateGroups([...state.groups, group]);
    return group;
  }

  function ensureGroup(type: AssetGroupType, slug: string, name?: string): AssetGroup {
    const existing = state.groups.find(
      (group) => group.type === type && group.slug === slug
    );
    if (existing) return cloneGroup(existing);

    const displayName = name ?? normalizeGroupName(slug);
    const group: AssetGroup = {
      type,
      name: displayName,
      slug,
      assets: [],
    };
    updateGroups([...state.groups, group]);
    return cloneGroup(group);
  }

  function moveAsset(options: {
    assetId: string;
    toGroupType: AssetGroupType;
    toGroupSlug: string;
    toIndex?: number;
  }): void {
    const { assetId, toGroupType, toGroupSlug } = options;

    // Find the asset and its current group
    let asset: AssetEntry | null = null;
    let sourceGroupIndex = -1;
    let sourceAssetIndex = -1;

    for (let gi = 0; gi < state.groups.length; gi++) {
      const group = state.groups[gi];
      const ai = group.assets.findIndex((a) => a.id === assetId);
      if (ai >= 0) {
        asset = group.assets[ai];
        sourceGroupIndex = gi;
        sourceAssetIndex = ai;
        break;
      }
    }

    if (!asset || sourceGroupIndex < 0) return;

    // Ensure destination group exists
    let destGroupIndex = state.groups.findIndex(
      (g) => g.type === toGroupType && g.slug === toGroupSlug
    );
    const groups = state.groups.map((g) => cloneGroup(g));

    if (destGroupIndex < 0) {
      const newGroup: AssetGroup = {
        type: toGroupType,
        name: normalizeGroupName(toGroupSlug),
        slug: toGroupSlug,
        assets: [],
      };
      groups.push(newGroup);
      destGroupIndex = groups.length - 1;
    }

    // Update asset type to match destination group
    const typeMap: Record<AssetGroupType, AssetEntryType> = {
      tilesets: 'tile',
      props: 'sprite',
      entities: 'entity',
      sources: 'tile',
    };
    const movedAsset: AssetEntry = {
      ...asset,
      type: typeMap[toGroupType],
    };

    // Remove from source group
    // Recalculate sourceGroupIndex in the cloned array (same position)
    groups[sourceGroupIndex] = {
      ...groups[sourceGroupIndex],
      assets: groups[sourceGroupIndex].assets.filter((_, i) => i !== sourceAssetIndex),
    };

    // Insert into destination group
    const destAssets = [...groups[destGroupIndex].assets];
    const insertIndex = options.toIndex !== undefined
      ? Math.min(Math.max(0, options.toIndex), destAssets.length)
      : destAssets.length;
    destAssets.splice(insertIndex, 0, movedAsset);
    groups[destGroupIndex] = {
      ...groups[destGroupIndex],
      assets: destAssets,
    };

    emit({
      ...state,
      groups,
      selectedAssetId: state.selectedAssetId,
    });
  }

  function deleteGroup(type: AssetGroupType, slug: string): void {
    if (slug === 'ungrouped') return; // ungrouped is the fallback; never delete it

    const targetGroup = state.groups.find((g) => g.type === type && g.slug === slug);
    if (!targetGroup) return;

    // Move assets to the ungrouped group for this type
    const orphanedAssets = targetGroup.assets;
    let nextGroups = state.groups.map((group) => {
      if (group.type === type && group.slug === slug) return null; // will be filtered
      if (group.type === type && group.slug === 'ungrouped' && orphanedAssets.length > 0) {
        return { ...group, assets: [...group.assets, ...orphanedAssets] };
      }
      return group;
    }).filter((g): g is AssetGroup => g !== null);

    // If ungrouped didn't exist yet, create it with the orphaned assets
    const ungroupedExists = nextGroups.some((g) => g.type === type && g.slug === 'ungrouped');
    if (!ungroupedExists && orphanedAssets.length > 0) {
      nextGroups = [
        ...nextGroups,
        { type, name: 'Ungrouped', slug: 'ungrouped', assets: orphanedAssets },
      ];
    }

    const nextSelectedAssetId = state.selectedAssetId
      && !nextGroups.some((g) => g.assets.some((a) => a.id === state.selectedAssetId))
      ? null
      : state.selectedAssetId;

    emit({ ...state, groups: nextGroups, selectedAssetId: nextSelectedAssetId });
  }

  function renameGroup(type: AssetGroupType, slug: string, newName: string): void {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const nextGroups = state.groups.map((group) => {
      if (group.type !== type || group.slug !== slug) return group;
      return { ...group, name: trimmed };
    });
    updateGroups(nextGroups);
  }

  function setGroupGridHint(type: AssetGroupType, slug: string, gridHint: { cols: number } | undefined): void {
    const nextGroups = state.groups.map((group) => {
      if (group.type !== type || group.slug !== slug) return group;
      return { ...group, gridHint: gridHint ? { ...gridHint } : undefined };
    });
    updateGroups(nextGroups);
  }

  function addAssets(options: {
    groupType: AssetGroupType;
    groupName: string;
    assets: AssetEntryInput[];
  }): AssetEntry[] {
    const normalizedName = normalizeGroupName(options.groupName);
    const groupSlug = createGroupSlug(normalizedName);
    let groupIndex = findGroupIndex(options.groupType, groupSlug);
    let groups = state.groups.map((group) => cloneGroup(group));

    if (groupIndex === -1) {
      const slug = getUniqueSlug(state.groups, options.groupType, normalizedName);
      const newGroup: AssetGroup = {
        ...createAssetGroup(options.groupType, normalizedName),
        slug,
      };
      groups = [...groups, newGroup];
      groupIndex = groups.length - 1;
    }

    const createdAssets: AssetEntry[] = options.assets.map((asset) => ({
      ...asset,
      id: generateAssetId(),
      createdAt: Date.now(),
      source: asset.source ?? 'local',
      sourceAssetId: asset.sourceAssetId,
      rect: asset.rect ? { ...asset.rect } : undefined,
      isSource: asset.isSource,
    }));

    const updatedGroup: AssetGroup = {
      ...groups[groupIndex],
      assets: [...groups[groupIndex].assets, ...createdAssets],
    };

    const nextGroups = groups.map((group, index) =>
      index === groupIndex ? updatedGroup : group
    );

    emit({
      ...state,
      groups: nextGroups,
      selectedAssetId: createdAssets[0]?.id ?? state.selectedAssetId,
    });

    return createdAssets;
  }

  function getAnimations(): AnimationAsset[] {
    return state.animations.map((animation) => cloneAnimation(animation));
  }

  function getAnimation(animationId: string): AnimationAsset | null {
    const found = state.animations.find((animation) => animation.id === animationId);
    return found ? cloneAnimation(found) : null;
  }

  function addAnimation(input: AnimationAssetInput): AnimationAsset {
    const uniqueName = makeUniqueAnimationName(
      input.name,
      state.animations.map((animation) => animation.name)
    );
    const animation: AnimationAsset = {
      id: generateAnimationId(),
      name: uniqueName,
      frames: input.frames.map((frame) => ({
        sourceAssetId: frame.sourceAssetId,
        rect: { ...frame.rect },
        offset: frame.offset ? { ...frame.offset } : undefined,
        durationMs: frame.durationMs,
      })),
      fps: input.fps,
      loopMode: input.loopMode,
      pivot: { ...input.pivot },
      posterDataUrl: input.posterDataUrl,
      createdAt: Date.now(),
    };

    updateAnimations([...state.animations, animation]);
    return cloneAnimation(animation);
  }

  function updateAnimation(
    animationId: string,
    updates: Partial<AnimationAssetInput>
  ): AnimationAsset | null {
    const index = state.animations.findIndex((animation) => animation.id === animationId);
    if (index === -1) return null;

    const current = state.animations[index];
    const uniqueName = updates.name
      ? makeUniqueAnimationName(
        updates.name,
        state.animations
          .filter((animation) => animation.id !== animationId)
          .map((animation) => animation.name)
      )
      : current.name;
    const next: AnimationAsset = {
      ...current,
      name: uniqueName,
      frames: updates.frames
        ? updates.frames.map((frame) => ({
          sourceAssetId: frame.sourceAssetId,
          rect: { ...frame.rect },
          offset: frame.offset ? { ...frame.offset } : undefined,
          durationMs: frame.durationMs,
        }))
        : current.frames.map((frame) => ({
          sourceAssetId: frame.sourceAssetId,
          rect: { ...frame.rect },
          offset: frame.offset ? { ...frame.offset } : undefined,
          durationMs: frame.durationMs,
        })),
      fps: updates.fps ?? current.fps,
      loopMode: updates.loopMode ?? current.loopMode,
      pivot: updates.pivot ? { ...updates.pivot } : { ...current.pivot },
      posterDataUrl: updates.posterDataUrl ?? current.posterDataUrl,
    };

    const nextAnimations = state.animations.map((animation, idx) =>
      idx === index ? next : animation
    );
    updateAnimations(nextAnimations);
    return cloneAnimation(next);
  }

  function duplicateAnimation(animationId: string): AnimationAsset | null {
    const source = state.animations.find((animation) => animation.id === animationId);
    if (!source) return null;

    const copy: AnimationAsset = {
      ...cloneAnimation(source),
      id: generateAnimationId(),
      name: makeUniqueAnimationName(
        source.name,
        state.animations.map((animation) => animation.name)
      ),
      createdAt: Date.now(),
    };
    updateAnimations([...state.animations, copy]);
    return cloneAnimation(copy);
  }

  function removeAnimation(animationId: string): void {
    const nextAnimations = state.animations.filter((animation) => animation.id !== animationId);
    if (nextAnimations.length === state.animations.length) return;
    updateAnimations(nextAnimations);
  }

  function getAnimationSets(): AnimationSetAsset[] {
    return state.animationSets.map((set) => cloneAnimationSet(set));
  }

  function getAnimationSet(animationSetId: string): AnimationSetAsset | null {
    const found = state.animationSets.find((set) => set.id === animationSetId);
    return found ? cloneAnimationSet(found) : null;
  }

  function addAnimationSet(input: AnimationSetAssetInput): AnimationSetAsset {
    const uniqueName = makeUniqueAnimationSetName(
      input.name,
      state.animationSets.map((set) => set.name)
    );

    const animationSet: AnimationSetAsset = {
      id: generateAnimationSetId(),
      name: uniqueName,
      directions: { ...input.directions },
      createdAt: Date.now(),
    };

    updateAnimationSets([...state.animationSets, animationSet]);
    return cloneAnimationSet(animationSet);
  }

  function updateAnimationSet(
    animationSetId: string,
    updates: Partial<AnimationSetAssetInput>
  ): AnimationSetAsset | null {
    const index = state.animationSets.findIndex((set) => set.id === animationSetId);
    if (index === -1) return null;

    const current = state.animationSets[index];
    const uniqueName = updates.name
      ? makeUniqueAnimationSetName(
        updates.name,
        state.animationSets
          .filter((set) => set.id !== animationSetId)
          .map((set) => set.name)
      )
      : current.name;

    const next: AnimationSetAsset = {
      ...current,
      name: uniqueName,
      directions: updates.directions ? { ...updates.directions } : { ...current.directions },
    };

    const nextAnimationSets = state.animationSets.map((set, idx) =>
      idx === index ? next : set
    );
    updateAnimationSets(nextAnimationSets);
    return cloneAnimationSet(next);
  }

  function clearAnimationFromSets(animationId: string): void {
    let changed = false;
    const nextAnimationSets = state.animationSets.map((set) => {
      const nextDirections: Partial<Record<Facing4, string>> = { ...set.directions };
      (Object.keys(nextDirections) as Facing4[]).forEach((facing) => {
        if (nextDirections[facing] === animationId) {
          delete nextDirections[facing];
          changed = true;
        }
      });
      return changed ? { ...set, directions: nextDirections } : set;
    });

    if (!changed) return;
    updateAnimationSets(nextAnimationSets);
  }

  function removeAnimationSet(animationSetId: string): void {
    const nextAnimationSets = state.animationSets.filter((set) => set.id !== animationSetId);
    if (nextAnimationSets.length === state.animationSets.length) return;
    updateAnimationSets(nextAnimationSets);
  }

  function getAnimStateMachines(): AnimStateMachineAsset[] {
    return state.animStateMachines.map((sm) => cloneAnimStateMachine(sm));
  }

  function getAnimStateMachine(stateMachineId: string): AnimStateMachineAsset | null {
    const found = state.animStateMachines.find((sm) => sm.id === stateMachineId);
    return found ? cloneAnimStateMachine(found) : null;
  }

  function addAnimStateMachine(input: AnimStateMachineAssetInput): AnimStateMachineAsset {
    const uniqueName = makeUniqueStateMachineName(
      input.name,
      state.animStateMachines.map((sm) => sm.name)
    );

    const stateMachine: AnimStateMachineAsset = {
      id: generateStateMachineId(),
      name: uniqueName,
      initialStateId: input.initialStateId,
      states: input.states.map((s) => ({
        ...s,
        position: { ...s.position },
      })),
      transitions: input.transitions.map((t) => ({
        ...t,
        condition: { ...t.condition },
      })),
      createdAt: Date.now(),
    };

    updateAnimStateMachines([...state.animStateMachines, stateMachine]);
    return cloneAnimStateMachine(stateMachine);
  }

  function updateAnimStateMachine(
    stateMachineId: string,
    updates: Partial<AnimStateMachineAssetInput>
  ): AnimStateMachineAsset | null {
    const index = state.animStateMachines.findIndex((sm) => sm.id === stateMachineId);
    if (index === -1) return null;

    const current = state.animStateMachines[index];
    const uniqueName = updates.name
      ? makeUniqueStateMachineName(
        updates.name,
        state.animStateMachines
          .filter((sm) => sm.id !== stateMachineId)
          .map((sm) => sm.name)
      )
      : current.name;

    const next: AnimStateMachineAsset = {
      ...current,
      name: uniqueName,
      initialStateId: updates.initialStateId ?? current.initialStateId,
      states: updates.states
        ? updates.states.map((s) => ({ ...s, position: { ...s.position } }))
        : current.states.map((s) => ({ ...s, position: { ...s.position } })),
      transitions: updates.transitions
        ? updates.transitions.map((t) => ({ ...t, condition: { ...t.condition } }))
        : current.transitions.map((t) => ({ ...t, condition: { ...t.condition } })),
    };

    const nextStateMachines = state.animStateMachines.map((sm, idx) =>
      idx === index ? next : sm
    );
    updateAnimStateMachines(nextStateMachines);
    return cloneAnimStateMachine(next);
  }

  function removeAnimStateMachine(stateMachineId: string): void {
    const nextStateMachines = state.animStateMachines.filter((sm) => sm.id !== stateMachineId);
    if (nextStateMachines.length === state.animStateMachines.length) return;
    updateAnimStateMachines(nextStateMachines);
  }

  function clearAnimationFromStateMachines(animationId: string): void {
    let changed = false;
    const nextStateMachines = state.animStateMachines.map((sm) => {
      const nextStates = sm.states.map((s) => {
        if (s.animationId === animationId) {
          changed = true;
          return { ...s, animationId: '', position: { ...s.position } };
        }
        return s;
      });
      return changed ? { ...sm, states: nextStates } : sm;
    });

    if (!changed) return;
    updateAnimStateMachines(nextStateMachines);
  }

  function renameAsset(assetId: string, nextName: string): void {
    const trimmedName = nextName.trim();
    if (!trimmedName) return;

    let hasChanges = false;
    const nextGroups = state.groups.map((group) => {
      const nextAssets = group.assets.map((asset) => {
        if (asset.id !== assetId) return asset;
        if (asset.name === trimmedName) return asset;
        hasChanges = true;
        return {
          ...asset,
          name: trimmedName,
        };
      });
      return {
        ...group,
        assets: nextAssets,
      };
    });

    if (!hasChanges) return;
    updateGroups(nextGroups);
  }

  function reorderAsset(options: {
    groupType: AssetGroupType;
    groupSlug: string;
    fromIndex: number;
    toIndex: number;
  }): void {
    const groupIndex = findGroupIndex(options.groupType, options.groupSlug);
    if (groupIndex < 0) return;

    const targetGroup = state.groups[groupIndex];
    const reorderedAssets = moveItem(targetGroup.assets, options.fromIndex, options.toIndex);
    if (reorderedAssets === targetGroup.assets) return;

    const nextGroups = state.groups.map((group, index) => {
      if (index !== groupIndex) return group;
      return {
        ...group,
        assets: reorderedAssets,
      };
    });

    updateGroups(nextGroups);
  }

  function reorderAssetById(options: {
    groupType: AssetGroupType;
    groupSlug: string;
    movedId: string;
    beforeId: string | null;
  }): void {
    const { groupType, groupSlug, movedId, beforeId } = options;
    const groupIndex = findGroupIndex(groupType, groupSlug);
    if (groupIndex < 0) return;

    const assets = state.groups[groupIndex].assets;
    const movedIdx = assets.findIndex((a) => a.id === movedId);
    if (movedIdx < 0) return;

    // Remove the moved asset from its current position, then re-insert it
    // before `beforeId` (or at the end when beforeId is null).  Operating
    // directly on filtered asset arrays (rather than translating paintable-list
    // indices into full-array indices) avoids corruption when isSource entries
    // occupy slots in the underlying array that are invisible in the rendered UI.
    const moved = assets[movedIdx];
    const others = assets.filter((a) => a.id !== movedId);
    let newAssets: AssetEntry[];
    if (beforeId === null) {
      newAssets = [...others, moved];
    } else {
      const beforeIdx = others.findIndex((a) => a.id === beforeId);
      if (beforeIdx < 0) {
        newAssets = [...others, moved]; // beforeId not found; append to end
      } else {
        newAssets = [...others.slice(0, beforeIdx), moved, ...others.slice(beforeIdx)];
      }
    }

    if (newAssets.length !== assets.length) return; // sanity guard

    const nextGroups = state.groups.map((group, index) => {
      if (index !== groupIndex) return group;
      return { ...group, assets: newAssets };
    });
    updateGroups(nextGroups);
  }

  function removeAsset(assetId: string): void {
    const nextGroups = state.groups.map((group) => ({
      ...group,
      assets: group.assets.filter((asset) => asset.id !== assetId),
    }));

    const selectedAssetId = state.selectedAssetId === assetId ? null : state.selectedAssetId;
    emit({
      ...state,
      groups: nextGroups,
      selectedAssetId,
    });
  }

  function getAsset(assetId: string): AssetEntry | null {
    for (const group of state.groups) {
      const found = group.assets.find((asset) => asset.id === assetId);
      if (found) return found;
    }
    return null;
  }

  function setSelectedAsset(assetId: string | null): void {
    if (assetId && !getAsset(assetId)) {
      emit({
        ...state,
        selectedAssetId: null,
      });
      return;
    }
    emit({
      ...state,
      selectedAssetId: assetId,
    });
  }

  function refreshFromRepo(manifest: RepoAssetManifest): void {
    const repoGroups = manifest.groups.map((group) => {
      const name = normalizeGroupName(group.slug);
      const assets = buildRepoAssets(manifest, group);
      return {
        type: group.type,
        name,
        slug: group.slug,
        assets,
      } satisfies AssetGroup;
    });

    const existingGroups = state.groups.map((group) => cloneGroup(group));
    const merged: AssetGroup[] = [];
    const usedKeys = new Set<string>();

    repoGroups.forEach((repoGroup) => {
      const key = `${repoGroup.type}:${repoGroup.slug}`;
      usedKeys.add(key);
      const existing = existingGroups.find(
        (group) => group.type === repoGroup.type && group.slug === repoGroup.slug
      );
      if (!existing) {
        merged.push(repoGroup);
        return;
      }
      const localAssets = existing.assets.filter((asset) => asset.source !== 'repo');
      const combinedAssets = [...localAssets, ...repoGroup.assets];
      merged.push({
        ...existing,
        name: repoGroup.name,
        assets: combinedAssets,
      });
    });

    existingGroups.forEach((group) => {
      const key = `${group.type}:${group.slug}`;
      if (!usedKeys.has(key)) {
        merged.push(group);
      }
    });

    const nextGroups = ensureDefaultGroups(merged);
    const nextSelectedAssetId = syncSelectedAssetId(nextGroups, state.selectedAssetId);

    emit({
      ...state,
      groups: nextGroups,
      selectedAssetId: nextSelectedAssetId,
    });
  }

  function buildUploadError(group: AssetGroup, message: string): AssetUploadResult {
    // 'sources' groups are rejected before reaching here; cast is safe.
    const uploadType = group.type as import('@/deploy/assetUpload').AssetUploadGroupType;
    return {
      group: {
        type: uploadType,
        slug: group.slug,
        name: group.name,
      },
      results: [],
      error: message,
    };
  }

  async function uploadGroup(options: {
    groupType: AssetGroupType;
    groupSlug: string;
    onProgress?: (progress: AssetUploadProgress) => void;
  }): Promise<AssetUploadResult> {
    // Sources are repo-managed spritesheets; they are not uploaded via the asset registry.
    if (options.groupType === 'sources') {
      return {
        group: { type: 'tilesets', slug: options.groupSlug, name: options.groupSlug },
        results: [],
        error: 'Source spritesheet groups are managed as repo assets and cannot be uploaded directly.',
      };
    }

    // After the 'sources' guard above, groupType can safely be cast to AssetUploadGroupType.
    const uploadGroupType = options.groupType as import('@/deploy/assetUpload').AssetUploadGroupType;

    if (!uploadHandler) {
      return {
        group: {
          type: uploadGroupType,
          slug: options.groupSlug,
          name: options.groupSlug,
        },
        results: [],
        error: 'Asset upload is not available in this session.',
      };
    }

    const group = state.groups.find(
      (entry) => entry.type === options.groupType && entry.slug === options.groupSlug
    );
    if (!group) {
      return {
        group: {
          type: uploadGroupType,
          slug: options.groupSlug,
          name: options.groupSlug,
        },
        results: [],
        error: 'Asset group not found.',
      };
    }

    const localAssets = group.assets.filter((asset) => asset.source !== 'repo');
    if (localAssets.length === 0) {
      return buildUploadError(group, 'No local assets to upload.');
    }

    const result = await uploadHandler({
      group: {
        type: uploadGroupType,
        slug: group.slug,
        name: group.name,
      },
      assets: localAssets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        dataUrl: asset.dataUrl,
        width: asset.width,
        height: asset.height,
      })),
      onProgress: options.onProgress,
    });

    const updatedAssets = new Map<string, { id: string; dataUrl: string }>();
    result.results.forEach((entry) => {
      if (!entry.success) return;
      const fileName = entry.fileName;
      const newId = buildRepoAssetId(group.type, group.slug, fileName);
      const assetPath = entry.path.replace(/^game\//, '');
      updatedAssets.set(entry.assetId, {
        id: newId,
        dataUrl: assetPath,
      });
    });

    if (updatedAssets.size > 0) {
      const repoSource: AssetEntrySource = 'repo';
      const nextGroups = state.groups.map((entry) => {
        if (entry.type !== group.type || entry.slug !== group.slug) {
          return entry;
        }
        return {
          ...entry,
          assets: entry.assets.map((asset) => {
            const update = updatedAssets.get(asset.id);
            if (!update) return asset;
            return {
              ...asset,
              id: update.id,
              dataUrl: update.dataUrl,
              source: repoSource,
            };
          }),
        };
      });

      const nextSelectedAssetId = state.selectedAssetId
        ? updatedAssets.get(state.selectedAssetId)?.id ?? state.selectedAssetId
        : null;

      emit({
        ...state,
        groups: nextGroups,
        selectedAssetId: nextSelectedAssetId,
      });
    }

    return result;
  }

  return {
    getState: () => state,
    getGroups: () => state.groups.map((group) => cloneGroup(group)),
    getGroupsByType: (type) =>
      state.groups.filter((group) => group.type === type).map((group) => cloneGroup(group)),
    createGroup,
    ensureGroup,
    deleteGroup,
    renameGroup,
    setGroupGridHint,
    addAssets,
    renameAsset,
    reorderAsset,
    reorderAssetById,
    moveAsset,
    removeAsset,
    getAsset,
    getSelectedAsset: () => (state.selectedAssetId ? getAsset(state.selectedAssetId) : null),
    setSelectedAsset,
    getAnimations,
    getAnimation,
    addAnimation,
    updateAnimation,
    duplicateAnimation,
    removeAnimation,
    getAnimationSets,
    getAnimationSet,
    addAnimationSet,
    updateAnimationSet,
    removeAnimationSet,
    clearAnimationFromSets,
    refreshFromRepo,
    uploadGroup,
    onChange: (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    onAnimationsChanged: (callback) => {
      animationListeners.add(callback);
      return () => animationListeners.delete(callback);
    },
    onAnimationSetsChanged: (callback) => {
      animationSetListeners.add(callback);
      return () => animationSetListeners.delete(callback);
    },
    getAnimStateMachines,
    getAnimStateMachine,
    addAnimStateMachine,
    updateAnimStateMachine,
    removeAnimStateMachine,
    clearAnimationFromStateMachines,
    onAnimStateMachinesChanged: (callback) => {
      stateMachineListeners.add(callback);
      return () => stateMachineListeners.delete(callback);
    },
  };
}
