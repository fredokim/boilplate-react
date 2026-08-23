import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const distDir = join(root, 'dist', 'assets');
// Raised from 270KB to fit hls.js/light (~375KB), which the live player lazy-loads for
// HLS playback outside Safari. Nothing we author should come close to this, so the
// report below prints the largest chunks to keep app-code growth visible despite the
// headroom the cap now allows.
const maxChunkBytes = 400 * 1024;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

if (!existsSync(distDir)) {
  throw new Error('Missing dist/assets. Run npm run build before checking bundle budget.');
}

const jsChunks = walk(distDir)
  .filter((file) => file.endsWith('.js'))
  .map((file) => ({ file, size: statSync(file).size }));

const describe = (chunk: { file: string; size: number }) =>
  `${relative(root, chunk.file)} ${(chunk.size / 1024).toFixed(1)}KB`;

const oversized = jsChunks.filter((chunk) => chunk.size > maxChunkBytes);

if (oversized.length > 0) {
  console.error(oversized.map((chunk) => `- ${describe(chunk)}`).join('\n'));
  process.exit(1);
}

const largest = [...jsChunks].sort((left, right) => right.size - left.size).slice(0, 3);

console.log(
  `Bundle budget passed. ${String(jsChunks.length)} JS chunks checked, max ${(maxChunkBytes / 1024).toFixed(0)}KB.`,
);
console.log(largest.map((chunk) => `  largest: ${describe(chunk)}`).join('\n'));
