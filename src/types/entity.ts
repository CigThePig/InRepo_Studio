/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Define entity property schemas for InRepo Studio
 *
 * Defines:
 * - PropertyDefinitionSchema — entity property schema (type: schema)
 * - PropertyConstraintsSchema — validation rules (type: schema)
 * - PropertyType — allowed property types (type: lookup)
 *
 * Canonical key set:
 * - Keys come from: this file (authoritative source)
 * - Export/Import policy: same key set, no excluded keys
 *
 * Apply/Rebuild semantics:
 * - Property values: live-applying in inspector
 *
 * Verification (minimum):
 * - [ ] All property types have corresponding editor UI
 * - [ ] Constraints validate correctly for each type
 * - [ ] Default values match type constraints
 */

// --- Property Types ---

export type PropertyType = 'string' | 'number' | 'boolean' | 'assetRef';

// --- Property Constraints ---

export interface PropertyConstraints {
  /** Minimum value (for number type) */
  min?: number;
  /** Maximum value (for number type) */
  max?: number;
  /** Minimum length (for string type) */
  minLength?: number;
  /** Maximum length (for string type) */
  maxLength?: number;
  /** Regex pattern (for string type) */
  pattern?: string;
  /** Asset type filter (for assetRef type, e.g., "sprite", "audio") */
  assetType?: string;
}

// --- Property Definition ---

export interface PropertyDefinition {
  /** Property name (used as key) */
  name: string;
  /** Display label for UI (defaults to name if not provided) */
  label?: string;
  /** Property type */
  type: PropertyType;
  /** Default value */
  default: string | number | boolean;
  /** Optional validation constraints */
  constraints?: PropertyConstraints;
}

// --- Validation ---

export function validatePropertyDefinition(prop: unknown): prop is PropertyDefinition {
  if (!prop || typeof prop !== 'object') return false;
  const p = prop as Record<string, unknown>;

  if (typeof p.name !== 'string') return false;
  if (!isValidPropertyType(p.type)) return false;

  // Validate default value matches type
  const defaultType = typeof p.default;
  switch (p.type) {
    case 'string':
    case 'assetRef':
      if (defaultType !== 'string') return false;
      break;
    case 'number':
      if (defaultType !== 'number') return false;
      break;
    case 'boolean':
      if (defaultType !== 'boolean') return false;
      break;
  }

  if (p.constraints !== undefined && !validatePropertyConstraints(p.constraints)) {
    return false;
  }

  return true;
}

export function isValidPropertyType(type: unknown): type is PropertyType {
  return type === 'string' || type === 'number' || type === 'boolean' || type === 'assetRef';
}

export function validatePropertyConstraints(constraints: unknown): constraints is PropertyConstraints {
  if (!constraints || typeof constraints !== 'object') return false;
  const c = constraints as Record<string, unknown>;

  // All fields are optional, but if present must be correct type
  if (c.min !== undefined && typeof c.min !== 'number') return false;
  if (c.max !== undefined && typeof c.max !== 'number') return false;
  if (c.minLength !== undefined && typeof c.minLength !== 'number') return false;
  if (c.maxLength !== undefined && typeof c.maxLength !== 'number') return false;
  if (c.pattern !== undefined && typeof c.pattern !== 'string') return false;
  if (c.assetType !== undefined && typeof c.assetType !== 'string') return false;

  return true;
}

/**
 * Validate a property value against its definition
 */
export function validatePropertyValue(
  value: unknown,
  definition: PropertyDefinition
): boolean {
  // Type check
  switch (definition.type) {
    case 'string':
    case 'assetRef':
      if (typeof value !== 'string') return false;
      break;
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) return false;
      break;
    case 'boolean':
      if (typeof value !== 'boolean') return false;
      break;
    default:
      return false;
  }

  // Constraint checks
  const constraints = definition.constraints;
  if (!constraints) return true;

  if (definition.type === 'number') {
    const num = value as number;
    if (constraints.min !== undefined && num < constraints.min) return false;
    if (constraints.max !== undefined && num > constraints.max) return false;
  }

  if (definition.type === 'string' || definition.type === 'assetRef') {
    const str = value as string;
    if (constraints.minLength !== undefined && str.length < constraints.minLength) return false;
    if (constraints.maxLength !== undefined && str.length > constraints.maxLength) return false;
    if (constraints.pattern !== undefined) {
      try {
        const regex = new RegExp(constraints.pattern);
        if (!regex.test(str)) return false;
      } catch {
        return false;
      }
    }
  }

  return true;
}

/**
 * Create default property values from definitions
 */
export function createDefaultProperties(
  definitions: PropertyDefinition[]
): Record<string, string | number | boolean> {
  const properties: Record<string, string | number | boolean> = {};
  for (const def of definitions) {
    properties[def.name] = def.default;
  }
  return properties;
}
