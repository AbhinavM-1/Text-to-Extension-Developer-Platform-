import OpenAI from 'openai';
import { EXTENSION_SYSTEM_PROMPT } from './prompt.service.js';

export async function generateExtensionJson(userPrompt) {
  if (!process.env.OPENAI_API_KEY) {
    return demoPayload();
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
      console.warn('OpenAI quota/rate limit unavailable, using demo extension fallback.');
      return demoPayload();
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

function demoPayload() {
  return {
    name: 'Red Image Replacer',
    description: 'Replaces page images with red squares.',
    files: [
      {
        filename: 'manifest.json',
        content: JSON.stringify({
          manifest_version: 3,
          name: 'Red Image Replacer',
          version: '1.0.0',
          description: 'Replaces page images with red squares.',
          action: { default_popup: 'popup.html' },
          content_scripts: [{ matches: ['<all_urls>'], js: ['content.js'], css: ['style.css'], run_at: 'document_idle' }],
        }, null, 2),
      },
      {
        filename: 'content.js',
        content: "function replaceImages(){document.querySelectorAll('img').forEach((img)=>{const box=document.createElement('div');box.className='extensio-red-square';box.style.width=(img.width||160)+'px';box.style.height=(img.height||120)+'px';img.replaceWith(box);});}replaceImages();new MutationObserver(replaceImages).observe(document.documentElement,{childList:true,subtree:true});",
      },
      {
        filename: 'style.css',
        content: '.extensio-red-square{display:inline-block;background:#dc2626;border:2px solid #991b1b;box-sizing:border-box;}',
      },
      {
        filename: 'popup.html',
        content: '<!doctype html><html><head><meta charset="utf-8"><title>Red Image Replacer</title><style>body{width:220px;font-family:Arial,sans-serif;margin:16px;color:#111827}h1{font-size:16px;margin:0 0 8px}</style></head><body><h1>Red Image Replacer</h1><p>Images on this page are replaced automatically.</p><script src="popup.js"></script></body></html>',
      },
      {
        filename: 'popup.js',
        content: "document.addEventListener('DOMContentLoaded',()=>console.log('Extensio popup ready'));",
      },
    ],
  };
}
