import type { Scene } from '@/types';
import type { UnifiedLoader } from '@/runtime/loader';
import type { ProjectRuntime } from '@/runtime/projectLoader';

const LOG_PREFIX = '[Runtime/SceneLoader]';

export interface SceneRuntime {
  scene: Scene;
  id: string;
  widthPx: number;
  heightPx: number;
}

export interface SceneLoaderConfig {
  loader: UnifiedLoader;
  projectRuntime: ProjectRuntime;
}

export async function loadScene(
  config: SceneLoaderConfig,
  sceneId: string
): Promise<SceneRuntime> {
  const { loader } = config;

  const scene = await loader.loadScene(sceneId);
  console.log(`${LOG_PREFIX} Loaded scene: ${scene.name}`);

  return {
    scene,
    id: sceneId,
    widthPx: scene.width * scene.tileSize,
    heightPx: scene.height * scene.tileSize,
  };
}
