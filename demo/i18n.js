/**
 * Tiny, dependency-free i18n for the demo.
 *
 * Language resolution order:
 *   1. `?lang=` in the URL
 *   2. a remembered choice in localStorage
 *   3. a Chinese browser locale
 *   4. English
 *
 * Storage access is best-effort: private modes, disabled storage and quota
 * errors all fall back silently to detection without a remembered choice.
 */

export const LANGUAGES = ['en', 'zh'];
export const STORAGE_KEY = 'rac-hide-lang';

export const messages = {
  en: {
    'meta.title': 'RAC-Hide — robust image steganography',
    'meta.description':
      'Hide a secret image inside another so it survives JPEG re-compression and proportional rescaling. Runs entirely in your browser.',

    'nav.algorithm': 'Algorithm',
    'lang.switchTo': 'Switch to Chinese',

    'hero.eyebrow': 'Robust DCT steganography',
    'hero.title': 'Hide one image inside another.',
    'hero.lead':
      'Embed a secret image into the DCT coefficients of a cover image so it survives JPEG/WebP re-compression and proportional rescaling.',
    'hero.note': 'Everything runs locally in your browser — no uploads, no server.',
    'badge.zeroDeps': 'Zero dependencies',
    'badge.blind': 'Blind extraction',
    'badge.rescale': 'Anti-rescale',
    'badge.license': 'GPL-3.0',

    'tabs.label': 'Mode',
    'tab.embed': 'Embed',
    'tab.extract': 'Extract',

    'drop.coverTitle': 'Cover image',
    'hint.cover': 'Click to choose, or drop a file. Recommended ≥ 512×512.',
    'drop.secretTitle': 'Secret image',
    'hint.secret': 'Hidden inside the cover.',
    'drop.stegoTitle': 'Stego image',
    'hint.stego': 'The image produced by the embed step.',

    'row.capacity': 'Capacity',
    'row.coverEnhance': 'Cover enhance',
    'enhance.none': 'Do not upscale',
    'enhance.edge2048': 'Long edge 2048',
    'enhance.edge2560': 'Long edge 2560',
    'enhance.edge3072': 'Long edge 3072',
    'enhance.edge4096': 'Long edge 4096',
    'enhance.custom': 'Custom',
    'enhance.customPlaceholder': 'custom long edge',

    'tier.highQuality': 'High quality',
    'tier.antiCompression': 'Anti-compression',
    'tier.sliderAria': 'Operating point',
    'tier.capacity': 'Capacity',
    'tier.capacityDesc': 'Largest, sharpest secret — weakest against attacks',
    'tier.anti': 'Anti-compression',
    'tier.antiDesc': 'Strongest against compression and rescaling',
    'tier.balanced': 'Balanced',
    'tier.balancedDesc': 'Visual subtlety and compression resistance',
    'tier.custom': 'Custom',
    'tier.customDesc': 'ppb={ppb} repeat={repeat} nsym={nsym}',
    'tier.allManual': 'All parameters set manually',
    'tier.customBtn': 'Custom parameters',

    'param.pairs': 'Pairs / block',
    'param.repeat': 'Repeat',
    'param.ecc': 'ECC strength',
    'param.marginMin': 'Min margin',
    'param.marginGain': 'Margin gain',
    'param.marginMax': 'Max margin',
    'param.secretMax': 'Secret long edge',

    'btn.embed': 'Embed',
    'btn.downloadStego': 'Download stego',
    'btn.reset': 'Reset',
    'btn.extract': 'Extract',
    'btn.downloadSecret': 'Download secret',

    'fig.cover': 'Cover',
    'fig.secret': 'Secret',
    'fig.stego': 'Stego result',
    'fig.stegoInput': 'Stego image',
    'fig.extracted': 'Recovered secret',

    'manual.label': 'Original size (optional)',
    'manual.widthPlaceholder': 'width',
    'manual.heightPlaceholder': 'height',
    'manual.hint': 'Used only if the spatial ruler cannot be read automatically.',

    'footer.license':
      'GPL-3.0-or-later · for research, copyright protection and lawful covert communication.',
    'footer.note':
      'Steganography hides the payload; it does not encrypt it. Encrypt first if confidentiality matters.',

    'status.embedding': 'Embedding…',
    'status.embedDone': 'Done. Download the stego image as PNG.',
    'status.extracting': 'Extracting…',
    'status.extractDone': 'Done.',
    'status.noPayload': 'No valid payload found.',

    'error.generic': 'Something went wrong: {message}',
    'error.secretTooLarge':
      'The secret image does not fit in this cover. Use a larger cover, a higher-capacity preset, or a smaller secret.',
    'error.coverTooSmall':
      'This cover image is too small to embed anything. Use a larger cover or a higher-capacity preset.',
    'error.payloadTooLarge':
      'The payload ({payload} B) exceeds the cover capacity ({capacity} B). Use a larger cover or a higher-capacity preset.',
    'error.canvas': 'Could not export the image canvas.',
    'error.decodeImage': 'Could not read the image file. Try a different file.',

    'hint.file': '{name} · {w}×{h}',
    'meta.size': '{w} × {h} px',
    'meta.embed': '{w} × {h} px · secret {sw}×{sh} · JPEG q{q}',
    'meta.extract': '{w} × {h} px · ppb={ppb} repeat={repeat} nsym={nsym}',
    'capacity.value': '≈ {kb} KB',
  },

  zh: {
    'meta.title': 'RAC-Hide — 抗压缩图片隐写',
    'meta.description':
      '把秘密图片藏进另一张图片，经过 JPEG 重新压缩和等比缩放后仍可提取。全部在浏览器本地完成。',

    'nav.algorithm': '算法',
    'lang.switchTo': '切换到英文',

    'hero.eyebrow': '抗压缩 DCT 隐写',
    'hero.title': '把秘密图片\n藏进另一张图片',
    'hero.lead':
      '将秘密图片嵌入载体图的 DCT 系数，经过 JPEG/WebP 重新压缩和等比缩放后，仍可提取。',
    'hero.note': '全部在浏览器本地处理，不上传图片，不经过服务器。',
    'badge.zeroDeps': '零依赖',
    'badge.blind': '盲提取',
    'badge.rescale': '抗缩放',
    'badge.license': 'GPL-3.0',

    'tabs.label': '模式',
    'tab.embed': '嵌入隐写',
    'tab.extract': '提取隐写',

    'drop.coverTitle': '载体图片',
    'hint.cover': '点击选择，或拖拽图片到此处。建议尺寸 ≥ 512×512。',
    'drop.secretTitle': '秘密图片',
    'hint.secret': '将被隐藏到载体图片中。',
    'drop.stegoTitle': '隐写图片',
    'hint.stego': '选择之前嵌入隐写后下载的图片。',

    'row.capacity': '容量',
    'row.coverEnhance': '载体增强',
    'enhance.none': '不放大',
    'enhance.edge2048': '长边 2048',
    'enhance.edge2560': '长边 2560',
    'enhance.edge3072': '长边 3072',
    'enhance.edge4096': '长边 4096',
    'enhance.custom': '自定义',
    'enhance.customPlaceholder': '自定义长边',

    'tier.highQuality': '高清',
    'tier.antiCompression': '抗压缩',
    'tier.sliderAria': '工作点',
    'tier.capacity': '容量优先',
    'tier.capacityDesc': '容量最大，秘密图最清晰',
    'tier.anti': '抗压缩优先',
    'tier.antiDesc': '抗压缩最强，容量最小',
    'tier.balanced': '均衡',
    'tier.balancedDesc': '视觉隐蔽与抗压缩兼顾',
    'tier.custom': '自定义',
    'tier.customDesc': 'ppb={ppb} repeat={repeat} nsym={nsym}',
    'tier.allManual': '手动调节所有参数',
    'tier.customBtn': '自定义参数',

    'param.pairs': '系数对/块',
    'param.repeat': '重复次数',
    'param.ecc': '纠错强度',
    'param.marginMin': '最小margin',
    'param.marginGain': 'margin增益',
    'param.marginMax': '最大margin',
    'param.secretMax': '秘密图长边',

    'btn.embed': '嵌入隐写',
    'btn.downloadStego': '下载隐写图',
    'btn.reset': '重置',
    'btn.extract': '提取秘密',
    'btn.downloadSecret': '下载秘密图片',

    'fig.cover': '载体图片',
    'fig.secret': '秘密图片',
    'fig.stego': '隐写结果',
    'fig.stegoInput': '隐写图片',
    'fig.extracted': '提取结果',

    'manual.label': '填写原始尺寸（可选）',
    'manual.widthPlaceholder': '宽度',
    'manual.heightPlaceholder': '高度',
    'manual.hint': '仅在空间标尺读不出来时使用。',

    'footer.license': 'GPL-3.0-or-later · 用于研究、版权保护与合法隐蔽通信。',
    'footer.note': '隐写只隐藏载荷，不负责加密。需要保密请先加密。',

    'status.embedding': '嵌入中…',
    'status.embedDone': '嵌入完成，可下载隐写图（PNG）。',
    'status.extracting': '提取中…',
    'status.extractDone': '提取完成。',
    'status.noPayload': '未检测到有效的隐写数据。',

    'error.generic': '出错了：{message}',
    'error.secretTooLarge': '秘密图片放不进这张载体图。请换更大的载体、提高容量，或换一张更小的秘密图。',
    'error.coverTooSmall': '这张载体图太小，放不下任何数据。请换更大的载体，或提高容量。',
    'error.payloadTooLarge': '载荷（{payload} B）超过载体容量（{capacity} B）。请换更大的载体，或提高容量。',
    'error.canvas': '图片画布导出失败。',
    'error.decodeImage': '图片读取失败，请换一张图片。',

    'hint.file': '{name} · {w}×{h}',
    'meta.size': '{w} × {h} px',
    'meta.embed': '{w} × {h} px · 秘密图 {sw}×{sh} · JPEG q{q}',
    'meta.extract': '{w} × {h} px · ppb={ppb} repeat={repeat} nsym={nsym}',
    'capacity.value': '≈ {kb} KB',
  },
};

/** Normalise `zh`, `zh-CN`, `ZH_hans` … to a supported language, or null. */
export function normalizeLang(value) {
  if (!value) return null;
  const base = String(value).trim().toLowerCase().split(/[-_]/)[0];
  return LANGUAGES.includes(base) ? base : null;
}

/** Resolve the language without touching the DOM or global state. */
export function detectLang({ search = '', stored = null, languages = [] } = {}) {
  const fromUrl = normalizeLang(new URLSearchParams(search).get('lang'));
  if (fromUrl) return fromUrl;

  const remembered = normalizeLang(stored);
  if (remembered) return remembered;

  for (const tag of languages) {
    if (normalizeLang(tag) === 'zh') return 'zh';
  }
  return 'en';
}

/** Look up a message and substitute `{placeholders}`. */
export function translate(lang, key, vars) {
  const table = messages[lang] || messages.en;
  let text = table[key] ?? messages.en[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

/** Read a remembered language; never throws (storage can be blocked). */
export function readStoredLang(storage) {
  try {
    return storage ? storage.getItem(STORAGE_KEY) : null;
  } catch {
    return null;
  }
}

/** Persist a language; returns false when storage is unavailable. */
export function writeStoredLang(storage, lang) {
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, lang);
    return true;
  } catch {
    return false;
  }
}

/**
 * Translate every annotated node in place. Existing nodes, listeners, input
 * values, canvases and disabled states are left untouched.
 */
export function applyTranslations(root, lang) {
  const text = (key) => translate(lang, key);

  for (const node of root.querySelectorAll('[data-i18n]')) {
    node.textContent = text(node.dataset.i18n);
  }
  for (const node of root.querySelectorAll('[data-i18n-aria-label]')) {
    node.setAttribute('aria-label', text(node.dataset.i18nAriaLabel));
  }
  for (const node of root.querySelectorAll('[data-i18n-placeholder]')) {
    node.setAttribute('placeholder', text(node.dataset.i18nPlaceholder));
  }
  for (const node of root.querySelectorAll('[data-i18n-content]')) {
    node.setAttribute('content', text(node.dataset.i18nContent));
  }
  for (const node of root.querySelectorAll('[data-i18n-title]')) {
    node.setAttribute('title', text(node.dataset.i18nTitle));
  }
}
