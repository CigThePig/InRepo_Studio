/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Canonical local workspace content and editor UI-only state.
 *
 * Defines:
 * - WorkspaceContent — local-first authoritative project content bundle (type: schema)
 * - EditorUIState — persisted editor UI state (type: schema)
 * - WorkspaceMeta — local snapshot metadata (type: schema)
 *
 * Canonical key set:
 * - WorkspaceContent fields: version, project, scenes, assetRegistry, presetConfig, scripts, meta
 * - EditorUIState fields: editor-only selection/tool/layout state (no content payloads)
 *
 * Apply/Rebuild semantics:
 * - WorkspaceContent apply mode: live (runtime/deploy pack build source)
 * - EditorUIState apply mode: live (editor restore only)
 */

import type { AssetRegistryState } from '@/editor/assets';
import type { Project, Scene, LayerType, ScriptFile, PresetSavedConfig } from '@/types';
import type { EditorMode } from '@/editor/core/editorMode';

export interface WorkspaceMeta {
  lastSnapshotAt: number;
  dirtyActionCount: number;
  lastSavedAt: number;
  refactorVersion: number;
}

export interface WorkspaceContent {
  version: number;
  project: Project;
  scenes: Record<string, Scene>;
  assetRegistry: AssetRegistryState;
  presetConfig: PresetSavedConfig | null;
  scripts: Record<string, ScriptFile>;
  meta: WorkspaceMeta;
}

export interface ViewportState {
  panX: number;
  panY: number;
  zoom: number;
}

export interface PanelStates {
  topExpanded: boolean;
  bottomExpanded: boolean;
}

export interface SelectedTile {
  category: string;
  index: number;
}

export type BrushSize = 1 | 2 | 3;
export type EditorIntent = 'place' | 'interact' | 'remove';
export type EditorDomain = 'ground' | 'props' | 'entities' | 'collision' | 'triggers';

export interface EditorPayload {
  kind: string;
  id: string;
}

export type LayerVisibility = Record<LayerType, boolean>;
export type LayerLocks = Record<LayerType, boolean>;

export interface EditorUIState {
  currentSceneId: string | null;
  currentTool: 'select' | 'paint' | 'erase' | 'entity';
  intent: EditorIntent;
  domain: EditorDomain;
  payload: EditorPayload | null;
  editorMode: EditorMode;
  rightBerryOpen: boolean;
  leftBerryOpen: boolean;
  activeLayer: LayerType;
  layerOrder: LayerType[];
  selectedTile: SelectedTile | null;
  selectedEntityType: string | null;
  selectedEntityIds: string[];
  selectedPropSpriteIds: string[];
  selectedAssetId: string | null;
  brushSize: BrushSize;
  entitySnapToGrid: boolean;
  viewport: ViewportState;
  panelStates: PanelStates;
  recentTiles: number[];
  layerVisibility: LayerVisibility;
  layerLocks: LayerLocks;
  contentVersionToken: string | null;
}
