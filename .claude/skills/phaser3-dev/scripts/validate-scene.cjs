#!/usr/bin/env node

/**
 * Phaser 3 Scene Validator
 *
 * Lint-checks a Phaser scene file for common anti-patterns and issues.
 *
 * Usage: node validate-scene.js <path/to/scene.js>
 * Exit code 0: pass (no warnings)
 * Exit code 1: warnings found
 */

const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node validate-scene.js <path/to/scene.js>');
  process.exit(2);
}

const fullPath = path.resolve(filePath);
if (!fs.existsSync(fullPath)) {
  console.error(`File not found: ${fullPath}`);
  process.exit(2);
}

const source = fs.readFileSync(fullPath, 'utf-8');
const lines = source.split('\n');
const warnings = [];

function warn(line, message) {
  warnings.push({ line, message });
}

// ── Check 1: Scene lifecycle methods ──

const hasPreload = /preload\s*\(/.test(source);
const hasCreate = /create\s*\(/.test(source);
const hasUpdate = /update\s*\(/.test(source);

if (!hasPreload) warn(0, 'Missing preload() method. Scenes should define preload() for asset loading.');
if (!hasCreate) warn(0, 'Missing create() method. Scenes must define create() to set up game objects.');
if (!hasUpdate) warn(0, 'Missing update() method. Scenes should define update(time, delta) for game loop logic.');

// ── Check 2: Object creation inside update() ──

let insideUpdate = false;
let braceDepth = 0;
let updateStartLine = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Detect update method start
  if (/update\s*\(\s*(time\s*,?\s*delta?)?\s*\)/.test(line)) {
    insideUpdate = true;
    updateStartLine = i;
    braceDepth = 0;
  }

  if (insideUpdate) {
    braceDepth += (line.match(/{/g) || []).length;
    braceDepth -= (line.match(/}/g) || []).length;

    // Check for object creation patterns (but allow .get() for pooling)
    if (i !== updateStartLine) {
      if (/this\.add\.\w+\s*\(/.test(line) && !/\/\/.*pool/i.test(line)) {
        warn(i + 1, 'Object creation via this.add.*() inside update(). Use object pooling instead.');
      }
      if (/new\s+Phaser\.\w+/.test(line) && !/\/\/.*reuse/i.test(line) && !/\/\/.*cache/i.test(line)) {
        warn(i + 1, 'Creating new Phaser object inside update(). Pre-allocate in create() and reuse.');
      }
    }

    if (braceDepth <= 0 && i > updateStartLine) {
      insideUpdate = false;
    }
  }
}

// ── Check 3: setInterval / setTimeout usage ──

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (/\bsetInterval\s*\(/.test(line)) {
    warn(i + 1, 'setInterval() detected. Use this.time.addEvent() instead for Phaser-managed timers.');
  }
  if (/\bsetTimeout\s*\(/.test(line)) {
    warn(i + 1, 'setTimeout() detected. Use this.time.delayedCall() instead for Phaser-managed timers.');
  }
}

// ── Check 4: Hardcoded width/height ──

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Look for common hardcoded resolution patterns, but ignore small numbers
  // that might be sprite sizes or offsets
  if (/(?:width|height)\s*[:=]\s*(?:640|750|800|1024|1080|1280|1920|2560)/i.test(line)) {
    warn(i + 1, 'Hardcoded resolution value detected. Use this.scale.width / this.scale.height instead.');
  }
  // Check for direct pixel values in game config scale
  if (/(?:mode|width|height)\s*:\s*(?:640|750|800|1024|1080|1280|1920|2560)\b/.test(line)) {
    warn(i + 1, 'Hardcoded canvas dimension in config. Consider using Phaser.Scale.RESIZE for responsive layout.');
  }
}

// ── Results ──

if (warnings.length === 0) {
  console.log(`✓ ${path.basename(filePath)}: No issues found.`);
  process.exit(0);
} else {
  console.log(`⚠ ${path.basename(filePath)}: ${warnings.length} warning(s) found:\n`);
  warnings.forEach(w => {
    const loc = w.line > 0 ? `Line ${w.line}` : 'General';
    console.log(`  [${loc}] ${w.message}`);
  });
  process.exit(1);
}
