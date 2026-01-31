import type { EntityType } from '@/types';

export interface EntityRegistry {
  getType(name: string): EntityType | undefined;
  hasType(name: string): boolean;
  getTypeNames(): string[];
}

export function createEntityRegistry(entityTypes: EntityType[]): EntityRegistry {
  const registry = new Map<string, EntityType>();

  for (const entityType of entityTypes) {
    registry.set(entityType.name, entityType);
  }

  return {
    getType(name) {
      return registry.get(name);
    },
    hasType(name) {
      return registry.has(name);
    },
    getTypeNames() {
      return Array.from(registry.keys());
    },
  };
}
