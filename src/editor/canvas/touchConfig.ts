/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Centralized touch configuration for editor canvas
 *
 * Defines:
 * - TouchConfig — touch offset and gesture configuration (type: schema)
 * - DEFAULT_TOUCH_CONFIG — default configuration values (type: defaults)
 *
 * Canonical key set:
 * - Keys come from: this file (authoritative source)
 * - Export/Import policy: will be part of EditorSettingsSchema in Track 28
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (changes take effect immediately)
 *
 * Verification (minimum):
 * - [ ] Touch offset applies consistently to hover and actions
 * - [ ] Gesture timing values feel responsive
 */

// --- Types ---

/**
 * Touch configuration for the editor canvas.
 * These values can be made user-configurable in Track 28.
 */
export interface TouchConfig {
  /** Y offset in pixels (negative = above finger) */
  offsetY: number;

  /** Delay before confirming single-finger as tool gesture (ms) */
  toolConfirmDelay: number;

  /** Movement threshold to confirm tool without delay (px) */
  movementThreshold: number;

  /** Delay before triggering long-press (ms) */
  longPressDelay: number;

  /** Movement threshold to cancel long-press (px) */
  longPressMovementThreshold: number;
}

// --- Constants ---

/**
 * Default touch configuration values.
 * These are designed for typical mobile device usage.
 */
export const DEFAULT_TOUCH_CONFIG: TouchConfig = {
  // Position cursor 48px above touch point to avoid finger occlusion
  offsetY: -48,

  // Wait 150ms before confirming single-finger as tool gesture
  // This allows time for a second finger to be added for pan/zoom
  toolConfirmDelay: 150,

  // If finger moves more than 5px, confirm as tool immediately
  movementThreshold: 5,

  // Trigger long-press after 500ms of holding without movement
  longPressDelay: 500,

  // Cancel long-press if finger moves more than 10px
  longPressMovementThreshold: 10,
};

// --- Singleton Configuration ---

let currentConfig: TouchConfig = { ...DEFAULT_TOUCH_CONFIG };

/**
 * Get the current touch configuration.
 */
export function getTouchConfig(): TouchConfig {
  return { ...currentConfig };
}

/**
 * Update the touch configuration.
 * Partial updates are merged with current configuration.
 */
export function setTouchConfig(config: Partial<TouchConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Reset to default configuration.
 */
export function resetTouchConfig(): void {
  currentConfig = { ...DEFAULT_TOUCH_CONFIG };
}

// --- Convenience Re-exports ---

/**
 * Touch offset Y value (exported for backwards compatibility).
 * Use getTouchConfig().offsetY for dynamic access.
 */
export const TOUCH_OFFSET_Y = DEFAULT_TOUCH_CONFIG.offsetY;
