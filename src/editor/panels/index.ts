/**
 * Panels Module - Public Exports
 *
 * This module provides the panel components for the InRepo Studio editor,
 * including the top panel (layers), bottom panel (tools), and tile picker.
 */

// Top Panel
export { createTopPanel } from './topPanel';
export type { TopPanelController, TopPanelState } from './topPanel';

// Top Bar V2
export { createTopBarV2 } from './topBarV2';
export type { TopBarV2Controller, TopBarV2State } from './topBarV2';

// Right Berry
export { createRightBerry, createRightBerryPlaceholder } from './rightBerry';
export type { RightBerryController, RightBerryConfig } from './rightBerry';
export { RIGHT_BERRY_TABS } from './rightBerryTabs';
export type { RightBerryTab } from './rightBerryTabs';
export { createEntitiesTab } from './entitiesTab';
export type { EntitiesTabController, EntitiesTabConfig } from './entitiesTab';
export { createBrushSizeControl } from './berryControls';
export type { BrushSizeControlController, BrushSizeControlConfig } from './berryControls';

// Left Berry
export { createLeftBerry, createLeftBerryPlaceholder } from './leftBerry';
export type { LeftBerryController, LeftBerryConfig } from './leftBerry';
export { LEFT_BERRY_TABS } from './leftBerryTabs';
export type { LeftBerryTab, LeftBerryTabId } from './leftBerryTabs';
export { createSpriteSlicerTab } from './spriteSlicerTab';
export { createAssetLibraryTab } from './assetLibraryTab';
export type { AssetLibraryTabController, AssetLibraryTabConfig } from './assetLibraryTab';
export { createAssetPalette } from './assetPalette';
export type { AssetPaletteController, AssetPaletteConfig } from './assetPalette';

// Bottom Panel
export { createBottomPanel } from './bottomPanel';
export type { BottomPanelController, BottomPanelState, ToolType, BottomPanelSection } from './bottomPanel';

// Bottom Context Strip
export { createBottomContextStrip } from './bottomContextStrip';
export type { BottomContextStripController, BottomContextSelection } from './bottomContextStrip';

// Deploy Panel
export { createDeployPanel } from './deployPanel';
export type { DeployPanelController } from './deployPanel';

// Tile Picker
export { createTilePicker } from './tilePicker';
export type { TilePickerController, TilePickerState, TileSelection } from './tilePicker';

// Layer Panel
export { createLayerPanel } from './layerPanel';
export type { LayerPanelController, LayerPanelConfig } from './layerPanel';
