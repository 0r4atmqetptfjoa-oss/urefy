#!/usr/bin/env node
/**
 * render-svg.mjs - Vector SVG Rasterizer using Sharp (librsvg)
 * 
 * Usage:
 *   node render-svg.mjs <input.svg> <output.png> [width] [height]
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// Resolve sharp from root node_modules
const require = createRequire(import.meta.url);
let sharp;
try {
  sharp = require('sharp');
} catch (err) {
  try {
    const rootSharp = path.resolve(process.cwd(), 'node_modules', 'sharp');
    sharp = require(rootSharp);
  } catch (e2) {
    console.error('[ERROR] sharp package could not be loaded:', err.message);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node render-svg.mjs <input.svg> <output.png> [width] [height]');
  process.exit(1);
}

const inputPath = path.resolve(args[0]);
const outputPath = path.resolve(args[1]);
const width = args[2] ? parseInt(args[2], 10) : 1024;
const height = args[3] ? parseInt(args[3], 10) : width;

if (!fs.existsSync(inputPath)) {
  console.error(`[ERROR] Input SVG file does not exist: ${inputPath}`);
  process.exit(1);
}

const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Read SVG content
const svgBuffer = fs.readFileSync(inputPath);

sharp(svgBuffer, { density: 300 })
  .resize(width, height, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  })
  .png({
    compressionLevel: 9,
    adaptiveFiltering: true
  })
  .toFile(outputPath)
  .then(info => {
    console.log(JSON.stringify({
      success: true,
      file: outputPath,
      width: info.width,
      height: info.height,
      size: info.size
    }));
    process.exit(0);
  })
  .catch(err => {
    console.error(JSON.stringify({
      success: false,
      error: err.message
    }));
    process.exit(1);
  });
