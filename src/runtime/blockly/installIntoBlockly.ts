import type { BlockRegistry } from './blockRegistry';

interface InstallRegistryIntoBlocklyArgs {
  Blockly: {
    Blocks: Record<string, unknown>;
    common: {
      defineBlocksWithJsonArray(defs: unknown[]): void;
    };
  };
  javascriptGenerator: {
    forBlock: Record<string, unknown>;
  };
  registry: BlockRegistry;
}

/**
 * Installs block definitions and generators from a BlockRegistry into Blockly.
 * Safe to call multiple times.
 */
export function installRegistryIntoBlockly({
  Blockly,
  javascriptGenerator,
  registry,
}: InstallRegistryIntoBlocklyArgs): void {
  const entries = registry.getAllEntries();
  let definedCount = 0;

  for (const entry of entries) {
    const blockType = entry.definition.type;

    if (!Blockly.Blocks?.[blockType]) {
      Blockly.common.defineBlocksWithJsonArray([entry.definition]);
      definedCount += 1;
    }

    javascriptGenerator.forBlock[blockType] = (block: unknown, generator: unknown) => {
      return entry.generator(block, generator);
    };
  }

  if (import.meta.env.DEV) {
    console.debug(
      `[Blockly/install] installed ${entries.length} generators, ${definedCount} new definitions`,
    );
  }
}
