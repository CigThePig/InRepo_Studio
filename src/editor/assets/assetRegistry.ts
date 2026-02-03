/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: In-editor asset registry for Editor V2 grouping and palettes.
 *
 * Defines:
 * - AssetRegistryState — persisted asset registry state (type: schema)
 * - AssetEntry — asset metadata stored in groups (type: schema)
 * - AssetEntrySource — origin of the asset (type: lookup)
 *
 * Canonical key set:
 * - Keys come from: this file
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (updates propagate to UI immediately)
 */

import { resolveAssetPath, type RepoAssetManifest } from '@/storage/cold';
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

export type AssetEntryType = 'tile' | 'sprite' | 'entity';
export type AssetEntrySource = 'local' | 'repo';

export interface AssetEntry {
  id: string;
  name: string;
  type: AssetEntryType;
  source: AssetEntrySource;
  dataUrl: string;
  width: number;
  height: number;
  createdAt: number;
}

export interface AssetRegistryState {
  groups: AssetGroup[];
  selectedAssetId: string | null;
}

export interface AssetEntryInput {
  name: string;
  type: AssetEntryType;
  source?: AssetEntrySource;
  dataUrl: string;
  width: number;
  height: number;
}

export interface AssetRegistry {
  getState(): AssetRegistryState;
  getGroups(): AssetGroup[];
  getGroupsByType(type: AssetGroupType): AssetGroup[];
  createGroup(type: AssetGroupType, name: string): AssetGroup;
  deleteGroup(type: AssetGroupType, slug: string): void;
  addAssets(options: {
    groupType: AssetGroupType;
    groupName: string;
    assets: AssetEntryInput[];
  }): AssetEntry[];
  removeAsset(assetId: string): void;
  getAsset(assetId: string): AssetEntry | null;
  getSelectedAsset(): AssetEntry | null;
  setSelectedAsset(assetId: string | null): void;
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
    assets: group.assets.map((asset) => ({ ...asset })),
  };
}

function normalizeGroups(groups: AssetGroup[]): AssetGroup[] {
  return groups.map((group) => {
    const normalizedName = normalizeGroupName(group.name);
    return {
      type: group.type,
      name: normalizedName,
      slug: group.slug ? createGroupSlug(group.slug) : createGroupSlug(normalizedName),
      assets: (group.assets ?? []).map((asset) => ({
        ...asset,
        source: asset.source ?? 'local',
      })),
    };
  });
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

function buildRepoAssetId(type: AssetGroupType, slug: string, fileName: string): string {
  return `repo:${type}:${slug}:${fileName}`;
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
      dataUrl: resolveAssetPath(assetPath),
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

export function createAssetRegistry(options?: AssetRegistryOptions): AssetRegistry {
  const initialState = options?.initialState;
  const uploadHandler = options?.uploadHandler;
  let state: AssetRegistryState = {
    ...DEFAULT_ASSET_REGISTRY_STATE,
    ...initialState,
    groups: ensureDefaultGroups(initialState?.groups ?? DEFAULT_ASSET_REGISTRY_STATE.groups),
  };

  const listeners = new Set<(state: AssetRegistryState) => void>();

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

  function deleteGroup(type: AssetGroupType, slug: string): void {
    const filtered = state.groups.filter(
      (group) => !(group.type === type && group.slug === slug)
    );
    updateGroups(filtered);
    if (state.selectedAssetId) {
      const stillExists = filtered.some((group) =>
        group.assets.some((asset) => asset.id === state.selectedAssetId)
      );
      if (!stillExists) {
        emit({
          ...state,
          groups: filtered,
          selectedAssetId: null,
        });
      }
    }
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
    return {
      group: {
        type: group.type,
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
    if (!uploadHandler) {
      return {
        group: {
          type: options.groupType,
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
          type: options.groupType,
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
        type: group.type,
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
        dataUrl: resolveAssetPath(assetPath),
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
    deleteGroup,
    addAssets,
    removeAsset,
    getAsset,
    getSelectedAsset: () => (state.selectedAssetId ? getAsset(state.selectedAssetId) : null),
    setSelectedAsset,
    refreshFromRepo,
    uploadGroup,
    onChange: (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };
}
