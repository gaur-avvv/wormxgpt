#!/usr/bin/env node

/**
 * wormxgpt — Unfiltered Chaos CLI
 * Main executable entry point. Runs cli/index.ts using the tsx loader.
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

const cliEntry = join(root, 'cli', 'index.ts');
const args = process.argv.slice(2);

let tsxCliPath;
try {
  const require = createRequire(import.meta.url);
  tsxCliPath = require.resolve('tsx/cli');
} catch (e) {
  tsxCliPath = null;
}

if (tsxCliPath) {
  const child = spawn(process.execPath, [tsxCliPath, cliEntry, ...args], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env, NODE_NO_WARNINGS: '1' }
  });
  child.on('exit', (code) => process.exit(code ?? 0));
} else {
  const child = spawn('npx', ['-y', 'tsx', cliEntry, ...args], {
    stdio: 'inherit',
    cwd: process.cwd(),
    shell: true,
    env: { ...process.env, NODE_NO_WARNINGS: '1' }
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}
