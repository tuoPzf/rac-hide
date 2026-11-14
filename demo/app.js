import { embedImage, extractImage, decodeImageFile, imageDataToBlob, resizeImageData } from '../src/browser.js';
import { capacityBytes } from '../src/core.js';
import {
  applyTranslations,
  detectLang,
  readStoredLang,
  translate,
  writeStoredLang,
} from './i18n.js';
import { describeError } from './errors.js';

const MAX_LONG = 4096;

const state = {
  coverFile: null,
  secretFile: null,
  cover: null,
  secret: null,
  stego: null,
  embedResult: null,
  extractFile: null,
  extractStego: null,
  extracted: null,
  extractParams: null,
  customMode: false,
  lang: 'en',
  busy: { embed: false, extract: false },
  statuses: { embedStatus: null, extractStatus: null },
  coverDecodeSeq: 0,
  secretDecodeSeq: 0,
  stegoDecodeSeq: 0,
  embedSeq: 0,
  extractSeq: 0,
};

const $ = (id) => document.getElementById(id);

function t(key, vars) {
  return translate(state.lang, key, vars);
}

/* ------------------------------------------------------------------ *
 * Language
 * ------------------------------------------------------------------ */
function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function browserLanguages() {
  const nav = window.navigator || {};
  if (Array.isArray(nav.languages) && nav.languages.length) return [...nav.languages];
  return nav.language ? [nav.language] : [];
}

function syncLangUrl(lang) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', lang);
    window.history.replaceState(null, '', url);
  } catch {
    /* file:// or restricted history — URL hint is optional */
  }
}

function setLanguage(lang, { persist = false, syncUrl = false } = {}) {
  state.lang = lang;
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  applyTranslations(document, lang);

  const toggle = $('langToggle');
  if (toggle) {
    toggle.textContent = lang === 'zh' ? 'EN' : '中文';
    const label = t('lang.switchTo');
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
  }

  if (persist) writeStoredLang(safeStorage(), lang);
  if (syncUrl) syncLangUrl(lang);
  refreshDynamic();
}

/* ------------------------------------------------------------------ *
 * Operating point
 * ------------------------------------------------------------------ */
function sliderToTier(value) {
  if (value <= 50) {
    const t = value / 50;
    return { ppb: Math.round(6 - t * 4), repeat: 1, nsym: Math.round(32 + t * 16) };
  }
  const t = (value - 50) / 50;
  return { ppb: Math.round(2 - t), repeat: t < 0.5 ? 1 : 3, nsym: 48 };
}

function customOptions() {
  return {
    ppb: parseInt($('paramPPB').value, 10) || 2,
    repeat: parseInt($('paramRepeat').value, 10) || 1,
    nsym: parseInt($('paramNsym').value, 10) || 48,
    marginMin: parseInt($('paramMarginMin').value, 10) || 40,
    marginGain: (parseInt($('paramMarginGain').value, 10) || 14) / 10,
    marginMax: parseInt($('paramMarginMax').value, 10) || 200,
    secretMax: parseInt($('paramSecretMax').value, 10) || 1280,
  };
}

function currentOptions() {
  if (state.customMode) return customOptions();
  const tier = sliderToTier(parseInt($('tierSlider').value, 10));
  return { ...tier, marginMin: 40, marginGain: 1.4, marginMax: 200, secretMax: 1280 };
}

function tierText(options) {
  if (options.ppb >= 5) {
    return { name: 'tier.capacity', desc: 'tier.capacityDesc' };
  }
  if (options.ppb <= 1 && options.repeat >= 3) {
    return { name: 'tier.anti', desc: 'tier.antiDesc' };
  }
  if (options.ppb <= 2 && options.nsym >= 48) {
    return { name: 'tier.balanced', desc: 'tier.balancedDesc' };
  }
  return {
    name: 'tier.custom',
    desc: 'tier.customDesc',
    vars: { ppb: options.ppb, repeat: options.repeat, nsym: options.nsym },
  };
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */
function render(canvas, imageData) {
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  canvas
    .getContext('2d')
    .putImageData(new ImageData(imageData.data, imageData.width, imageData.height), 0, 0);
}

function clearCanvas(id) {
  const canvas = $(id);
  canvas.width = canvas.height = 0;
}

// Every async job owns a generation token. Reset, input changes and newer jobs
// bump it, so an old await can never write results, errors or busy state back.
function invalidateEmbedJob() {
  state.embedSeq += 1;
  state.busy.embed = false;
  hideProgress('embedProgress');
}

function invalidateExtractJob() {
  state.extractSeq += 1;
  state.busy.extract = false;
  hideProgress('extractProgress');
}

function clearEmbedResult() {
  state.stego = null;
  state.embedResult = null;
  clearCanvas('stegoCanvas');
}

function clearExtractResult() {
  state.extracted = null;
  state.extractParams = null;
  clearCanvas('extractedCanvas');
}

function setStatus(id, key, kind, vars) {
  state.statuses[id] = key ? { key, kind: kind || '', vars: vars || null } : null;
  paintStatus(id);
}

function paintStatus(id) {
  const status = state.statuses[id];
  const el = $(id);
  el.textContent = status ? t(status.key, status.vars) : '';
  el.className = 'status' + (status && status.kind ? ' ' + status.kind : '');
}

function setStatusError(id, error, options) {
  const { key, vars } = describeError(error, options);
  setStatus(id, key, 'error', vars);
}

function showProgress(id) { $(id).classList.add('active'); }
function hideProgress(id) { $(id).classList.remove('active'); }
function nextFrame() { return new Promise((resolve) => setTimeout(resolve, 30)); }

async function downloadImageData(imageData, filename) {
  const blob = await imageDataToBlob(imageData, 'image/png');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function capLongEdge(imageData) {
  const long = Math.max(imageData.width, imageData.height);
  if (long <= MAX_LONG) return imageData;
  const scale = MAX_LONG / long;
  return resizeImageData(
    imageData,
    Math.max(1, Math.round(imageData.width * scale)),
    Math.max(1, Math.round(imageData.height * scale)),
  );
}

/* ------------------------------------------------------------------ *
 * Dynamic text (safe to re-run while a job is busy)
 * ------------------------------------------------------------------ */
function updateCapacity() {
  const options = currentOptions();
  if (state.cover) {
    const bytes = capacityBytes(state.cover.width, state.cover.height, options);
    $('capacityInfo').textContent = t('capacity.value', { kb: (Math.max(0, bytes) / 1024).toFixed(1) });
  } else {
    $('capacityInfo').textContent = '—';
  }
  // Never re-enable the button while an embed job is still running.
  $('embedBtn').disabled = state.busy.embed || !(state.cover && state.secret);
}

function updateTierUI() {
  if (state.customMode) {
    $('tierName').textContent = t('tier.custom');
    $('tierDesc').textContent = t('tier.allManual');
  } else {
    const label = tierText(currentOptions());
    $('tierName').textContent = t(label.name);
    $('tierDesc').textContent = t(label.desc, label.vars);
  }
  $('tierSlider').disabled = state.customMode;
  $('tierSliderWrap').style.opacity = state.customMode ? '0.4' : '1';
  $('tierSliderWrap').style.pointerEvents = state.customMode ? 'none' : '';
  $('racCustomPanel').classList.toggle('open', state.customMode);
}

function renderHints() {
  $('coverHint').textContent = state.cover && state.coverFile
    ? t('hint.file', { name: state.coverFile.name, w: state.cover.width, h: state.cover.height })
    : t('hint.cover');
  $('secretHint').textContent = state.secret && state.secretFile
    ? t('hint.file', { name: state.secretFile.name, w: state.secret.width, h: state.secret.height })
    : t('hint.secret');
  $('stegoHint').textContent = state.extractStego && state.extractFile
    ? t('hint.file', {
        name: state.extractFile.name,
        w: state.extractStego.width,
        h: state.extractStego.height,
      })
    : t('hint.stego');
}

function renderMetas() {
  $('coverMeta').textContent = state.cover
    ? t('meta.size', { w: state.cover.width, h: state.cover.height })
    : '';
  $('secretMeta').textContent = state.secret
    ? t('meta.size', { w: state.secret.width, h: state.secret.height })
    : '';
  $('stegoMeta').textContent = state.stego && state.embedResult
    ? t('meta.embed', {
        w: state.stego.width,
        h: state.stego.height,
        sw: state.embedResult.secretSize[0],
        sh: state.embedResult.secretSize[1],
        q: Math.round(state.embedResult.quality * 100),
      })
    : '';
  $('extractStegoMeta').textContent = state.extractStego
    ? t('meta.size', { w: state.extractStego.width, h: state.extractStego.height })
    : '';
  $('extractMeta').textContent = state.extracted && state.extractParams
    ? t('meta.extract', {
        w: state.extracted.width,
        h: state.extracted.height,
        ppb: state.extractParams.ppb,
        repeat: state.extractParams.repeat,
        nsym: state.extractParams.nsym,
      })
    : '';
}

function updateActionButtons() {
  $('downloadStegoBtn').disabled = !state.stego;
  $('downloadSecretBtn').disabled = !state.extracted;
}

function updateExtractButton() {
  $('extractBtn').disabled = state.busy.extract || !state.extractStego;
}

function refreshDynamic() {
  updateTierUI();
  updateCapacity();
  updateExtractButton();
  renderHints();
  renderMetas();
  updateActionButtons();
  paintStatus('embedStatus');
  paintStatus('extractStatus');
}

/* ------------------------------------------------------------------ *
 * Cover loading (with optional upscaling)
 * ------------------------------------------------------------------ */
function coverTargetLong() {
  const value = $('coverUpscale').value;
  if (value === 'custom') return parseInt($('coverCustomLong').value, 10) || 0;
  return parseInt(value, 10) || 0;
}

async function loadCover() {
  const file = state.coverFile;
  if (!file) return;
  const target = coverTargetLong();
  const token = ++state.coverDecodeSeq;
  try {
    const decoded = await decodeImageFile(file, target);
    if (token !== state.coverDecodeSeq || state.coverFile !== file) return;
    state.cover = target ? decoded : capLongEdge(decoded);
    render($('coverCanvas'), state.cover);
    refreshDynamic();
  } catch (error) {
    if (token !== state.coverDecodeSeq || state.coverFile !== file) return;
    state.cover = null;
    clearCanvas('coverCanvas');
    refreshDynamic();
    setStatusError('embedStatus', error, { decode: true });
  }
}

function reloadCover() {
  invalidateEmbedJob();
  clearEmbedResult();
  state.cover = null;
  clearCanvas('coverCanvas');
  setStatus('embedStatus', null);
  refreshDynamic();
  loadCover();
}

function optionsChanged() {
  invalidateEmbedJob();
  clearEmbedResult();
  setStatus('embedStatus', null);
  refreshDynamic();
}

/* ------------------------------------------------------------------ *
 * Wiring: tabs
 * ------------------------------------------------------------------ */
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
    document
      .querySelectorAll('.panel')
      .forEach((panel) => panel.classList.toggle('hidden', panel.id !== tab.dataset.tab));
  });
});

/* ------------------------------------------------------------------ *
 * Wiring: language
 * ------------------------------------------------------------------ */
$('langToggle').addEventListener('click', () => {
  setLanguage(state.lang === 'zh' ? 'en' : 'zh', { persist: true, syncUrl: true });
});

/* ------------------------------------------------------------------ *
 * Wiring: inputs
 * ------------------------------------------------------------------ */
$('coverInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  state.coverFile = file;
  state.cover = null;
  invalidateEmbedJob();
  clearEmbedResult();
  clearCanvas('coverCanvas');
  setStatus('embedStatus', null);
  refreshDynamic();
  await loadCover();
});

$('secretInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const token = ++state.secretDecodeSeq;
  state.secretFile = file;
  state.secret = null;
  invalidateEmbedJob();
  clearEmbedResult();
  clearCanvas('secretCanvas');
  setStatus('embedStatus', null);
  refreshDynamic();
  try {
    const decoded = await decodeImageFile(file);
    if (token !== state.secretDecodeSeq || state.secretFile !== file) return;
    state.secret = capLongEdge(decoded);
    render($('secretCanvas'), state.secret);
    refreshDynamic();
  } catch (error) {
    if (token !== state.secretDecodeSeq || state.secretFile !== file) return;
    setStatusError('embedStatus', error, { decode: true });
  }
});

$('coverUpscale').addEventListener('change', () => {
  if ($('coverUpscale').value !== 'custom') $('coverCustomLong').value = '';
  reloadCover();
});

$('coverCustomLong').addEventListener('input', () => {
  const input = $('coverCustomLong');
  let value = parseInt(input.value, 10) || 0;
  if (value > 8192) { value = 8192; input.value = '8192'; }
  $('coverUpscale').value = 'custom';
  reloadCover();
});

$('tierSlider').addEventListener('input', optionsChanged);

const paramIds = ['paramPPB', 'paramRepeat', 'paramNsym', 'paramMarginMin', 'paramMarginGain', 'paramMarginMax', 'paramSecretMax'];
paramIds.forEach((id) => {
  $(id).addEventListener('input', () => {
    const value = id === 'paramMarginGain'
      ? (parseInt($(id).value, 10) / 10).toFixed(1)
      : $(id).value;
    $(id + '_v').textContent = value;
    if (state.customMode) optionsChanged();
  });
});

$('customBtn').addEventListener('click', () => {
  state.customMode = !state.customMode;
  optionsChanged();
});

/* ------------------------------------------------------------------ *
 * Embed
 * ------------------------------------------------------------------ */
$('embedBtn').addEventListener('click', async () => {
  if (state.busy.embed || !(state.cover && state.secret)) return;
  const token = ++state.embedSeq;
  const cover = state.cover;
  const secret = state.secret;
  const options = currentOptions();
  state.busy.embed = true;
  $('embedBtn').disabled = true;
  clearEmbedResult();
  setStatus('embedStatus', 'status.embedding');
  showProgress('embedProgress');
  refreshDynamic();
  await nextFrame();
  if (token !== state.embedSeq) return;
  try {
    const result = await embedImage(cover, secret, options);
    if (token !== state.embedSeq) return;
    state.stego = result.stego;
    state.embedResult = { secretSize: result.secretSize, quality: result.quality };
    render($('stegoCanvas'), state.stego);
    setStatus('embedStatus', 'status.embedDone', 'success');
  } catch (error) {
    if (token !== state.embedSeq) return;
    setStatusError('embedStatus', error);
  } finally {
    if (token !== state.embedSeq) return;
    hideProgress('embedProgress');
    state.busy.embed = false;
    refreshDynamic();
  }
});

$('downloadStegoBtn').addEventListener('click', async () => {
  const imageData = state.stego;
  if (!imageData) return;
  try {
    await downloadImageData(imageData, 'stego-image.png');
  } catch (error) {
    if (state.stego !== imageData) return;
    const { key, vars } = describeError(error, { exporting: true });
    setStatus('embedStatus', key, 'error', vars);
  }
});

$('resetEmbedBtn').addEventListener('click', () => {
  invalidateEmbedJob();
  state.coverDecodeSeq += 1;
  state.secretDecodeSeq += 1;
  state.coverFile = state.secretFile = state.cover = state.secret = null;
  clearEmbedResult();
  state.customMode = false;
  $('coverInput').value = '';
  $('secretInput').value = '';
  $('coverUpscale').value = '0';
  $('coverCustomLong').value = '';
  $('tierSlider').value = '50';
  clearCanvas('coverCanvas');
  clearCanvas('secretCanvas');
  setStatus('embedStatus', null);
  refreshDynamic();
});

/* ------------------------------------------------------------------ *
 * Extract
 * ------------------------------------------------------------------ */
$('stegoInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const token = ++state.stegoDecodeSeq;
  state.extractFile = file;
  state.extractStego = null;
  invalidateExtractJob();
  clearExtractResult();
  clearCanvas('extractStegoCanvas');
  setStatus('extractStatus', null);
  refreshDynamic();
  try {
    const decoded = await decodeImageFile(file);
    if (token !== state.stegoDecodeSeq || state.extractFile !== file) return;
    state.extractStego = capLongEdge(decoded);
    render($('extractStegoCanvas'), state.extractStego);
    refreshDynamic();
  } catch (error) {
    if (token !== state.stegoDecodeSeq || state.extractFile !== file) return;
    setStatusError('extractStatus', error, { decode: true });
  }
});

$('extractBtn').addEventListener('click', async () => {
  if (state.busy.extract || !state.extractStego) return;
  const token = ++state.extractSeq;
  const stego = state.extractStego;
  const manualW = parseInt($('manualW').value, 10) || 0;
  const manualH = parseInt($('manualH').value, 10) || 0;
  const manual = manualW >= 16 && manualH >= 16 ? [manualW, manualH] : null;
  state.busy.extract = true;
  $('extractBtn').disabled = true;
  clearExtractResult();
  setStatus('extractStatus', 'status.extracting');
  showProgress('extractProgress');
  refreshDynamic();
  await nextFrame();
  if (token !== state.extractSeq) return;
  try {
    const result = await extractImage(stego, manual);
    if (token !== state.extractSeq) return;
    if (!result) {
      setStatus('extractStatus', 'status.noPayload', 'error');
    } else {
      state.extracted = result.imageData;
      state.extractParams = { ppb: result.ppb, repeat: result.repeat, nsym: result.nsym };
      render($('extractedCanvas'), state.extracted);
      setStatus('extractStatus', 'status.extractDone', 'success');
    }
  } catch (error) {
    if (token !== state.extractSeq) return;
    setStatusError('extractStatus', error);
  } finally {
    if (token !== state.extractSeq) return;
    hideProgress('extractProgress');
    state.busy.extract = false;
    refreshDynamic();
  }
});

$('downloadSecretBtn').addEventListener('click', async () => {
  const imageData = state.extracted;
  if (!imageData) return;
  try {
    await downloadImageData(imageData, 'recovered-secret.png');
  } catch (error) {
    if (state.extracted !== imageData) return;
    const { key, vars } = describeError(error, { exporting: true });
    setStatus('extractStatus', key, 'error', vars);
  }
});

$('resetExtractBtn').addEventListener('click', () => {
  invalidateExtractJob();
  state.stegoDecodeSeq += 1;
  state.extractFile = state.extractStego = null;
  clearExtractResult();
  $('stegoInput').value = '';
  $('manualW').value = '';
  $('manualH').value = '';
  clearCanvas('extractStegoCanvas');
  setStatus('extractStatus', null);
  refreshDynamic();
});

/* ------------------------------------------------------------------ */
state.lang = detectLang({
  search: window.location.search,
  stored: readStoredLang(safeStorage()),
  languages: browserLanguages(),
});
setLanguage(state.lang, { persist: false, syncUrl: false });
