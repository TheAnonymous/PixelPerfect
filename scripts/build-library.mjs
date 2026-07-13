import { cp, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { bundleAsync } from 'lightningcss';
import { build } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = new URL('../dist/library/', import.meta.url);
const cssEntry = fileURLToPath(new URL('../src/css/pixelperfect.css', import.meta.url));

await mkdir(output, { recursive: true });

await build({
  configFile: false,
  build: {
    emptyOutDir: false,
    lib: {
      entry: fileURLToPath(new URL('../src/pixelperfect.ts', import.meta.url)),
      fileName: (format) => `pixelperfect.${format}.js`,
      formats: ['es', 'iife'],
      name: 'PixelPerfect',
    },
    minify: 'oxc',
    outDir: fileURLToPath(output),
    rollupOptions: {
      output: {
        exports: 'named',
      },
    },
    sourcemap: true,
  },
});

async function buildCss(minify) {
  const result = await bundleAsync({
    filename: cssEntry,
    minify,
  });
  return result.code.toString().replaceAll('../assets/font/', './font/');
}

await Promise.all([
  writeFile(new URL('pixelperfect.css', output), await buildCss(false)),
  writeFile(new URL('pixelperfect.min.css', output), await buildCss(true)),
]);

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['./node_modules/typescript/bin/tsc', '-p', 'tsconfig.build.json'], {
    cwd: root,
    stdio: 'inherit',
  });
  child.on('error', reject);
  child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Declaration build failed (${code})`))));
});

await rename(new URL('types/pixelperfect.d.ts', output), new URL('pixelperfect.d.ts', output));
await mkdir(new URL('font/', output), { recursive: true });
await cp(new URL('../src/assets/font/PixelifySans-VariableFont_wght.ttf', import.meta.url), new URL('font/PixelifySans-VariableFont_wght.ttf', output), { recursive: true });
await cp(new URL('../src/assets/font/OFL.txt', import.meta.url), new URL('font/OFL.txt', output), { recursive: true });

const css = await readFile(new URL('pixelperfect.css', output), 'utf8');
if (!css.includes('./font/PixelifySans-VariableFont_wght.ttf')) {
  throw new Error('The distributable stylesheet does not point to the bundled font.');
}
