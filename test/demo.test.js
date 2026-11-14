import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  LANGUAGES,
  messages,
  normalizeLang,
  detectLang,
  translate,
  readStoredLang,
  writeStoredLang,
} from '../demo/i18n.js';
import { renderRootIndex } from '../scripts/build-root-index.mjs';
import { describeError } from '../demo/errors.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFile(path.join(ROOT, file), 'utf8');
const exists = (file) => access(path.join(ROOT, file)).then(() => true, () => false);

const DEMO_FILES = ['index.html', 'demo/index.html', 'demo/app.js', 'demo/i18n.js', 'demo/errors.js', 'demo/style.css'];
const TEXT_SKIP = /\.(?:jpg|jpeg|png|gif|ico|webp|woff2?|ttf|otf|zip|gz|pdf)$/i;
const IPV4 = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
const LOCAL_PATH = /\/(?:root|tmp|home)\/|[A-Za-z]:\\Users\\/;

// Generic release guard: no real hosting identity is encoded here. Any new
// external host in the tree must be reviewed and added deliberately.
const ALLOWED_HOSTS = new Set([
  'github.com',
  'github.io',
  'img.shields.io',
  'nodejs.org',
  'www.gnu.org',
  'fsf.org',
  'www.contributor-covenant.org',
  'www.conventionalcommits.org',
  'www.w3.org',
  'localhost',
]);

function allowedHost(host) {
  return ALLOWED_HOSTS.has(host) || host.endsWith('.github.io');
}

function externalHosts(text) {
  return [...text.matchAll(/https?:\/\/([^\s"'<>`)]+)/g)].map((match) =>
    match[1].split('/')[0].split(':')[0].toLowerCase(),
  );
}

function linkHosts(html) {
  return [...html.matchAll(/(?:href|src)="(https?:\/\/[^"]+)"/g)].map((match) => {
    try {
      return new URL(match[1]).hostname.toLowerCase();
    } catch {
      return '';
    }
  });
}

async function walkTextFiles(dir = ROOT) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkTextFiles(full)));
    } else if (entry.isFile() && !TEXT_SKIP.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function placeholders(text) {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

function htmlKeys(html) {
  const keys = [];
  const pattern = /data-i18n(?:-aria-label|-placeholder|-content|-title)?="([^"]+)"/g;
  for (const match of html.matchAll(pattern)) keys.push(match[1]);
  return keys;
}

function appKeys(source) {
  const keys = new Set();
  // Direct t('key') calls and dotted key literals returned from helpers.
  for (const match of source.matchAll(/\bt\('([a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9_]+)+)'/g)) keys.add(match[1]);
  for (const match of source.matchAll(/'([a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9_]+)+)'/g)) keys.add(match[1]);
  return [...keys];
}

function localRefs(html) {
  const refs = [];
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const ref = match[1];
    if (/^(?:[a-z]+:|\/\/|#)/i.test(ref)) continue;
    refs.push(ref);
  }
  return refs;
}

function importSpecs(source) {
  return [...source.matchAll(/\bfrom\s+'([^']+)'/g)].map((match) => match[1]);
}

test('English and Chinese dictionaries have identical, non-empty keys', () => {
  assert.deepEqual(Object.keys(messages).sort(), [...LANGUAGES].sort());

  const en = Object.keys(messages.en).sort();
  const zh = Object.keys(messages.zh).sort();
  assert.deepEqual(zh, en);

  for (const key of en) {
    assert.equal(typeof messages.en[key], 'string', key);
    assert.equal(typeof messages.zh[key], 'string', key);
    assert.ok(messages.en[key].trim(), `empty en value: ${key}`);
    assert.ok(messages.zh[key].trim(), `empty zh value: ${key}`);
    assert.deepEqual(
      placeholders(messages.zh[key]),
      placeholders(messages.en[key]),
      `placeholder mismatch: ${key}`,
    );
  }
});

test('language detection follows URL > remembered > browser > English', () => {
  assert.equal(normalizeLang('zh'), 'zh');
  assert.equal(normalizeLang('zh-CN'), 'zh');
  assert.equal(normalizeLang('EN_us'), 'en');
  assert.equal(normalizeLang('fr'), null);

  assert.equal(
    detectLang({ search: '?lang=zh', stored: 'en', languages: ['en-US'] }),
    'zh',
  );
  assert.equal(
    detectLang({ search: '?lang=fr', stored: 'zh-CN', languages: ['en-US'] }),
    'zh',
  );
  assert.equal(
    detectLang({ search: '', stored: 'en', languages: ['zh-CN', 'en'] }),
    'en',
  );
  assert.equal(
    detectLang({ search: '', stored: null, languages: ['en-US', 'zh-CN'] }),
    'zh',
  );
  assert.equal(detectLang({ search: '', stored: 'bogus', languages: ['en-GB'] }), 'en');
  assert.equal(detectLang(), 'en');
});

test('translation interpolates values and falls back safely', () => {
  assert.equal(translate('en', 'capacity.value', { kb: '1.2' }), '≈ 1.2 KB');
  assert.match(translate('zh', 'meta.embed', { w: 10, h: 20, sw: 2, sh: 3, q: 80 }), /10 × 20 px/);
  assert.equal(translate('en', 'meta.size', { w: 3, h: 4 }), '3 × 4 px');
  assert.equal(translate('xx', 'capacity.value', { kb: 1 }), '≈ 1 KB');
  assert.equal(translate('en', 'missing.key'), 'missing.key');
});

test('storage access degrades when localStorage is unavailable', () => {
  const blocked = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
  };
  assert.equal(readStoredLang(blocked), null);
  assert.equal(writeStoredLang(blocked, 'zh'), false);
  assert.equal(readStoredLang(null), null);
  assert.equal(writeStoredLang(null, 'zh'), false);
});

test('library, decode and export errors map to stable i18n keys', () => {
  assert.deepEqual(
    describeError(new Error('secret image does not fit into this cover')),
    { key: 'error.secretTooLarge' },
  );
  assert.deepEqual(
    describeError(new Error('cover image is too small to embed anything')),
    { key: 'error.coverTooSmall' },
  );
  assert.deepEqual(
    describeError(new Error('payload of 123 B exceeds capacity of 45 B')),
    { key: 'error.payloadTooLarge', vars: { payload: '123', capacity: '45' } },
  );
  assert.deepEqual(describeError(new Error('canvas.toBlob failed')), { key: 'error.canvas' });

  const decodeError = new DOMException('The source image could not be decoded.', 'EncodingError');
  assert.deepEqual(describeError(decodeError), { key: 'error.decodeImage' });
  assert.deepEqual(describeError(decodeError, { decode: true }), { key: 'error.decodeImage' });
  assert.deepEqual(describeError(new Error('random'), { decode: true }), { key: 'error.decodeImage' });
  assert.deepEqual(describeError({}), { key: 'error.decodeImage' });

  assert.deepEqual(describeError(new Error('random'), { exporting: true }), { key: 'error.canvas' });
  assert.deepEqual(
    describeError(new DOMException('Invalid canvas state', 'InvalidStateError'), { exporting: true }),
    { key: 'error.canvas' },
  );

  const generic = describeError(new Error('random failure'));
  assert.equal(generic.key, 'error.generic');
  assert.equal(generic.vars.message, 'random failure');
});

test('release guard recognises Windows user paths without encoding a real path', () => {
  assert.ok(LOCAL_PATH.test(['C:', 'Users', 'example'].join(String.fromCharCode(92))));
});

test('every annotated and programmatic key exists in both dictionaries', async () => {
  const html = await read('demo/index.html');
  const app = await read('demo/app.js');
  const errors = await read('demo/errors.js');
  const keys = [...new Set([...htmlKeys(html), ...appKeys(app), ...appKeys(errors)])];

  assert.ok(keys.length > 40, `expected many keys, got ${keys.length}`);
  for (const key of keys) {
    assert.ok(key in messages.en, `missing English key: ${key}`);
    assert.ok(key in messages.zh, `missing Chinese key: ${key}`);
  }
});

test('root page is generated from the demo page instead of maintained twice', async () => {
  const demo = await read('demo/index.html');
  const root = await read('index.html');
  assert.equal(root, renderRootIndex(demo));
  assert.ok(root.indexOf('Generated from demo/index.html') !== -1);
  assert.ok(!root.includes('http-equiv="refresh"'));
  assert.ok(!root.includes('url=./demo/'));
  assert.ok(!root.includes('rel="canonical"'));
});

test('root and demo pages both load existing local assets', async () => {
  const root = await read('index.html');
  const demo = await read('demo/index.html');

  const rootRefs = localRefs(root);
  assert.ok(rootRefs.includes('./demo/style.css'), 'root CSS path');
  assert.ok(rootRefs.includes('./demo/app.js'), 'root JS path');
  for (const ref of rootRefs) assert.ok(await exists(ref), `missing root asset: ${ref}`);

  const demoRefs = localRefs(demo);
  assert.ok(demoRefs.includes('style.css'), 'demo CSS path');
  assert.ok(demoRefs.includes('app.js'), 'demo JS path');
  for (const ref of demoRefs) assert.ok(await exists(path.join('demo', ref)), `missing demo asset: ${ref}`);

  const app = await read('demo/app.js');
  for (const spec of importSpecs(app)) {
    assert.ok(await exists(path.join('demo', spec)), `missing module: ${spec}`);
  }
});

test('published pages only use GitHub links and contain no IP, SEO or redirect fields', async () => {
  for (const file of DEMO_FILES) {
    const text = await read(file);
    const lower = text.toLowerCase();

    for (const host of linkHosts(text)) {
      assert.ok(
        host === 'github.com' || host.endsWith('.github.io'),
        `${file} links to a non-GitHub host: ${host}`,
      );
    }
    assert.ok(!IPV4.test(text), `${file} contains a bare IPv4 address`);
    assert.ok(!LOCAL_PATH.test(text), `${file} contains a local absolute path`);
    assert.ok(!lower.includes('name="keywords"'), `${file} contains meta keywords`);
    assert.ok(!lower.includes('rel="canonical"'), `${file} contains a canonical link`);
    assert.ok(!lower.includes('http-equiv="refresh"'), `${file} contains a redirect`);
    assert.ok(!lower.includes('og:site_name'), `${file} contains site-identity metadata`);
  }

  const app = await read('demo/app.js');
  assert.ok(!/\.innerHTML\s*=/.test(app), 'app.js must not rebuild the DOM with innerHTML');
  assert.ok(!/\.outerHTML\s*=/.test(app), 'app.js must not rebuild the DOM with outerHTML');
  assert.ok(!/location\.reload/.test(app), 'language switching must not reload the page');

  const pages = await read('.github/workflows/pages.yml');
  assert.ok(pages.includes('cp index.html _site/index.html'));
  assert.ok(!pages.includes('http-equiv="refresh"'));
  assert.ok(!pages.includes('url=./demo/'));
});

test('the repository tree has no bare IPv4, local paths or unvetted hosts', async () => {
  for (const file of await walkTextFiles()) {
    const relative = path.relative(ROOT, file);
    const text = await readFile(file, 'utf8');

    assert.ok(!IPV4.test(text), `${relative} contains a bare IPv4 address`);
    assert.ok(!LOCAL_PATH.test(text), `${relative} contains a local absolute path`);

    for (const host of externalHosts(text)) {
      assert.ok(allowedHost(host), `${relative} references an unvetted host: ${host}`);
    }
  }
});
