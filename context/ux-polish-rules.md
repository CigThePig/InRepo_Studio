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

# UI Architecture & Strict Theming Guidelines

To maintain a cohesive, professional, and mobile-first experience across InRepo Studio, all UI development **MUST** adhere to the central design token system.  

### 🛑 The Golden Rule for AI Agents and Developers
**NEVER use hardcoded hex codes (`#FFFFFF`), `rgb()`, `rgba()`, or static pixel values for `border-radius` in component-specific files.** All colors, radii, and standard UI dimensions must be referenced via CSS variables from `src/shared/theme.css`.

### 1. The Design Token System (`--irs-`)
All UI components must utilize the variables defined in `src/shared/theme.css`.
* **Surfaces:** Use `--irs-surface-base`, `--irs-surface-panel`, `--irs-surface-modal`, `--irs-surface-input`.
* **Accents:** Use `--irs-accent-primary`, `--irs-accent-danger`, etc., for interactive states.
* **Borders:** Use `--irs-border-light` (panels/dividers) and `--irs-border-heavy` (inputs/dialogs).
* **Text:** Use `--irs-text-primary`, `--irs-text-secondary`, `--irs-text-muted`.

### 2. Mobile-First Sizing & Touch Targets
InRepo Studio is a mobile-first application.  
* Every interactive element (button, link, dropdown, close icon) **MUST** have a minimum computed height and width of `var(--irs-touch-target)` (44px).
* Do not rely solely on padding to achieve this; explicitly set `min-height: var(--irs-touch-target);`.

### 3. Shared Utility Classes (`.irs-`)
Do not rewrite standard CSS for common elements. You must use the shared classes defined in `src/shared/common-styles.css`:
* **Buttons:** `.irs-btn`, `.irs-btn--primary`, `.irs-btn--secondary`, `.irs-btn--danger`.
* **Inputs:** `.irs-input` (handles border, focus states, and iOS anti-zoom font sizing).
* **Modals & Dialogs:** Wrap floating UI in `.irs-overlay` and the immediate container in `.irs-dialog`.

### 4. Component-Specific Styles (`<style>` tags)
When dynamically injecting styles into the shadow DOM or `<head>` via TypeScript components (e.g., `const STYLES = ...`):
* **Allowed:** Layout CSS (Flexbox, CSS Grid), component-specific spacing (gap, padding, margin), overflow handling, and unique positioning.
* **Strictly Forbidden:** Redefining button hover states, setting explicit border colors, setting explicit background colors, or hardcoding `border-radius`.

### ✅ Pre-Commit / Pre-Generation UI Checklist
Before generating or committing UI code, ensure the following:
- [ ] Are all hex codes/rgba values removed from the component's CSS?
- [ ] Are buttons using `.irs-btn` instead of custom `<button>` styling?
- [ ] Are text inputs using `.irs-input`?
- [ ] Are `border-radius` values using `var(--irs-radius-sm/md/lg)`?
- [ ] Can a user on a mobile phone easily tap the new element? (Is it at least 44px by 44px?)
