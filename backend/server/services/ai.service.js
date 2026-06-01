import OpenAI from 'openai';
import { EXTENSION_SYSTEM_PROMPT } from './prompt.service.js';

export async function generateExtensionJson(userPrompt) {
  if (!process.env.OPENAI_API_KEY) {
    return localTemplatePayload(userPrompt);
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.2,
      messages: [
        { role: 'system', content: EXTENSION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    if (isRecoverableOpenAIQuotaError(error)) {
      console.warn('OpenAI quota/rate limit unavailable, using local template fallback.');
      return localTemplatePayload(userPrompt);
    }
    throw error;
  }
}

function isRecoverableOpenAIQuotaError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.status === 429
    || error?.code === 'insufficient_quota'
    || error?.code === 'rate_limit_exceeded'
    || message.includes('quota')
    || message.includes('rate limit');
}

function localTemplatePayload(userPrompt = '') {
  const prompt = userPrompt.toLowerCase();
  if (prompt.includes('dark mode') || prompt.includes('darkmode')) return darkModePayload();
  if (prompt.includes('highlight') && prompt.includes('link')) return linkHighlighterPayload(userPrompt);
  if (prompt.includes('read') && prompt.includes('time')) return readingTimePayload();
  if (prompt.includes('block') && (prompt.includes('ad') || prompt.includes('popup'))) return adBlockerPayload();
  if (prompt.includes('image') || prompt.includes('img') || prompt.includes('photo')) return imageSquarePayload(userPrompt);
  return genericHelperPayload(userPrompt);
}

function imageSquarePayload(userPrompt = '') {
  const color = extractRequestedColor(userPrompt);
  const titleColor = color.label.charAt(0).toUpperCase() + color.label.slice(1);

  return {
    name: `${titleColor} Image Replacer`,
    description: `Replaces page images with ${color.label} squares.`,
    files: [
      {
        filename: 'manifest.json',
        content: JSON.stringify({
          manifest_version: 3,
          name: `${titleColor} Image Replacer`,
          version: '1.0.0',
          description: `Replaces page images with ${color.label} squares.`,
          action: { default_popup: 'popup.html' },
          content_scripts: [{ matches: ['<all_urls>'], js: ['content.js'], css: ['style.css'], run_at: 'document_idle' }],
        }, null, 2),
      },
      {
        filename: 'content.js',
        content: "function replaceImages(){document.querySelectorAll('img').forEach((img)=>{const box=document.createElement('div');box.className='extensio-image-square';box.style.width=(img.width||160)+'px';box.style.height=(img.height||120)+'px';img.replaceWith(box);});}replaceImages();new MutationObserver(replaceImages).observe(document.documentElement,{childList:true,subtree:true});",
      },
      {
        filename: 'style.css',
        content: `.extensio-image-square{display:inline-block;background:${color.hex};border:2px solid ${color.border};box-sizing:border-box;}`,
      },
      {
        filename: 'popup.html',
        content: `<!doctype html><html><head><meta charset="utf-8"><title>${titleColor} Image Replacer</title><style>body{width:220px;font-family:Arial,sans-serif;margin:16px;color:#111827}h1{font-size:16px;margin:0 0 8px}</style></head><body><h1>${titleColor} Image Replacer</h1><p>Images are replaced with ${color.label} squares automatically.</p><script src="popup.js"></script></body></html>`,
      },
      {
        filename: 'popup.js',
        content: "document.addEventListener('DOMContentLoaded',()=>console.log('Extensio popup ready'));",
      },
    ],
  };
}

function adBlockerPayload() {
  return extensionPayload({
    name: 'Ad And Popup Cleaner',
    description: 'Hides common ads, popups, overlays, and sponsored blocks on webpages.',
    contentJs: `function cleanPage(){
  const selectors = [
    '[id*="ad" i]', '[class*="ad" i]', '[aria-label*="ad" i]',
    '[id*="sponsor" i]', '[class*="sponsor" i]',
    '[id*="popup" i]', '[class*="popup" i]',
    '[id*="modal" i]', '[class*="modal" i]',
    'iframe[src*="ads" i]', 'iframe[src*="doubleclick" i]'
  ];
  document.querySelectorAll(selectors.join(',')).forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width > 80 || rect.height > 50) element.remove();
  });
  document.documentElement.style.overflow = 'auto';
  document.body.style.overflow = 'auto';
}
cleanPage();
new MutationObserver(cleanPage).observe(document.documentElement,{childList:true,subtree:true});`,
    styleCss: '',
    popupMessage: 'Ads, popups, and sponsored blocks are cleaned automatically.',
  });
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
        content_scripts: [{ matches: ['<all_urls>'], js: ['content.js'], css: ['style.css'], run_at: 'document_idle' }],
      }, null, 2),
    },
    { filename: 'content.js', content: contentJs },
    { filename: 'style.css', content: styleCss || '/* No styles required. */' },
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
