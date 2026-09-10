#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'packages', 'client-ui', 'dist');

function digestTree(directory) {
  const result = new Map();
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) {
        const relative = path.relative(directory, absolute).replaceAll(path.sep, '/');
        result.set(relative, crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex'));
      }
    }
  };
  walk(directory);
  return result;
}

function build() {
  const npmCli = process.env.npm_execpath;
  const command = npmCli ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm');
  const args = npmCli ? [npmCli, 'run', 'build'] : ['run', 'build'];
  const run = spawnSync(command, args, { cwd: root, stdio: 'inherit', env: { ...process.env, SOURCE_DATE_EPOCH: '0' } });
  if (run.error) throw run.error;
  if (run.status !== 0) throw new Error(`Build failed with exit code ${run.status}`);
  return digestTree(output);
}

const first = build();
const second = build();
const paths = new Set([...first.keys(), ...second.keys()]);
const differences = [...paths].filter((file) => first.get(file) !== second.get(file));
if (differences.length) {
  console.error('Non-reproducible build artifacts:', differences);
  process.exit(1);
}
console.log(`Reproducible build verified across ${paths.size} artifacts.`);
