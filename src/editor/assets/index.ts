export { computeNonEmptyTileMask, sliceImage, sliceImageRegions } from './spriteSlider';
export type { SliceResult } from './spriteSlider';
export { rehydrateSpriteAtlasesIntoAssetRegistry } from './spriteAtlasRehydrate';
export { createAssetRegistry, DEFAULT_ASSET_REGISTRY_STATE } from './assetRegistry';
export type {
  AssetEntry,
  AssetEntryInput,
  AssetEntryType,
  AssetEntrySource,
  AnimationAsset,
  AnimationAssetInput,
  AnimationFrameRef,
  AnimationLoopMode,
  AssetRegistry,
  AssetRegistryState,
} from './assetRegistry';
export type { AssetGroup, AssetGroupType } from './assetGroup';
export { makeGroupKey, parseGroupKey } from './groupKey';

export { collectAnimationReferences } from './animationRefs';
export type { AnimationReferenceHit } from './animationRefs';
