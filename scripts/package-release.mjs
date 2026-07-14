import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const version = packageJson.version;
if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) throw new Error('package.json contains an invalid release version.');
const library = new URL('../dist/library/', import.meta.url);
const releaseRoot = new URL('../dist/release/', import.meta.url);
const packageRoot = new URL(`pixelperfect-${version}/`, releaseRoot);

await rm(releaseRoot, { force: true, recursive: true });
await mkdir(packageRoot, { recursive: true });

const copies = [
  ['pixelperfect.css', 'pixelperfect.css'],
  ['pixelperfect.min.css', 'pixelperfect.min.css'],
  ['pixelperfect.es.js', 'pixelperfect.es.js'],
  ['pixelperfect.iife.js', 'pixelperfect.iife.js'],
  ['pixelperfect.d.ts', 'pixelperfect.d.ts'],
  ['font/PixelifySans-VariableFont_wght.ttf', 'font/PixelifySans-VariableFont_wght.ttf'],
  ['font/OFL.txt', 'font/OFL.txt'],
];

for (const [source, destination] of copies) {
  await mkdir(new URL(destination.replace(/[^/]+$/, ''), packageRoot), { recursive: true });
  await cp(new URL(source, library), new URL(destination, packageRoot));
}

await mkdir(new URL('icons/', packageRoot), { recursive: true });
await cp(new URL('../public/icons/pixelperfect-icons.svg', import.meta.url), new URL('icons/pixelperfect-icons.svg', packageRoot));

for (const filename of ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'README.md', 'CHANGELOG.md']) {
  await cp(new URL(`../${filename}`, import.meta.url), new URL(filename, packageRoot));
}

async function filesBelow(directory, prefix = '') {
  const names = await readdir(directory);
  const files = [];
  for (const name of names.sort()) {
    const relative = prefix ? `${prefix}/${name}` : name;
    const url = new URL(name, directory);
    if ((await stat(url)).isDirectory()) files.push(...(await filesBelow(new URL(`${name}/`, directory), relative)));
    else files.push(relative);
  }
  return files;
}

async function sha256(url) {
  return createHash('sha256').update(await readFile(url)).digest('hex');
}

const files = await filesBelow(packageRoot);
const checksums = [];
for (const file of files) checksums.push(`${await sha256(new URL(file, packageRoot))}  ${file}`);
await writeFile(new URL('SHA256SUMS', packageRoot), `${checksums.join('\n')}\n`);

const archiveName = `pixelperfect-v${version}.tar.gz`;
const archivePath = new URL(archiveName, releaseRoot);
await new Promise((resolve, reject) => {
  const child = spawn('tar', ['--sort=name', '--mtime=UTC 2026-07-14', '--owner=0', '--group=0', '--numeric-owner', '-czf', fileURLToPath(archivePath), `pixelperfect-${version}`], {
    cwd: fileURLToPath(releaseRoot),
    stdio: 'inherit',
  });
  child.on('error', reject);
  child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Archive creation failed (${code})`))));
});

await writeFile(new URL(`${archiveName}.sha256`, releaseRoot), `${await sha256(archivePath)}  ${archiveName}\n`);
