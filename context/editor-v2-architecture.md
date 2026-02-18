# Editor V2 Architecture Spec (InRepo Studio)

**Status:** Source of truth for Tracks 23–30  
**Audience:** Coding agents (Codex/Claude) and maintainers  
**Purpose:** Define the target UI + interaction model so staged refactors cannot drift.

If any existing implementation conflicts with this document, **this document wins**.

---

## 0. One-sentence vision

InRepo Studio is a **mobile-first level editor** where the user edits the world by choosing an **editing mode** (Ground, Props, Entities, Collision, Triggers) and the UI is organized around **intent**, not around scattered panels.

---

## 1. Core principles

### 1.1 Mode-driven editor
The editor must be driven by a single state:

`editorMode = select | ground | props | entities | collision | triggers`

This replaces any combination of "activeLayer + currentTool" as the primary mental model.

### 1.2 UI regions have strict jobs
Each UI region has one job and must not grow random controls.

- Top Bar: global actions only
- Bottom Bar: selection + contextual actions + expandable project actions
- Right Berry: world editing brain (modes and palettes)
- Left Berry: asset pipeline brain (import/slice/library)
- Floating popups: legacy (migrate away)

### 1.3 Tab equals layer equals intent
Right berry tabs define what the user is editing and where changes are written.

The user should not need a separate layers panel to do normal work.

### 1.4 No modal editing for core flows
Selecting an object should not open a modal/popup editor.

Especially for entities: selection is move-first; editing lives inside the Entities mode UI.

### 1.5 Staged migration, single authority
During migration, a legacy system may exist temporarily, but there must be one clear authority at any time.

Example: Once bottom context strip reaches parity, floating selection bars must be removed.

---

## 2. Global layout

### 2.1 Top Bar (global-only)
**Never changes based on mode.**

Contains only:
- Undo
- Redo
- Settings
- Test/Play build

Must NOT contain:
- layer controls
- tool selection
- palettes
- per-mode actions

### 2.2 Bottom Bar (interaction strip)
Bottom bar is the interaction hub for selection and quick actions.

**Bottom-left**
- Selection tool (persistent anchor)

**Bottom-right**
- Contextual action strip that changes based on what is selected:
  - Tile selection actions: copy, paste, delete, fill, cancel, etc.
  - Entity selection actions: duplicate, delete, clear, etc.
  - (Later) Trigger selection actions: edit, duplicate, delete, etc.

**Expandable section (slides up)**
- Import
- Export
- Commit to GitHub

Rule: once Track 23 completes, selection actions must not appear in floating popups.

### 2.3 Right Berry (world editing brain)
A right-side slide-out panel with tabs along the top.

Tabs (fixed order):
1. Ground (Paint)
2. Props
3. Entities
4. Collision
5. Triggers

Rules:
- Opening the right berry enters the chosen editing mode.
- Closing the right berry returns the user to Select mode (or keeps mode but disables placement, see 4.4).
- The right berry contains the palette and settings for the current mode.

### 2.4 Left Berry (asset pipeline brain)
A left-side slide-out panel for less frequent tools.

Tabs (minimum required for Tracks 27–30):
- Sprites/Slices (import sprite sheet, slice to tiles/sprites)
- Assets Library (view grouped assets)

Future tabs (not required for Track 30):
- Animations
- Prefabs
- Tileset settings
- Project tools

Left berry should not place objects into the world directly. It prepares and manages assets.

---

## 3. Data model responsibilities

### 3.1 World layers (conceptual)
The editor supports these world-editing categories:

- Ground
- Props
- Entities
- Collision
- Triggers

Implementation note:
- Entities may remain stored separately (for example, `scene.entities`) but the UI must treat them as a first-class "layer/mode".

### 3.2 Grouping model
Assets are organized into groups that map to folder names in the repo.

Example groups:
- props/trees
- entities/goblin
- tilesets/grassland

In-editor group name is the folder name. No mismatch is allowed long term.

---

## 4. Interaction model (state machine)

### 4.1 Primary state
The editor uses:
- `editorMode` as the primary editing state
- `selectionState` (what is currently selected)
- `activePaletteSelection` (what asset is currently chosen for placement/paint)

### 4.2 Mode behaviors
This is the required behavior set. Small UX tweaks are allowed if they do not change the mental model.

#### Select mode
- Tap empty: clear selection (or keep selection; implementation choice, but be consistent)
- Tap object: select object
- Drag selected: move (if movable)

#### Ground mode (paint)
- Tap/drag: paint ground tiles with selected tile
- Tap existing tile (optional): pick/sampler

#### Props mode
- Tap empty: place prop using selected prop asset
- Tap prop: select prop
- Drag selected prop: move prop

#### Entities mode
- Tap empty: place entity using selected entity asset
- Tap entity: select entity (move-first, no popup)
- Drag selected entity: move entity

#### Collision mode
- Tap/drag: paint collision cells
- Erase available via mode UI (toggle/erase as a tool option)

#### Triggers mode
- Tap empty: place new trigger (default type or chosen type)
- Tap trigger: select trigger
- Drag: move trigger
- Drag handles (if available): resize trigger

### 4.3 Entity rule (critical)
Legacy behavior to remove:
- "Select entity -> open property inspector popup"

Required behavior:
- "Select entity -> allow immediate move/drag"
- Entity parameter editing appears inside the Entities tab in the right berry.

### 4.4 Berry open/close behavior
Required minimum:
- Right berry open indicates user is actively editing a mode.
- Closing right berry should reduce UI clutter and return user to selection-first workflow.

Acceptable implementation choices (choose one and keep consistent):
Option A:
- Closing right berry forces `editorMode = select`.

Option B:
- Closing right berry keeps `editorMode` but disables placement/paint until berry is reopened.

Tracks should prefer Option A unless it causes regressions.

---

## 5. Removing legacy UI dependencies

### 5.1 Floating selection popups (legacy)
These must be migrated to bottom bar:
- Tile selection popup actions
- Entity selection popup actions

After migration completion, floating popups should be removed or kept only behind a debug flag.

### 5.2 Layer panel (legacy)
The layer panel may remain for advanced users, but:
- Normal workflow must not require it.
- No new features should be implemented only inside the layer panel.
- After Track 30 it should be hidden by default or moved into an "advanced" area.

### 5.3 Property inspector popup (legacy)
The entity property inspector popup must be replaced by Entities tab UI in the right berry.

---

## 6. Asset pipeline requirements

### 6.1 Sprites/Slices tool (MVP)
User flow:
1. Import image (sprite sheet)
2. Choose slice size (16x16, 32x32; optionally custom)
3. Preview grid overlay
4. Confirm slice
5. Output sliced sprites into Assets Library

### 6.2 Assets Library (MVP)
Library must display assets grouped by:
- tilesets
- props
- entities
(Trigger visuals optional)

Library must support:
- viewing groups
- selecting an asset for placement/paint
- (Optional) rename group locally (before GitHub mirroring)
- delete asset entries (local)

---

## 7. GitHub mirroring rules (Tracks 29–30)

### 7.1 Canonical repo paths
The editor must treat these as canonical:

- `game/assets/tilesets/<group>/...`
- `game/assets/props/<group>/...`
- `game/assets/entities/<group>/...`

(Exact root can be adjusted to match repo reality, but once chosen it becomes canonical.)

### 7.2 Group name slug rules
Group names must be normalized to a safe folder name:

- lowercase
- spaces -> hyphens
- remove or replace unsafe characters
- trim hyphens
- prevent empty names

This slug must be used consistently across:
- UI grouping label (display can be nicer, but slug is the key)
- folder path in GitHub

### 7.3 Mirroring behavior
- Scanning repo folders builds the grouping list.
- Creating a group in the editor creates the corresponding folder by committing files into it.
- Imports labeled as "goblin" must land in `entities/goblin/`.

---

## 8. Migration rules for staged tracks

### 8.1 One authority at a time
If a new system is added (ex: bottom context strip), tracks must redirect interactions to it and not keep both systems active indefinitely.

### 8.2 Feature flags are temporary
Feature flags may be used to stage deployment, but the final default path must be the Editor V2 model.

### 8.3 No regressions in core flows
Core flows that must remain working throughout migration:
- paint ground
- place props
- place and move entities
- paint collision
- create and edit triggers (basic)
- undo/redo

---

## 9. Acceptance tests (end of Track 30)

By the end of Track 30, a user can:

1. Use top bar for Undo/Redo/Settings/Play and nothing else.
2. Use bottom-left selection tool as the main selection anchor.
3. See selection actions in the bottom bar context strip, not floating popups.
4. Open right berry and switch modes via tabs.
5. Select and move an entity without any popup opening.
6. Edit entity parameters inside Entities tab UI.
7. Open left berry, import a sprite sheet, slice it, and see results in the asset library.
8. Assign assets to groups and have those groups mirror GitHub folders.
9. Commit new assets to GitHub under the correct group folder paths.
10. Reload and see groupings and assets rehydrated from repo structure.

---

## 10. Non-goals for Tracks 23–30
These are explicitly out of scope unless a track says otherwise:

- Full pixel art editor
- Advanced animation timeline
- Complex prefab system
- Autotiling rules
- Major rendering engine rewrite
- Multiplayer collaboration

---

## 11. Legacy component mapping (current repo context)
This section exists to help agents understand what they are replacing.

Likely legacy UI components:
- top panel UI
- bottom panel UI
- layer panel
- floating tile selection bar
- floating entity selection bar
- property inspector popup

Agents should progressively migrate responsibilities:
- floating selection bars -> bottom context strip
- entity inspector popup -> Entities tab UI
- layer selection UI -> right berry mode tabsSelection Tool (default neutral mode)


Bottom Context Strip

Shows contextual actions based on what is currently selected.

Examples:

Selection Type	Actions in Bottom Strip

Tiles	Move, Copy, Paste, Delete, Fill, Cancel
Entities	Duplicate, Delete, Clear
Triggers	Resize, Delete, Duplicate


Floating action popups are considered legacy UI and should be removed once replaced.

Bottom Bar Expanded State

When expanded, the bottom bar exposes project-level actions:

Import

Export

Commit to GitHub


These are session actions, not editing tools.


---

Right Berry — World Editing Panel

The right berry is the primary editing brain.
Opening the berry means the user is in placement or editing mode.

Tabs across the top define the active editing mode.

Tab	Meaning	Writes To

Ground	Paint terrain	Ground layer
Props	Place scenery	Props layer
Entities	Place and edit actors	Entities layer
Collision	Paint collision	Collision layer
Triggers	Place trigger zones	Triggers layer


Rules:

Switching tabs changes the editor mode.

The active tab determines what data type is edited.

The berry replaces the need for a separate layers panel for normal workflow.

Closing the berry returns the editor to selection-only mode.



---

Left Berry — Asset Pipeline Panel

The left berry is used for asset preparation and management.

It is used less frequently than the right berry and never directly edits the world.

Typical tabs include:

Sprites / Slices (import and slice sprite sheets)

Assets Library (grouped view of assets)

Animations (future)

Prefabs (future)

Project Tools (maintenance)



---

3. Editor Modes (State Model)

The editor uses a single state variable:

editorMode = 
  "select" |
  "ground" |
  "props" |
  "entities" |
  "collision" |
  "triggers"

This replaces the combination of “active layer” and “current tool”.

Mode Behavior Summary

Mode	Tap Empty	Tap Existing	Drag

select	Clear selection	Select object	Move selection
ground	Paint tile	Sample tile	Paint stroke
props	Place prop	Select prop	Move prop
entities	Place entity	Select entity	Move entity
collision	Paint collision	Toggle cell	Paint stroke
triggers	Place trigger	Select trigger	Move/resize trigger



---

4. Entity Interaction Rules

Entities must follow the same interaction philosophy as other objects.

Old behavior (legacy)

Selecting an entity opens a popup inspector.


New behavior

Selecting an entity allows immediate movement.

Entity editing UI lives inside the Entities tab in the right berry.

No modal popups should appear for entity editing.



---

5. Layer Panel Status

The traditional “Layers Panel” becomes an advanced or optional tool.

It is not required for normal editing flow.

Users should be able to:

Paint

Place props

Place entities

Edit collision

Edit triggers


Without needing to interact with a layer management UI.


---

6. Asset Grouping and GitHub Folder Mirroring

Asset grouping in the editor must map directly to folder structure in the repository.

Example Structure

game/assets/tilesets/<group>/
game/assets/props/<group>/
game/assets/entities/<group>/

Folder names become group names in the editor.

Rules

Group names must be sanitized into safe folder names.

The editor should scan repo folders to build group lists.

UI group names and folder names must stay synchronized.



---

7. Migration Philosophy

During the transition to Editor V2:

1. New systems should be introduced according to this architecture.


2. Existing systems should be redirected to use the new architecture.


3. Legacy UI elements should be removed once replaced.



The goal is one clear workflow, not parallel systems.


---

8. Summary

Editor V2 establishes:

Mode-driven editing

No popup inspectors

Bottom bar as the interaction hub

Right berry as the world editing surface

Left berry as the asset pipeline

GitHub folder structure mirrored in UI groupings


All future tracks and refactors must align with this model.
