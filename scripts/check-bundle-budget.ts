import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = process.cwd();
const distDir = join(root, 'dist', 'assets');

// Measured after gzip, because that is what a browser actually downloads. Raw bytes
// compress to roughly a third here, so a raw cap has to be read through a conversion
// every time and ends up either meaningless or accidentally strict.
const maxChunkBytes = 150 * 1024;

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
  .map((file) => {
    const raw = readFileSync(file);
    return { file, rawSize: raw.byteLength, size: gzipSync(raw).byteLength };
  });

const describe = (chunk: { file: string; rawSize: number; size: number }) =>
  `${relative(root, chunk.file)} ${(chunk.size / 1024).toFixed(1)}KB gzip (${(chunk.rawSize / 1024).toFixed(1)}KB raw)`;

const oversized = jsChunks.filter((chunk) => chunk.size > maxChunkBytes);

if (oversized.length > 0) {
  console.error(oversized.map((chunk) => `- ${describe(chunk)}`).join('\n'));
  process.exit(1);
}

const largest = [...jsChunks].sort((left, right) => right.size - left.size).slice(0, 3);

console.log(
  `Bundle budget passed. ${String(jsChunks.length)} JS chunks checked, max ${(maxChunkBytes / 1024).toFixed(0)}KB gzip.`,
);
console.log(largest.map((chunk) => `  largest: ${describe(chunk)}`).join('\n'));
