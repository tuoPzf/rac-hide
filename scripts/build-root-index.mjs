/**
 * Build the repository-root landing page from demo/index.html.
 *
 * Both URLs serve the same demo:
 *   /            → index.html  (assets under ./demo/)
 *   /demo/       → demo/index.html (assets alongside the page)
 *
 * Keeping the markup in one place and rewriting only the two asset URLs avoids
 * maintaining two copies of the copy.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const HEADER = '<!-- Generated from demo/index.html by node scripts/build-root-index.mjs. Do not edit directly. -->';

export function renderRootIndex(demoHtml) {
  const html = demoHtml
    .replace('href="style.css"', 'href="./demo/style.css"')
    .replace('src="app.js"', 'src="./demo/app.js"');

  if (!html.includes('href="./demo/style.css"') || !html.includes('src="./demo/app.js"')) {
    throw new Error('demo/index.html no longer contains the expected asset references');
  }
  return html.replace('<head>', `<head>\n${HEADER}`);
}

async function main() {
  const source = await readFile(path.join(ROOT, 'demo', 'index.html'), 'utf8');
  const output = renderRootIndex(source);
  await writeFile(path.join(ROOT, 'index.html'), output, 'utf8');
  process.stdout.write('Wrote index.html from demo/index.html\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
