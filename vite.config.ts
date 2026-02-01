import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Ensure the repository "game/" content folder is present in the production build.
 *
 * Why:
 * - Runtime cold mode fetches from `${import.meta.env.BASE_URL}game/...`
 * - Vite only copies static files from "public/" into "dist/" by default
 * - We intentionally keep "game/" as a top-level content folder (not inside "public/")
 */
function copyGameToDist() {
  return {
    name: 'copy-game-to-dist',
    apply: 'build',
    async closeBundle() {
      const src = resolve(__dirname, 'game');
      const dest = resolve(__dirname, 'dist', 'game');

      // Remove any prior copy (e.g., successive builds)
      await fs.rm(dest, { recursive: true, force: true });

      // Copy if present; warn (but don't fail) if missing (keeps minimal builds usable)
      try {
        await fs.access(src);
        await fs.cp(src, dest, { recursive: true });
      } catch (err) {
        console.warn(
          `[vite:copy-game-to-dist] Skipped copying "game/" → "dist/game" (${(err as Error)?.message ?? String(err)})`
        );
      }
    },
  };
}

export default defineConfig({
  // Base path for GitHub Pages (overridden in CI with --base=/<repo>/)
  base: './',

  plugins: [copyGameToDist()],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },

  server: {
    port: 5173,
    open: true,
  },

  // Static assets directory (optional). Keep default 'public' if/when used.
  publicDir: 'public',
});
