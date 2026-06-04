import { Extension } from '../models/Extension.js';
import { buildEditPrompt, buildGenerationPrompt } from '../services/prompt.service.js';
import { generateExtensionJson, localTemplatePayload } from '../services/ai.service.js';
import { normalizeFiles, validateExtensionFiles } from '../services/validator.service.js';
import { scanGeneratedFiles } from '../services/security.service.js';
import { packageExtension } from '../services/zip.service.js';

export async function listExtensions(req, res, next) {
  try {
    const query = { owner: req.user._id };
    if (req.query.search) query.$text = { $search: req.query.search };
    const extensions = await Extension.find(query).sort({ updatedAt: -1 });
    res.json(extensions);
  } catch (error) {
    next(error);
  }
}

export async function generateExtension(req, res, next) {
  try {
    const { aiPayload, files, manifest, securityScan } = await buildSafeGeneratedExtension(req.body.prompt);

    const extension = await Extension.create({
      owner: req.user._id,
      name: aiPayload.name || manifest.name,
      description: aiPayload.description || manifest.description || '',
      prompt: req.body.prompt,
      files,
      versionHistory: [{ version: 1, prompt: req.body.prompt, files, securityScan }],
    });

    const zip = await packageExtension({ extensionId: extension._id, version: 1, name: extension.name, files });
    extension.zipPath = zip.zipPath;
    extension.zipUrl = zip.zipUrl;
    extension.versionHistory[0].zipPath = zip.zipPath;
    extension.versionHistory[0].zipUrl = zip.zipUrl;
    await extension.save();

    res.status(201).json(extension);
  } catch (error) {
    next(error);
  }
}

async function buildSafeGeneratedExtension(prompt) {
  let lastError;

  if (isYoutubeAdBlockingPrompt(prompt)) {
    return validateGeneratedPayload(localTemplatePayload(prompt), prompt);
  }

  try {
    return validateGeneratedPayload(await generateExtensionJson(buildGenerationPrompt(prompt)), prompt);
  } catch (error) {
    lastError = error;
    console.warn(`Groq generation needs repair: ${error.message}`);
  }

  try {
    return validateGeneratedPayload(await generateExtensionJson(buildRepairPrompt(prompt, lastError)), prompt);
  } catch (error) {
    lastError = error;
    console.warn(`Groq repair failed: ${error.message}`);
  }

  if (isAdBlockingPrompt(prompt)) {
    return validateGeneratedPayload(localTemplatePayload(prompt), prompt);
  }

  lastError.status = lastError.status || 422;
  throw lastError;
}

function isAdBlockingPrompt(prompt = '') {
  return /\b(block\w*|remove\w*|hid\w*|clean\w*|stop\w*)\b/i.test(prompt)
    && /\b(ad|ads|advertisement|advertisements|sponsor|sponsored|promoted|popup|pop-up)\b/i.test(prompt);
}

function isYoutubeAdBlockingPrompt(prompt = '') {
  return isAdBlockingPrompt(prompt) && /\b(youtube|yt|shorts|video|videos)\b/i.test(prompt);
}

function buildRepairPrompt(originalPrompt, error) {
  return `The previous Chrome extension generation failed validation.

Original user request:
${originalPrompt}

Validation/security error:
${error.message}

Regenerate the complete extension from scratch. Preserve the user's exact requested behavior and wording. For example, if the user asks for "red box", use "red box" and "red boxes", not "red square".
If the user asks to block ads, do not hide all images, thumbnails, videos, or normal page content. Target only actual advertisements, sponsored/promoted blocks, ad overlays, and popup ad containers.

Return JSON only in the required Extensio.ai files format.`;
}

function validateGeneratedPayload(aiPayload, prompt = '') {
  const files = normalizeFiles(aiPayload);
  const manifest = validateExtensionFiles(files);
  validatePromptIntent(prompt, files, manifest);
  const securityScan = scanGeneratedFiles(files);
  if (securityScan.findings.some(item => item.severity === 'critical')) {
    throw new Error('Generated code failed malicious-code detection');
  }
  return { aiPayload, files, manifest, securityScan };
}

function validatePromptIntent(prompt, files, manifest) {
  const lowerPrompt = prompt.toLowerCase();
  const wantsAdBlocking = /\b(ad|ads|advertisement|advertisements|sponsor|sponsored|promoted|popup|pop-up)\b/.test(lowerPrompt);
  if (!wantsAdBlocking) return;

  const combined = files
    .filter(file => file.filename.endsWith('.js') || file.filename.endsWith('.css') || file.filename.endsWith('.json'))
    .map(file => file.content)
    .join('\n')
    .toLowerCase();

  const broadImageBlockingPatterns = [
    /queryselectorall\s*\(\s*['"`]img['"`]\s*\)/,
    /queryselectorall\s*\(\s*['"`]img\s*,/,
    /queryselectorall\s*\([^)]*['"`][^'"`]*\b(img|image|thumbnail|ytd-thumbnail)\b[^'"`]*['"`][^)]*\)/,
    /getelementsbytagname\s*\(\s*['"`]img['"`]\s*\)/,
    /\bdocument\.images\b/,
    /\bdocument\.queryselector\s*\(\s*['"`]img['"`]\s*\)/,
    /\bfor\s*\([^)]*\bimg\b[^)]*\)/,
    /\bfor\s*\([^)]*\bimage\b[^)]*\)/,
    /\bfunction\s+\w*ad\w*\s*\(\s*(img|image)\s*\)/,
    /\bfunction\s+\w*replace\w*\s*\(\s*(img|image)\s*\)/,
    /replacechild\s*\([^,]+,\s*(img|image)\s*\)/,
    /\bimg\s*\{[^}]*display\s*:\s*none/,
    /\bimg\s*\{[^}]*visibility\s*:\s*hidden/,
    /\.remove\s*\(\s*\)[\s\S]{0,80}\bimg\b/,
    /\.remove\s*\(\s*\)[\s\S]{0,80}\bimage\b/,
    /replacewith\s*\([^)]*\)[\s\S]{0,120}\b(img|image|thumbnail)\b/,
    /\b(img|image|thumbnail)\b[\s\S]{0,160}\breplacewith\s*\(/,
    /\b(img|image|thumbnail)\b[\s\S]{0,160}\breplacechild\s*\(/,
  ];

  if (broadImageBlockingPatterns.some(pattern => pattern.test(combined))) {
    const error = new Error('Ad-blocking extension incorrectly targets images/thumbnails instead of ad elements');
    error.status = 422;
    throw error;
  }

  const hasAdTarget = /\b(ad-|ads|advertis|sponsor|sponsored|promoted|popup|overlay|doubleclick|googlesyndication|pagead|ytp-ad|player-ads|ytd-promoted|ytd-display-ad|ytd-ad-slot)\b/.test(combined);
  if (!hasAdTarget) {
    const error = new Error('Ad-blocking extension must target actual ad/sponsored/popup elements');
    error.status = 422;
    throw error;
  }

  if (lowerPrompt.includes('youtube')) {
    const manifestText = JSON.stringify(manifest).toLowerCase();
    const targetsYoutube = manifestText.includes('youtube.com') || manifestText.includes('<all_urls>');
    const hasYoutubeAdSelectors = /\b(ytp-ad|player-ads|ytd-promoted|ytd-display-ad|ytd-ad-slot|ytd-companion|ytd-banner-promo|ytd-rich-section-renderer)\b/.test(combined);
    if (!targetsYoutube || !hasYoutubeAdSelectors) {
      const error = new Error('YouTube ad-blocking extension must include safe YouTube ad selectors and preserve thumbnails');
      error.status = 422;
      throw error;
    }
  }
}

export async function getExtension(req, res, next) {
  try {
    const extension = await Extension.findOne({ _id: req.params.id, owner: req.user._id });
    if (!extension) return res.status(404).json({ message: 'Extension not found' });
    res.json(extension);
  } catch (error) {
    next(error);
  }
}

export async function editExtension(req, res, next) {
  try {
    const extension = await Extension.findOne({ _id: req.params.id, owner: req.user._id });
    if (!extension) return res.status(404).json({ message: 'Extension not found' });

    const aiPayload = await generateExtensionJson(buildEditPrompt({ editPrompt: req.body.editPrompt, files: extension.files }));
    const files = normalizeFiles(aiPayload);
    const manifest = validateExtensionFiles(files);
    const securityScan = scanGeneratedFiles(files);
    if (securityScan.findings.some(item => item.severity === 'critical')) {
      return res.status(422).json({ message: 'Edited code failed malicious-code detection', securityScan });
    }

    const version = extension.versionHistory.length + 1;
    const zip = await packageExtension({ extensionId: extension._id, version, name: aiPayload.name || manifest.name, files });

    extension.name = aiPayload.name || extension.name;
    extension.description = aiPayload.description || extension.description;
    extension.files = files;
    extension.zipPath = zip.zipPath;
    extension.zipUrl = zip.zipUrl;
    extension.versionHistory.push({
      version,
      prompt: req.body.editPrompt,
      editRequest: true,
      files,
      zipPath: zip.zipPath,
      zipUrl: zip.zipUrl,
      securityScan,
    });
    await extension.save();

    res.json(extension);
  } catch (error) {
    next(error);
  }
}

export async function deleteExtension(req, res, next) {
  try {
    const deleted = await Extension.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!deleted) return res.status(404).json({ message: 'Extension not found' });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

export async function scanExtension(req, res, next) {
  try {
    const extension = await Extension.findOne({ _id: req.params.id, owner: req.user._id });
    if (!extension) return res.status(404).json({ message: 'Extension not found' });
    res.json(scanGeneratedFiles(extension.files));
  } catch (error) {
    next(error);
  }
}
