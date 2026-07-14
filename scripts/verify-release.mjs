import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const version = packageJson.version;
if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) throw new Error('package.json contains an invalid release version.');
const releaseRoot = new URL('../dist/release/', import.meta.url);
const packageRoot = new URL(`pixelperfect-${version}/`, releaseRoot);
const archiveName = `pixelperfect-v${version}.tar.gz`;
const required = [
  'pixelperfect.css',
  'pixelperfect.min.css',
  'pixelperfect.es.js',
  'pixelperfect.iife.js',
  'pixelperfect.d.ts',
  'icons/pixelperfect-icons.svg',
  'font/PixelifySans-VariableFont_wght.ttf',
  'font/OFL.txt',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
  'README.md',
  'CHANGELOG.md',
  'SHA256SUMS',
];

for (const file of required) await access(new URL(file, packageRoot));

function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

const checksumLines = (await readFile(new URL('SHA256SUMS', packageRoot), 'utf8')).trim().split('\n');
for (const line of checksumLines) {
  const match = line.match(/^([a-f0-9]{64}) {2}(.+)$/);
  if (!match) throw new Error(`Invalid checksum line: ${line}`);
  const [, expected, file] = match;
  const actual = sha256(await readFile(new URL(file, packageRoot)));
  if (actual !== expected) throw new Error(`Checksum mismatch: ${file}`);
}

const archive = new URL(archiveName, releaseRoot);
const sidecar = (await readFile(new URL(`${archiveName}.sha256`, releaseRoot), 'utf8')).trim();
if (sidecar !== `${sha256(await readFile(archive))}  ${archiveName}`) throw new Error('Archive checksum mismatch.');

await new Promise((resolve, reject) => {
  const child = spawn('tar', ['-tzf', fileURLToPath(archive)], { stdio: ['ignore', 'pipe', 'inherit'] });
  let listing = '';
  child.stdout.on('data', (chunk) => {
    listing += chunk;
  });
  child.on('error', reject);
  child.on('exit', (code) => {
    if (code !== 0) return reject(new Error(`Archive inspection failed (${code})`));
    for (const file of required) {
      if (!listing.includes(`pixelperfect-${version}/${file}`)) return reject(new Error(`Archive is missing ${file}`));
    }
    resolve();
  });
});

process.stdout.write(`Verified ${required.length} release files and all checksums.\n`);
