import Phaser from 'phaser';
import { createUnifiedLoader, type DataSourceMode, type UnifiedLoader } from '@/runtime/loader';
import { initProject } from '@/runtime/projectLoader';
import { createSceneManager } from '@/runtime/sceneManager';
import { createPresetRegistry } from '@/runtime/presets/presetRegistry';
import { SceneHost } from '@/runtime/sceneHost';
import { InRepoRuntime } from '@/runtime/inrepoRuntime';
import { loadPresetConfig, savePresetConfig } from '@/storage/hot';
import {
  createDefaultPresetConfig,
  createDefaultCategoryConfig,
} from '@/types/presetDefaults';
import type { PresetCategoryId } from '@/types/preset';

const LOG_PREFIX = '[Runtime]';

export interface RuntimeConfig {
  dataSource?: DataSourceMode;
  loader?: UnifiedLoader;
  startSceneId?: string | null;
}

let activeGame: Phaser.Game | null = null;


function resolveRuntimeBackgroundColor(): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue('--irs-surface-base')
    .trim();
  return value || '#0a0a1a';
}

function prepareGameContainer(): HTMLElement {
  const app = document.getElementById('app');
  if (!app) {
    throw new Error(`${LOG_PREFIX} Missing #app container`);
  }

  app.innerHTML = '<div id="game-container" style="width: 100%; height: 100%;"></div>';
  const container = document.getElementById('game-container');
  if (!container) {
    throw new Error(`${LOG_PREFIX} Failed to create game container`);
  }
  return container;
}

function showRuntimeError(message: string): void {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div style="
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--irs-surface-base);
      color: var(--irs-text-primary);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      text-align: center;
      padding: 24px;
    ">
      <div>
        <h2 style="margin-bottom: 12px;">Runtime Error</h2>
        <p style="color: var(--irs-text-secondary);">${message}</p>
      </div>
    </div>
  `;
}

export async function initRuntime(config: RuntimeConfig = {}): Promise<void> {
  console.log(`${LOG_PREFIX} Initializing runtime...`);

  const dataSource = config.dataSource ?? 'cold';
  const loader = config.loader ?? createUnifiedLoader(dataSource);
  console.log(
    `${LOG_PREFIX} Data source: ${loader.getMode()} (${loader.getMode() === 'hot' ? 'playtest' : 'deployed'})`
  );

  if (activeGame) {
    activeGame.destroy(true);
    activeGame = null;
  }

  const container = prepareGameContainer();
  let resolveReady: (() => void) | null = null;
  const readyPromise = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  class RuntimeScene extends Phaser.Scene {
    constructor() {
      super('runtime');
    }

    create(): void {
      this.cameras.main.setRoundPixels(true);
      void this.bootstrap();
    }

    update(_time: number, delta: number): void {
      const host = InRepoRuntime.getHost(this);
      host?.update(delta);
    }

    private async bootstrap(): Promise<void> {
      try {
        const projectRuntime = await initProject({ loader, phaserScene: this });
        const sceneManager = createSceneManager({
          loader,
          projectRuntime,
          phaserScene: this,
        });

        const sceneId = config.startSceneId ?? projectRuntime.project.defaultScene;
        if (!sceneId) {
          throw new Error('No scene selected for runtime');
        }

        await sceneManager.goTo(sceneId);

        const registry = createPresetRegistry();
        let presetConfig = null;
        if (loader.getMode() === 'hot') {
          presetConfig = await loadPresetConfig();
        }

        if (!presetConfig) {
          presetConfig = createDefaultPresetConfig();

          const defaultPresetByCategory: Record<PresetCategoryId, string | null> = {
            controls: registry.getById('controls-topdown')?.definition.id
              ?? registry.getDefaultForCategory('controls'),
            movement: registry.getById('movement-topdown')?.definition.id
              ?? registry.getDefaultForCategory('movement'),
            camera: registry.getById('camera-follow')?.definition.id
              ?? registry.getDefaultForCategory('camera'),
            animation: registry.getDefaultForCategory('animation'),
            'entity-animation': registry.getDefaultForCategory('entity-animation'),
          };

          for (const [category, presetId] of Object.entries(defaultPresetByCategory)) {
            if (!presetId) continue;
            presetConfig.categories[category as PresetCategoryId] = {
              ...createDefaultCategoryConfig(presetId),
              enabled: category !== 'animation',
            };
          }

          if (loader.getMode() === 'hot') {
            await savePresetConfig(presetConfig);
          }
        }

        const host = new SceneHost({
          registry,
          presetConfig,
          sceneId,
        });
        if (!InRepoRuntime.attach(this, host)) {
          host.dispose();
        }

        console.log(`${LOG_PREFIX} Runtime initialized`);
        resolveReady?.();
      } catch (error) {
        console.error(`${LOG_PREFIX} Failed to initialize runtime:`, error);
        showRuntimeError(error instanceof Error ? error.message : 'Failed to initialize runtime');
      }
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: resolveRuntimeBackgroundColor(),
    pixelArt: true,
    antialias: false,
    antialiasGL: false,
    roundPixels: true,
    scene: [RuntimeScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      autoRound: true,
    },
  });

  activeGame = game;

  await readyPromise;
}
