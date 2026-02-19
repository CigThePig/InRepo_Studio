# Technical Debt — Codebase Health Tasks

> **Status**: Unstarted. These tasks were identified during the Track 23–41 build-out.
> When ready to execute, treat this as a Micro Track. Read `/AGENTS.md` first, then the local `AGENTS.md` in each folder you touch.

## Goal

Fix all outstanding code quality issues, duplicated utilities, incomplete validations, stale data files, dead code, deprecated API usage, and missing barrel exports — then verify a clean build.

---

## Tasks (execute in order)

### 1. Install missing npm dependencies

```bash
npm install
```

Verify `node_modules` is populated and no peer-dep warnings remain for the core stack (vite, typescript, eslint).

---

### 2. Fix TypeScript compilation errors (Vite types, implicit any)

- In `src/storage/migration.ts`, the `stringify` helper uses `any` twice (lines ~46, ~53). Replace with proper types (`unknown` + narrowing, or the actual expected shapes).
- Run `npx tsc --noEmit` — fix any errors that surface. The build must produce zero TS errors.

---

### 3. Fix ESLint configuration (v10 needs flat config)

The project currently ships `.eslintrc.cjs` (legacy format) with `eslint ^8.56.0` in `package.json`.

**Choose one path (prefer A if staying on v8):**

- **A) Stay on ESLint 8** — Confirm the installed version is 8.x. If `npm install` pulled v9+, pin `"eslint": "^8.56.0"` and re-install. Verify `npm run lint` passes (warnings OK, zero errors).
- **B) Upgrade to ESLint 9+ / flat config** — Only do this if v9+ is already installed. Convert `.eslintrc.cjs` → `eslint.config.js` (flat config), update the lint script, and verify.

The goal is a working `npm run lint` with no errors.

---

### 4. Scan source code for bugs and inconsistencies

Do a quick grep / read-through for:
- Unreachable code, logic errors, swallowed exceptions
- Mismatched types between function signatures and call sites
- Any TODO/FIXME/HACK comments worth addressing now

Fix anything obvious; note anything deferred.

---

### 5. Fix deprecated `.substr()` usage in scene.ts and sceneManager.ts

Two files use the deprecated `String.prototype.substr()`:

- `src/types/scene.ts` line ~442: `.toString(36).substr(2, 9)` → `.toString(36).substring(2, 11)`
- `src/editor/scenes/sceneManager.ts` line ~144: same pattern → `.toString(36).substring(2, 11)`

---

### 6. Extract duplicate `hashContent` / `parseRateLimitError` / `normalizePath` into shared utility

These three functions are copy-pasted across multiple deploy files:

| Function | Duplicated in |
|---|---|
| `hashContent(content: string): Promise<string>` | `src/deploy/commit.ts`, `src/deploy/changeDetector.ts`, `src/deploy/assetUpload.ts` |
| `parseRateLimitError(response: Response): string \| null` | `src/deploy/commit.ts`, `src/deploy/shaManager.ts`, `src/storage/cold.ts` |
| `normalizePath(path: string): string` | `src/deploy/commit.ts`, `src/deploy/shaManager.ts` |

**Action:**
1. Create `src/deploy/utils.ts` (or `src/shared/deployUtils.ts` — pick whichever fits the architecture better).
2. Move canonical implementations there and `export` them.
3. In every file that had a local copy, delete the local function and `import` from the new shared module.
4. For `parseRateLimitError` in `src/storage/cold.ts` — it crosses the deploy/storage boundary. Import from the shared location, or if that violates the module boundary, keep the storage copy and add a comment noting the intentional duplication.
5. Run `npx tsc --noEmit` to confirm no import/type breakage.

---

### 7. Fix incomplete `validateEntityType()` to validate properties

In `src/types/project.ts`, `validateEntityType` currently only checks:
```ts
typeof e.name === 'string' && Array.isArray(e.properties)
```

It should also validate:
- `e.displayName` is `string` if present (optional field)
- `e.sprite` is `string` if present (optional field)
- Every element in `e.properties` passes `validatePropertyDefinition()` (imported from `src/types/entity.ts`)

Update the function and add the import.

---

### 8. Fix scene tileset `firstGid` inconsistency in `game/scenes/main.json`

`game/scenes/main.json` currently has:
```json
{ "category": "terrain", "firstGid": 1 },
{ "category": "props", "firstGid": 100 }
```

But `src/types/scene.ts` → `computeDefaultTilesets()` uses `DEFAULT_TILESET_BLOCK_SIZE = 1000`, which would produce:
```json
{ "category": "terrain", "firstGid": 1 },
{ "category": "props", "firstGid": 1001 }
```

**Action:** Update `game/scenes/main.json` so `props.firstGid` is `1001` to match the code's block-size convention. Also scan the layer data arrays — if any tile GID values in the `props` or `objects` layers reference the old 100-based range, remap them to the 1001-based range (add 901 to each non-zero value that was in the props tileset range).

---

### 9. Add `SelectedTile` to storage barrel exports

`src/storage/hot.ts` exports `interface SelectedTile`, but it is **not** re-exported from `src/storage/index.ts`. Multiple files import it directly from `@/storage/hot` instead of the barrel.

**Action:**
1. Add `SelectedTile` to the `export type { ... } from './hot'` block in `src/storage/index.ts`.
2. Update imports in consuming files to use `@/storage` instead of `@/storage/hot`:
   - `src/editor/init.ts`
   - `src/editor/tools/selectTileController.ts`
   - `src/editor/tools/paint.ts`

---

### 10. Remove dead code (unused exports — but NOT `modeMapping.ts`)

⚠️ **DO NOT delete `src/editor/v2/modeMapping.ts`** — it is registered in `schema-registry.md` as a list-of-truth (`MODE_TO_LAYER`, `MODE_TO_TOOL`) and was deliberately pre-staged in the Editor V2 migration (Track 25). It will be consumed when Blockly Mode integration lands (Tracks 35+). No external consumer exists *yet*, but this is intentional pre-built infrastructure, not dead code.

**Action:**
1. Grep for any *other* genuinely unused exports across the codebase and clean up if trivially dead. Don't rabbit-hole — focus on obvious cases only.
2. If nothing else is found, skip this task.

---

### 11. Verify build passes after fixes

```bash
npx tsc --noEmit        # zero errors
npm run lint             # zero errors (warnings OK)
npx vite build           # successful build
```

All three must pass. If anything fails, fix it before marking done.

---

## Files touched (expected)

| File | Change |
|---|---|
| `src/deploy/utils.ts` (NEW) | Shared `hashContent`, `parseRateLimitError`, `normalizePath` |
| `src/deploy/commit.ts` | Remove local dupes, import from utils |
| `src/deploy/changeDetector.ts` | Remove local `hashContent`, import from utils |
| `src/deploy/assetUpload.ts` | Remove local `hashContent`, import from utils |
| `src/deploy/shaManager.ts` | Remove local dupes, import from utils |
| `src/storage/cold.ts` | Remove or keep `parseRateLimitError` (see task 6 note) |
| `src/types/project.ts` | Strengthen `validateEntityType` |
| `src/types/scene.ts` | `.substr()` → `.substring()` |
| `src/editor/scenes/sceneManager.ts` | `.substr()` → `.substring()` |
| `game/scenes/main.json` | Fix `firstGid` for props tileset |
| `src/storage/index.ts` | Add `SelectedTile` to barrel exports |
| `src/storage/hot.ts` | No change (already exports `SelectedTile`) |
| `src/editor/init.ts` | Update `SelectedTile` import path |
| `src/editor/tools/selectTileController.ts` | Update `SelectedTile` import path |
| `src/editor/tools/paint.ts` | Update `SelectedTile` import path |
| `src/editor/v2/modeMapping.ts` | DO NOT DELETE — pre-staged for Blockly Mode |
| `src/editor/v2/index.ts` | No change (keep modeMapping re-exports) |
| `src/storage/migration.ts` | Fix `any` types |
| `.eslintrc.cjs` or `eslint.config.js` | Ensure config matches installed ESLint version |
| `INDEX.md` | Update if file additions/deletions change the inventory |

---

## Verification checklist

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] `npx vite build` — succeeds
- [ ] `grep -rn "\.substr(" src/` — zero results
- [ ] `grep -rn "hashContent" src/deploy/commit.ts src/deploy/changeDetector.ts src/deploy/assetUpload.ts` — only import statements, no function declarations
- [ ] `grep -rn "from.*storage/hot" src/editor/` — zero results (all use barrel)
- [ ] `main.json` props firstGid is `1001`
