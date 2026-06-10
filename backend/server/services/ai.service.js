import OpenAI from 'openai';
import { EXTENSION_SYSTEM_PROMPT } from './prompt.service.js';

export async function generateExtensionJson(userPrompt) {
  if (!process.env.GROQ_API_KEY) {
    const error = new Error('GROQ_API_KEY is missing. Add it to backend/.env.');
    error.status = 503;
    throw error;
  }

  try {
    return generateWithGroq(userPrompt);
  } catch (error) {
    if (isRecoverableProviderError(error)) {
      error.status = error.status || 502;
    }
    throw error;
  }
}

async function generateWithGroq(userPrompt) {
  const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
  });

  return createJsonCompletion({
    client: groq,
    model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
    userPrompt,
  });
}

async function createJsonCompletion({ client, model, userPrompt }) {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await client.chat.completions.create({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: EXTENSION_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) throw withStatus(new Error('AI provider returned an empty response.'), 502);
      return parseJsonObject(content);
    } catch (error) {
      lastError = error;
      if (!isRecoverableProviderError(error) || attempt === 3) break;
      await delay(400 * attempt);
    }
  }

  throw lastError;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withStatus(error, status) {
  error.status = status;
  return error;
}

function parseJsonObject(content = '') {
  const cleaned = content.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch (error) {
        error.status = 422;
        throw error;
      }
    }
    const error = new Error('Groq did not return valid extension JSON.');
    error.status = 422;
    throw error;
  }
}

function isRecoverableProviderError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.status === 429
    || error?.status === 401
    || error?.status === 403
    || error?.status >= 500
    || error?.code === 'insufficient_quota'
    || error?.code === 'rate_limit_exceeded'
    || message.includes('quota')
    || message.includes('rate limit')
    || message.includes('invalid api key')
    || message.includes('json');
}

export function localTemplatePayload(userPrompt = '') {
  const prompt = userPrompt.toLowerCase();
  if (prompt.includes('dark mode') || prompt.includes('darkmode')) return darkModePayload();
  if (prompt.includes('highlight') && prompt.includes('link')) return linkHighlighterPayload(userPrompt);
  if (prompt.includes('read') && prompt.includes('time')) return readingTimePayload();
  if (/\b(block\w*|remove\w*|hid\w*|clean\w*|stop\w*)\b/i.test(prompt)
    && /\b(ad|ads|advertisement|advertisements|sponsor|sponsored|promoted|popup|pop-up)\b/i.test(prompt)) {
    return adBlockerPayload();
  }
  if (prompt.includes('image') || prompt.includes('img') || prompt.includes('photo')) return imageSquarePayload(userPrompt);
  return genericHelperPayload(userPrompt);
}

function imageSquarePayload(userPrompt = '') {
  const color = extractRequestedColor(userPrompt);
  const shape = extractRequestedShape(userPrompt);
  const titleColor = color.label.charAt(0).toUpperCase() + color.label.slice(1);
  const titleShape = shape.label.charAt(0).toUpperCase() + shape.label.slice(1);
  const contentJs = `(() => {
  'use strict';

  const REPLACED_ATTR = 'data-extensio-image-replaced';
  const BACKGROUND_ATTR = 'data-extensio-background-replaced';
  const BOX_CLASS = 'extensio-image-replacement extensio-shape-${shape.label}';
  const FORCE_EQUAL_SIZE = ${shape.forceSquare};
  let scheduled = false;

  function getVisibleSize(element) {
    const rect = element.getBoundingClientRect?.();
    let width = Math.round(rect?.width || element.width || element.naturalWidth || element.clientWidth || 120);
    let height = Math.round(rect?.height || element.height || element.naturalHeight || element.clientHeight || 90);
    width = Math.max(24, width);
    height = Math.max(24, height);
    if (FORCE_EQUAL_SIZE) {
      const side = Math.max(width, height);
      width = side;
      height = side;
    }
    return { width, height };
  }

  function createReplacement(element) {
    const { width, height } = getVisibleSize(element);
    const box = document.createElement('div');
    box.className = BOX_CLASS;
    box.style.width = width + 'px';
    box.style.height = height + 'px';
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', 'Image replaced by Extensio.ai');
    return box;
  }

  function replaceImageElement(element) {
    if (!element || element.nodeType !== 1 || element.getAttribute(REPLACED_ATTR) === 'true') return;
    if (!element.isConnected || !element.parentNode) return;
    element.setAttribute(REPLACED_ATTR, 'true');
    element.replaceWith(createReplacement(element));
  }

  function replaceBackgroundImage(element) {
    if (!element || element.nodeType !== 1 || element.getAttribute(BACKGROUND_ATTR) === 'true') return;
    const style = window.getComputedStyle(element);
    if (!style || !style.backgroundImage || style.backgroundImage === 'none') return;
    const rect = element.getBoundingClientRect();
    if (rect.width < 24 || rect.height < 24) return;
    element.setAttribute(BACKGROUND_ATTR, 'true');
    element.classList.add('extensio-background-replacement', 'extensio-shape-${shape.label}');
    element.style.backgroundImage = 'none';
  }

  function scan(root = document) {
    if (!root || !document.documentElement) return;
    if (root.nodeType === 1) {
      const tag = root.tagName;
      if (tag === 'IMG' || tag === 'IMAGE') replaceImageElement(root);
      replaceBackgroundImage(root);
    }

    const scope = root.querySelectorAll ? root : document;
    scope.querySelectorAll('img, picture img, svg image, [style*="background-image"], [data-bg], [data-background-image]').forEach((element) => {
      if (element.tagName === 'IMG' || element.tagName === 'IMAGE') replaceImageElement(element);
      else replaceBackgroundImage(element);
    });
  }

  function scheduleScan(root) {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scan(root || document);
    });
  }

  scan();
  window.addEventListener('load', () => scheduleScan(), { once: true });
  window.setInterval(() => scheduleScan(), 1500);

  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) scheduleScan(node);
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();`;
  const stylesCss = `.extensio-image-replacement{display:inline-block!important;background:${color.hex}!important;border:2px solid ${color.border}!important;box-sizing:border-box!important;vertical-align:middle!important;min-width:24px!important;min-height:24px!important}.extensio-background-replacement{background:${color.hex}!important;border:2px solid ${color.border}!important;box-sizing:border-box!important}.extensio-shape-circle{border-radius:9999px!important}.extensio-shape-rounded-box,.extensio-shape-rounded-rectangle{border-radius:12px!important}`;

  return {
    name: `${titleColor} ${titleShape} Image Replacer`,
    description: `Replaces page images with ${color.label} ${shape.plural}.`,
    files: [
      {
        filename: 'manifest.json',
        content: JSON.stringify({
          manifest_version: 3,
          name: `${titleColor} ${titleShape} Image Replacer`,
          version: '1.0.0',
          description: `Replaces page images with ${color.label} ${shape.plural}.`,
          action: { default_popup: 'popup.html' },
          content_scripts: [{ matches: ['<all_urls>'], js: ['content.js'], css: ['styles.css'], run_at: 'document_start', all_frames: true }],
        }, null, 2),
      },
      {
        filename: 'background.js',
        content: "chrome.runtime.onInstalled.addListener(()=>console.log('Extensio extension installed'));",
      },
      {
        filename: 'content.js',
        content: contentJs,
      },
      {
        filename: 'styles.css',
        content: stylesCss,
      },
      {
        filename: 'popup.html',
        content: `<!doctype html><html><head><meta charset="utf-8"><title>${titleColor} ${titleShape} Image Replacer</title><style>body{width:220px;font-family:Arial,sans-serif;margin:16px;color:#111827}h1{font-size:16px;margin:0 0 8px}</style></head><body><h1>${titleColor} ${titleShape} Image Replacer</h1><p>Images are replaced with ${color.label} ${shape.plural} automatically.</p><script src="popup.js"></script></body></html>`,
      },
      {
        filename: 'popup.js',
        content: "document.addEventListener('DOMContentLoaded',()=>console.log('Extensio popup ready'));",
      },
    ],
  };
}

function extractRequestedShape(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  const shapes = [
    { terms: ['rounded rectangle'], label: 'rounded-rectangle', plural: 'rounded rectangles', forceSquare: false },
    { terms: ['rounded box'], label: 'rounded-box', plural: 'rounded boxes', forceSquare: false },
    { terms: ['rectangle', 'rectangular'], label: 'rectangle', plural: 'rectangles', forceSquare: false },
    { terms: ['circle', 'round'], label: 'circle', plural: 'circles', forceSquare: true },
    { terms: ['box', 'boxes'], label: 'box', plural: 'boxes', forceSquare: false },
    { terms: ['square', 'squares'], label: 'square', plural: 'squares', forceSquare: true },
  ];

  return shapes.find(shape => shape.terms.some(term => lowerPrompt.includes(term)))
    || { label: 'box', plural: 'boxes', forceSquare: false };
}

function adBlockerPayload() {
  const name = 'YouTube Ad Cleaner';
  const description = 'Safely hides YouTube sponsored cards, promoted shelves, companion ads, and visible ad overlays without changing normal video playback.';
  const contentJs = `const STORAGE_KEY = 'youtubeAdCleanupEnabled';
const CLEANED_ATTR = 'data-extensio-ad-cleaned';

const AD_UI_SELECTORS = [
  '.ytp-ad-overlay-container',
  '.ytp-ad-player-overlay',
  '#player-ads',
  'ytd-display-ad-renderer',
  'ytd-promoted-sparkles-web-renderer',
  'ytd-promoted-video-renderer',
  'ytd-ad-slot-renderer',
  'ytd-companion-slot-renderer',
  'ytd-action-companion-ad-renderer',
  'ytd-rich-section-renderer ytd-statement-banner-renderer',
  '[data-purpose="ad-badge"]',
  '[aria-label="Sponsored"]',
  '[aria-label*="Sponsored" i]',
  '[aria-label*="Advertisement" i]',
  'iframe[src*="doubleclick.net" i]',
  'iframe[src*="googlesyndication.com" i]',
  'iframe[src*="googleadservices.com" i]'
];

const SKIP_BUTTON_SELECTORS = [
  '.ytp-ad-skip-button',
  '.ytp-ad-skip-button-modern',
  '.ytp-skip-ad-button',
  '.ytp-ad-skip-button-container button'
];

const CARD_SELECTORS = [
  'ytd-rich-item-renderer',
  'ytd-video-renderer',
  'ytd-compact-video-renderer',
  'ytd-grid-video-renderer',
  'ytd-reel-item-renderer',
  'ytd-rich-section-renderer',
  'ytd-shelf-renderer'
];

const AD_TEXT_RE = /\\b(ad|ads|advertisement|sponsored|sponsor|promoted)\\b/i;
const PROMO_TEXT_RE = /youtube playables|includes paid promotion/i;
let cleanupEnabled = true;
let cleanTimer = 0;

// Keep the content script scoped to YouTube so the extension never touches other sites.
function isYouTubePage() {
  return location.hostname === 'youtube.com' || location.hostname.endsWith('.youtube.com');
}

function textFor(element) {
  if (!element) return '';
  return [
    element.getAttribute('aria-label') || '',
    element.getAttribute('title') || '',
    element.textContent || ''
  ].join(' ');
}

function collectMatches(root, selectors) {
  const selector = selectors.join(',');
  const matches = [];
  if (root?.nodeType === Node.ELEMENT_NODE && root.matches(selector)) {
    matches.push(root);
  }
  root?.querySelectorAll?.(selector).forEach((element) => matches.push(element));
  return matches;
}

function removeElement(element) {
  if (!element || element.hasAttribute(CLEANED_ATTR)) return;
  element.setAttribute(CLEANED_ATTR, 'true');
  element.remove();
}

function removeSponsoredCards(root = document) {
  collectMatches(root, CARD_SELECTORS).forEach((card) => {
    const text = textFor(card);
    const hasAdRenderer = card.querySelector('ytd-ad-slot-renderer,ytd-display-ad-renderer,ytd-promoted-video-renderer,ytd-promoted-sparkles-web-renderer,[data-purpose="ad-badge"]');
    if (hasAdRenderer || AD_TEXT_RE.test(text) || PROMO_TEXT_RE.test(text)) {
      removeElement(card);
    }
  });
}

function clickSkipButtons() {
  if (!cleanupEnabled) return;
  collectMatches(document, SKIP_BUTTON_SELECTORS).forEach((button) => {
    try { button.click(); } catch {}
  });
}

function cleanVideoAdUi() {
  if (!cleanupEnabled) return;
  const player = document.querySelector('.html5-video-player.ad-showing,.html5-video-player[class*="ad-showing"]');
  if (!player) {
    clickSkipButtons();
    return;
  }
  player.querySelectorAll('.ytp-ad-overlay-container,.ytp-ad-player-overlay').forEach(removeElement);
  clickSkipButtons();
}

function cleanPage(root = document){
  if (!cleanupEnabled || !isYouTubePage()) return;
  try {
  // Remove only known ad containers; avoid thumbnails, normal videos, and player internals.
  collectMatches(root, AD_UI_SELECTORS).forEach((element) => {
    const card = element.closest(CARD_SELECTORS.join(','));
    if (card) {
      removeElement(card);
      return;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) removeElement(element);
  });
  collectMatches(root, ['[class*="popup" i]', '[id*="popup" i]', '[class*="overlay" i]', '[id*="overlay" i]']).forEach((element) => {
    if (!AD_TEXT_RE.test(textFor(element))) return;
    removeElement(element);
  });
  removeSponsoredCards(root);
  cleanVideoAdUi();
  if (document.documentElement) document.documentElement.style.overflow = 'auto';
  if (document.body) document.body.style.overflow = 'auto';
  } catch (error) {
    console.warn('Extensio YouTube cleanup skipped one scan:', error);
  }
}

function scheduleClean(root = document) {
  if (!cleanupEnabled) return;
  window.clearTimeout(cleanTimer);
  // Debounce dynamic YouTube updates so route changes do not trigger repeated full scans.
  cleanTimer = window.setTimeout(() => cleanPage(root), 120);
}

function initObserver() {
  const target = document.documentElement || document.body;
  if (!target) return;

  const observer = new MutationObserver((mutations) => {
    if (!cleanupEnabled) return;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        scheduleClean(node);
        return;
      }
    }
  });

  observer.observe(target, { childList: true, subtree: true });
}

async function loadSettings() {
  try {
    const result = await chrome.storage.local.get({ [STORAGE_KEY]: true });
    cleanupEnabled = Boolean(result[STORAGE_KEY]);
  } catch (error) {
    cleanupEnabled = true;
    console.warn('Extensio could not read settings, using enabled mode:', error);
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[STORAGE_KEY]) return;
  cleanupEnabled = Boolean(changes[STORAGE_KEY].newValue);
  if (cleanupEnabled) scheduleClean();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'EXTENSIO_CLEAN_NOW') return false;
  cleanupEnabled = Boolean(message.enabled);
  if (cleanupEnabled) cleanPage();
  sendResponse({ ok: true, enabled: cleanupEnabled });
  return true;
});

async function start() {
  if (!isYouTubePage()) return;
  await loadSettings();
  initObserver();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scheduleClean(), { once: true });
  } else {
    scheduleClean();
  }
  window.setInterval(() => {
    if (cleanupEnabled) cleanVideoAdUi();
  }, 1500);
}

start();`;
  const styleCss = `/* Cleanup is controlled from content.js so the popup toggle can disable it instantly. */`;
  const popupJs = `const STORAGE_KEY = 'youtubeAdCleanupEnabled';
const toggle = document.getElementById('cleanupToggle');
const statusText = document.getElementById('statusText');

function setStatus(enabled) {
  statusText.textContent = enabled ? 'Cleanup enabled on YouTube' : 'Cleanup disabled';
  toggle.checked = enabled;
}

async function notifyActiveTab(enabled) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url || !new URL(tab.url).hostname.endsWith('youtube.com')) return;
    await chrome.tabs.sendMessage(tab.id, { type: 'EXTENSIO_CLEAN_NOW', enabled });
  } catch (error) {
    console.warn('Extensio popup could not notify the current tab:', error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const result = await chrome.storage.local.get({ [STORAGE_KEY]: true });
    setStatus(Boolean(result[STORAGE_KEY]));
  } catch (error) {
    setStatus(true);
  }
});

toggle.addEventListener('change', async () => {
  const enabled = toggle.checked;
  await chrome.storage.local.set({ [STORAGE_KEY]: enabled });
  setStatus(enabled);
  await notifyActiveTab(enabled);
});`;
  const rules = [
    { id: 1, priority: 1, action: { type: 'block' }, condition: { urlFilter: '||doubleclick.net^', resourceTypes: ['script', 'xmlhttprequest', 'sub_frame', 'image'] } },
    { id: 2, priority: 1, action: { type: 'block' }, condition: { urlFilter: '||googlesyndication.com^', resourceTypes: ['script', 'xmlhttprequest', 'sub_frame', 'image'] } },
    { id: 3, priority: 1, action: { type: 'block' }, condition: { urlFilter: '||googleadservices.com^', resourceTypes: ['script', 'xmlhttprequest', 'sub_frame', 'image'] } },
  ];

  return {
    name,
    description,
    files: [
      {
        filename: 'manifest.json',
        content: JSON.stringify({
          manifest_version: 3,
          name,
          version: '1.0.0',
          description,
          permissions: ['declarativeNetRequest', 'storage', 'tabs'],
          host_permissions: [
            '*://*.youtube.com/*',
            '*://*.doubleclick.net/*',
            '*://*.googlesyndication.com/*',
            '*://*.googleadservices.com/*',
          ],
          declarative_net_request: {
            rule_resources: [
              { id: 'youtube_ad_rules', enabled: true, path: 'rules.json' },
            ],
          },
          action: { default_popup: 'popup.html' },
          content_scripts: [
            {
              matches: ['*://*.youtube.com/*'],
              js: ['content.js'],
              css: ['styles.css'],
              run_at: 'document_idle',
            },
          ],
        }, null, 2),
      },
      { filename: 'background.js', content: "chrome.runtime.onInstalled.addListener(()=>console.log('YouTube Ad Cleaner installed'));" },
      { filename: 'content.js', content: contentJs },
      { filename: 'styles.css', content: styleCss },
      { filename: 'rules.json', content: JSON.stringify(rules, null, 2) },
      {
        filename: 'popup.html',
        content: `<!doctype html><html><head><meta charset="utf-8"><title>${name}</title><style>body{width:280px;font-family:Arial,sans-serif;margin:0;color:#111827;background:#f8fafc}.wrap{padding:16px}h1{font-size:16px;margin:0 0 8px}.row{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:14px;padding:12px;border:1px solid #dbe4ef;border-radius:12px;background:white}p{font-size:13px;line-height:1.45;color:#475569}.switch{position:relative;width:46px;height:26px}.switch input{opacity:0;width:0;height:0}.slider{position:absolute;cursor:pointer;inset:0;background:#cbd5e1;border-radius:999px;transition:.2s}.slider:before{content:"";position:absolute;height:20px;width:20px;left:3px;top:3px;background:white;border-radius:50%;transition:.2s;box-shadow:0 1px 3px #0003}input:checked+.slider{background:#10b981}input:checked+.slider:before{transform:translateX(20px)}#statusText{font-weight:700;color:#0f172a}</style></head><body><main class="wrap"><h1>${name}</h1><p>Clean YouTube sidebar ads, banners, sponsored cards, and visible overlays without changing video playback.</p><section class="row"><span id="statusText">Loading...</span><label class="switch" aria-label="Enable YouTube ad cleanup"><input id="cleanupToggle" type="checkbox"><span class="slider"></span></label></section></main><script src="popup.js"></script></body></html>`,
      },
      { filename: 'popup.js', content: popupJs },
    ],
  };
}

function darkModePayload() {
  return extensionPayload({
    name: 'Smart Dark Mode',
    description: 'Applies a readable dark theme to webpages.',
    contentJs: `function applyDarkMode(){
  document.documentElement.classList.add('extensio-dark-mode');
}
applyDarkMode();`,
    styleCss: `html.extensio-dark-mode,html.extensio-dark-mode body{background:#0f172a!important;color:#e5e7eb!important}
html.extensio-dark-mode *{background-color:transparent!important;color:inherit!important;border-color:#334155!important}
html.extensio-dark-mode a{color:#38bdf8!important}
html.extensio-dark-mode img,html.extensio-dark-mode video{filter:brightness(.82) contrast(1.08)!important}`,
    popupMessage: 'Dark mode is active on the current page.',
  });
}

function linkHighlighterPayload(userPrompt = '') {
  const color = extractRequestedColor(userPrompt);
  return extensionPayload({
    name: 'Link Highlighter',
    description: `Highlights all webpage links in ${color.label}.`,
    contentJs: `function highlightLinks(){
  const links = document.querySelectorAll('a[href]');
  links.forEach((link) => {
    link.classList.add('extensio-highlighted-link');
    link.dataset.extensioHref = link.href;
  });
  chrome.runtime?.sendMessage?.({ type: 'LINK_COUNT', count: links.length });
}
highlightLinks();
new MutationObserver(highlightLinks).observe(document.documentElement,{childList:true,subtree:true});`,
    styleCss: `.extensio-highlighted-link{outline:2px solid ${color.hex}!important;background:${color.hex}22!important;border-radius:3px!important}`,
    popupMessage: `Links are highlighted in ${color.label}.`,
  });
}

function readingTimePayload() {
  return extensionPayload({
    name: 'Reading Time Estimator',
    description: 'Shows an estimated reading time for the current page.',
    contentJs: `function estimateReadingTime(){
  const text = document.body.innerText || '';
  const words = text.trim().split(/\\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 220));
  let badge = document.getElementById('extensio-reading-time');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'extensio-reading-time';
    document.body.appendChild(badge);
  }
  badge.textContent = minutes + ' min read';
}
estimateReadingTime();`,
    styleCss: `#extensio-reading-time{position:fixed;top:16px;right:16px;z-index:2147483647;background:#111827;color:#fff;padding:10px 12px;border-radius:8px;font:600 13px Arial,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.25)}`,
    popupMessage: 'Reading time is shown on the page.',
  });
}

function genericHelperPayload(userPrompt = '') {
  const safePrompt = userPrompt.replace(/[<>&]/g, '');
  return extensionPayload({
    name: 'Custom Page Helper',
    description: 'Adds a small helper badge for the requested browser task.',
    contentJs: `const badge = document.createElement('div');
badge.id = 'extensio-custom-helper';
badge.textContent = 'Extensio helper active';
document.body.appendChild(badge);`,
    styleCss: `#extensio-custom-helper{position:fixed;bottom:16px;right:16px;z-index:2147483647;background:#111827;color:#fff;padding:10px 12px;border-radius:8px;font:600 13px Arial,sans-serif}`,
    popupMessage: safePrompt || 'Custom helper extension is active.',
  });
}

function extensionPayload({ name, description, contentJs, styleCss, popupMessage }) {
  const files = [
    {
      filename: 'manifest.json',
      content: JSON.stringify({
        manifest_version: 3,
        name,
        version: '1.0.0',
        description,
        action: { default_popup: 'popup.html' },
        content_scripts: [{ matches: ['<all_urls>'], js: ['content.js'], css: ['styles.css'], run_at: 'document_idle' }],
      }, null, 2),
    },
    {
      filename: 'background.js',
      content: "chrome.runtime.onInstalled.addListener(()=>console.log('Extensio extension installed'));",
    },
    { filename: 'content.js', content: contentJs },
    { filename: 'styles.css', content: styleCss || '/* No styles required. */' },
    {
      filename: 'popup.html',
      content: `<!doctype html><html><head><meta charset="utf-8"><title>${name}</title><style>body{width:240px;font-family:Arial,sans-serif;margin:16px;color:#111827}h1{font-size:16px;margin:0 0 8px}p{font-size:13px;line-height:1.45}</style></head><body><h1>${name}</h1><p>${popupMessage}</p><script src="popup.js"></script></body></html>`,
    },
    { filename: 'popup.js', content: "document.addEventListener('DOMContentLoaded',()=>console.log('Extensio popup ready'));" },
  ];

  return { name, description, files };
}

function extractRequestedColor(prompt) {
  const colors = [
    { label: 'black', hex: '#000000', border: '#111827' },
    { label: 'red', hex: '#dc2626', border: '#991b1b' },
    { label: 'blue', hex: '#2563eb', border: '#1e40af' },
    { label: 'green', hex: '#16a34a', border: '#166534' },
    { label: 'yellow', hex: '#facc15', border: '#ca8a04' },
    { label: 'purple', hex: '#9333ea', border: '#6b21a8' },
    { label: 'pink', hex: '#ec4899', border: '#be185d' },
    { label: 'orange', hex: '#f97316', border: '#c2410c' },
    { label: 'white', hex: '#ffffff', border: '#cbd5e1' },
    { label: 'gray', hex: '#6b7280', border: '#374151' },
    { label: 'grey', hex: '#6b7280', border: '#374151' },
  ];

  const lowerPrompt = prompt.toLowerCase();
  const found = colors.find(color => lowerPrompt.includes(color.label));
  if (!found) return colors[1];
  return found.label === 'grey' ? { ...found, label: 'gray' } : found;
}
