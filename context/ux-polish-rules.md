# InRepo Studio — UI Polish Agent Instructions
### UX Feedback & Humanization Rules

> **This is a rule sheet, not a suggestion list.**
> Before marking any feature complete, every rule in this document must be satisfied.

---

## Purpose

This document defines the non-negotiable UX feedback standards for InRepo Studio. It exists to prevent regressions into silent, cold, or ambiguous interactions — and to ensure all current and future features feel **responsive, reassuring, and human**.

Treat feedback with the same seriousness as data integrity.

---

## North Star Principle

> **The system knowing it worked is not enough. The user must feel that it worked.**

If an action succeeds but the user is unsure, the UX has failed.

---

## The Feedback Contract

Every user-initiated action **must** trigger at least one form of feedback. Certain actions require more.

### Feedback Classes

| Class | Signal | Meaning |
|---|---|---|
| **1. Acknowledgement** | Immediate response to input | "I heard you." |
| **2. State Change** | Selection, ownership, or context visibly shifts | "Something is different now." |
| **3. Safety / Reassurance** | Hot storage, undoability, or non-destructive confirmation | "Your work is safe." |
| **4. Completion** | Finality without anxiety | "That action landed." |

### Minimum Feedback Requirements

| Action Type | Required Feedback |
|---|---|
| Simple action (select, toggle) | 1 feedback class |
| Creation / Add | 2 feedback classes |
| Deletion / Destructive | 3 feedback classes |
| Save / Commit | Safety + Completion |

**Silent success is not allowed.**

---

## Selection & Focus Rules

The UI must always answer:
- What is selected?
- What am I editing?
- What owns this data?

**Rules:**
- Selection must persist visually across scrolling and panel changes
- Focus must be visually distinguishable from hover
- Only **one** primary selection context may exist at a time

**Violations to prevent:**
- Losing selection without user intent
- Multiple items appearing active simultaneously
- Requiring the user to remember context that the UI should be showing

---

## Action → Reaction Rules

Every action must produce an **immediate, unmistakable** reaction.

**Required properties:**
- Reaction must begin within the same frame or animation tick
- Reaction must not require interpretation
- Reaction must occur where the user is **already looking**

**Anti-patterns to eliminate:**
- State changes reflected only in a different panel or area
- List updates without any visual emphasis on the changed item
- Changes that only become visible after navigation

---

## Hot / Cold Storage UX Rules

Storage safety must be **felt, not inferred**.

**Required signals:**
- Visible indication of unsaved (hot) state
- Calm confirmation when work is committed (cold save)
- Clear visual distinction between temporary and committed data

**Prohibited:**
- Modal save confirmations for normal workflows
- Alarmist language or colors for routine save states
- Making the user feel punished for safe behavior

---

## Motion as Language

Motion communicates meaning. It is never decorative.

### Motion Grammar

| Motion | Meaning |
|---|---|
| Pulse | Acknowledgement |
| Expand | Creation |
| Shrink / Fade | Removal |
| Slide | Context change |
| Glow / Emphasis | Success |

**Rules:**
- Motion duration scales with the weight of the action
- Never stack more than two motions simultaneously
- Motion must **never** block input

---

## Empty State Rules

Empty states are **invitations**, not errors.

**Every empty state must:**
- Explain what is missing
- Suggest exactly **one** next action
- Use a calm, encouraging tone

**Prohibited:**
- Walls of explanatory text
- Judgmental or apologetic language
- More than one call to action

---

## Undo & Reversibility Rules

Confidence comes from knowing mistakes are recoverable.

**Requirements:**
- Undo availability must be visible immediately after any risky action
- Reversible actions must **feel** reversible — the UI should signal this
- No guilt, warning, or friction unless the action is genuinely irreversible

**UX Goal:** Users should experiment without hesitation.

---

## Cross-System Consistency Rules

Feedback language must be **consistent** across all systems:

- Assets
- Animations
- Entities
- Collisions
- Blockly

Consistency must be maintained across: color, motion, timing, terminology, and emotional tone.

> If two systems feel different, users will distrust both.

---

## Agent Implementation Checklist

Before marking **any** feature complete, verify every item:

- [ ] Every user action triggers at least the minimum required feedback
- [ ] Selection and focus are always clearly visible
- [ ] No silent success paths exist anywhere in the flow
- [ ] Storage safety is surfaced — not hidden or inferred
- [ ] Motion communicates meaning, not decoration
- [ ] Empty states invite action with a single, clear next step
- [ ] Undo or reversibility is clearly indicated after risky actions
- [ ] New UX matches the existing feedback language of surrounding systems

**If any box is unchecked, the feature is not done.**

---

## Regression Rule

> Any new feature that does not follow this document is considered **incomplete**, even if functionally correct.

This file is the source of truth for UX behavior in InRepo Studio.

---

## Closing Principle

> **Humanized UX is not polish. It is infrastructure.**

## UI Design Tokens & Theming

### Strict Rules

1. **Rule 1: No Hardcoded Colors.** Developers are strictly forbidden from using hex codes, `rgb()`, or `rgba()` for structural UI elements. All colors must reference `--irs-` variables.
2. **Rule 2: Mobile-First Sizing.** All interactive elements (buttons, close icons, list items) MUST have a minimum height and width of `var(--irs-touch-target)` (44px).
3. **Rule 3: Border Radii.** Never use hardcoded pixel values for `border-radius`. Use `var(--irs-radius-sm)` for buttons/inputs, `var(--irs-radius-md)` for panels, and `var(--irs-radius-lg)` for floating modals.

### Shared UI Components

4. **Rule 4: Use Shared Utility Classes.** Do not write custom CSS for standard buttons, text inputs, dialog boxes, or modal overlays. You must use the `.irs-` prefixed classes (e.g., `.irs-btn`, `.irs-input`, `.irs-overlay`, `.irs-dialog`) defined in `common-styles.css`.
5. **Rule 5: No Duplicate Structural Styles.** Component-specific `<style>` tags injected via TypeScript should only contain layout CSS specific to that component (e.g., CSS Grid layouts, flexbox spacing for toolbars). They should never redefine basic button hover states or input borders.

### Token Index (`src/shared/theme.css`)

- **Surfaces & Backgrounds**
  - `--irs-surface-base`
  - `--irs-surface-panel`
  - `--irs-surface-modal`
  - `--irs-surface-input`
  - `--irs-surface-dark-alpha`
- **Accent Colors**
  - `--irs-accent-primary`
  - `--irs-accent-primary-active`
  - `--irs-accent-danger`
  - `--irs-accent-danger-active`
  - `--irs-accent-success`
  - `--irs-accent-warning`
- **Borders**
  - `--irs-border-light`
  - `--irs-border-heavy`
  - `--irs-border-blue-alpha`
- **Typography**
  - `--irs-text-primary`
  - `--irs-text-secondary`
  - `--irs-text-muted`
- **Geometry & Sizing**
  - `--irs-radius-sm`
  - `--irs-radius-md`
  - `--irs-radius-lg`
  - `--irs-touch-target`
