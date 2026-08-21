import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Plugin } from 'vite';

export const DEFAULT_PACKAGED_THEME = 'yue';

type AssetEntry = { path: string; bytes: number; hash: string };
type AssetManifest = { version: 1; packages: Record<string, { fingerprint: string; bytes: number; files: AssetEntry[] }> };

function filesUnder(root: string) {
  const output: string[] = [];
  const visit = (directory: string) => {
    for (const name of readdirSync(directory)) {
      const path = join(directory, name);
      if (statSync(path).isDirectory()) visit(path);
      else output.push(path);
    }
  };
  if (statSync(root).isDirectory()) visit(root);
  return output;
}

function packageEntry(publicDir: string, root: string) {
  const files = filesUnder(join(publicDir, root)).map((absolutePath) => {
    const content = readFileSync(absolutePath);
    return {
      path: `/${relative(publicDir, absolutePath).split(sep).join('/')}`,
      bytes: content.byteLength,
      hash: createHash('sha256').update(content).digest('hex').slice(0, 20),
    };
  });
  const fingerprint = createHash('sha256').update(files.map(file => `${file.path}:${file.hash}`).join('\n')).digest('hex').slice(0, 20);
  return { fingerprint, bytes: files.reduce((sum, file) => sum + file.bytes, 0), files };
}

export function createThemeAssetManifest(publicDir: string): AssetManifest {
  const packages: AssetManifest['packages'] = {};
  for (const name of readdirSync(join(publicDir, 'divination-themes'))) packages[`theme:${name}`] = packageEntry(publicDir, `divination-themes/${name}`);
  for (const name of readdirSync(join(publicDir, 'card-decks', 'tarot'))) packages[`deck:${name}`] = packageEntry(publicDir, `card-decks/tarot/${name}`);
  return { version: 1, packages };
}

export function themeAssetPackagesPlugin(androidBuild: boolean): Plugin {
  let outDir = 'dist';
  return {
    name: 'theme-asset-packages',
    apply: 'build',
    configResolved(config) { outDir = config.build.outDir; },
    buildStart() {
      this.emitFile({ type: 'asset', fileName: 'theme-assets-manifest.json', source: JSON.stringify(createThemeAssetManifest('public')) });
    },
    closeBundle() {
      if (!androidBuild) return;
      const themesDir = join(outDir, 'divination-themes');
      for (const name of readdirSync(themesDir)) if (name !== DEFAULT_PACKAGED_THEME) rmSync(join(themesDir, name), { recursive: true, force: true });
      rmSync(join(outDir, 'card-decks'), { recursive: true, force: true });
    },
  };
}
