import { Extension } from '../models/Extension.js';
import { buildEditPrompt, buildGenerationPrompt } from '../services/prompt.service.js';
import { generateExtensionJson, localTemplatePayload } from '../services/ai.service.js';
import { normalizeFiles, validateExtensionFiles } from '../services/validator.service.js';
import { scanGeneratedFiles } from '../services/security.service.js';
import { packageExtension } from '../services/zip.service.js';
import { recordSuccessfulGeneration } from '../middleware/subscription.middleware.js';
import { recordActivity } from '../services/activity.service.js';

const MAX_PAGE_SIZE = 50;

export async function listExtensions(req, res, next) {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 25, 1), MAX_PAGE_SIZE);
    const query = { owner: req.user._id, deletedAt: null };
    if (req.query.search) query.$text = { $search: String(req.query.search).trim() };

    const [items, total] = await Promise.all([
      Extension.find(query)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Extension.countDocuments(query),
    ]);

    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
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
    await recordSuccessfulGeneration(req);
    await recordActivity({
      user: req.user._id,
      type: 'extension.generated',
      title: extension.name,
      description: 'Generated a new Chrome extension ZIP',
      metadata: { extensionId: extension._id, version: 1 },
    });

    res.status(201).json(extension);
  } catch (error) {
    next(error);
  }
}

async function buildSafeGeneratedExtension(prompt) {
  let lastError;

  if (shouldUseLocalTemplate(prompt)) {
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

function shouldUseLocalTemplate(prompt = '') {
  return isYoutubeAdBlockingPrompt(prompt)
    || isImageReplacementPrompt(prompt)
    || isLinkHighlighterPrompt(prompt)
    || isDarkModePrompt(prompt)
    || isReadingTimePrompt(prompt);
}

function isImageReplacementPrompt(prompt = '') {
  return /\b(image|images|img|imgs|photo|photos|picture|pictures)\b/i.test(prompt)
    && /\b(replace|replaces|replacing|block|blocks|blocking|hide|hides|hiding|remove|removes|removing)\b/i.test(prompt);
}

function isLinkHighlighterPrompt(prompt = '') {
  return /\b(highlight|mark|color|colour)\b/i.test(prompt)
    && /\b(link|links|url|urls|anchor|anchors)\b/i.test(prompt);
}

function isDarkModePrompt(prompt = '') {
  return /\b(dark\s*mode|darkmode|night\s*mode)\b/i.test(prompt);
}

function isReadingTimePrompt(prompt = '') {
  return /\b(reading\s*time|read\s*time|estimate\s*reading)\b/i.test(prompt);
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
    const extension = await Extension.findOne({ _id: req.params.id, owner: req.user._id, deletedAt: null });
    if (!extension) return res.status(404).json({ message: 'Extension not found' });
    res.json(extension);
  } catch (error) {
    next(error);
  }
}

export async function editExtension(req, res, next) {
  try {
    const extension = await Extension.findOne({ _id: req.params.id, owner: req.user._id, deletedAt: null });
    if (!extension) return res.status(404).json({ message: 'Extension not found' });

    const { aiPayload, files, manifest, securityScan } = await buildSafeEditedExtension({
      editPrompt: req.body.editPrompt,
      files: extension.files,
    });

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
    await recordSuccessfulGeneration(req);
    await recordActivity({
      user: req.user._id,
      type: 'extension.edited',
      title: extension.name,
      description: 'Applied an edit request and created a new version',
      metadata: { extensionId: extension._id, version, prompt: req.body.editPrompt },
    });

    res.json(extension);
  } catch (error) {
    next(error);
  }
}

export async function deleteExtension(req, res, next) {
  try {
    const deleted = await Extension.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true },
    );
    if (!deleted) return res.status(404).json({ message: 'Extension not found' });
    await recordActivity({
      user: req.user._id,
      type: 'extension.deleted',
      title: deleted.name,
      description: 'Deleted an extension project',
      metadata: { extensionId: deleted._id },
    });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

export async function duplicateExtension(req, res, next) {
  try {
    const source = await Extension.findOne({ _id: req.params.id, owner: req.user._id, deletedAt: null });
    if (!source) return res.status(404).json({ message: 'Extension not found' });

    const extension = await Extension.create({
      owner: req.user._id,
      name: `${source.name} Copy`,
      description: source.description,
      prompt: source.prompt,
      files: source.files,
      versionHistory: [{
        version: 1,
        prompt: `Duplicated from ${source.name}`,
        files: source.files,
        securityScan: source.versionHistory.at(-1)?.securityScan,
      }],
    });

    const zip = await packageExtension({ extensionId: extension._id, version: 1, name: extension.name, files: extension.files });
    extension.zipPath = zip.zipPath;
    extension.zipUrl = zip.zipUrl;
    extension.versionHistory[0].zipPath = zip.zipPath;
    extension.versionHistory[0].zipUrl = zip.zipUrl;
    await extension.save();
    await recordSuccessfulGeneration(req);
    await recordActivity({
      user: req.user._id,
      type: 'extension.duplicated',
      title: extension.name,
      description: `Duplicated from ${source.name}`,
      metadata: { extensionId: extension._id, sourceExtensionId: source._id },
    });

    res.status(201).json(extension);
  } catch (error) {
    next(error);
  }
}

export async function scanExtension(req, res, next) {
  try {
    const extension = await Extension.findOne({ _id: req.params.id, owner: req.user._id, deletedAt: null });
    if (!extension) return res.status(404).json({ message: 'Extension not found' });
    const scan = scanGeneratedFiles(extension.files);
    await recordActivity({
      user: req.user._id,
      type: 'extension.scanned',
      title: extension.name,
      description: 'Ran a generated-code security scan',
      metadata: { extensionId: extension._id, score: scan.score, findings: scan.findings.length },
    });
    res.json(scan);
  } catch (error) {
    next(error);
  }
}

async function buildSafeEditedExtension({ editPrompt, files }) {
  let lastError;

  try {
    const aiPayload = await generateExtensionJson(buildEditPrompt({ editPrompt, files }));
    const normalizedFiles = normalizeFiles(aiPayload);
    const manifest = validateExtensionFiles(normalizedFiles);
    const securityScan = scanGeneratedFiles(normalizedFiles);
    if (securityScan.findings.some(item => item.severity === 'critical')) {
      const error = new Error('Edited code failed malicious-code detection');
      error.status = 422;
      error.securityScan = securityScan;
      throw error;
    }
    return { aiPayload, files: normalizedFiles, manifest, securityScan };
  } catch (error) {
    lastError = error;
    console.warn(`Groq edit needs repair: ${error.message}`);
  }

  const repairPayload = await generateExtensionJson(`The previous edit failed validation.

Edit request:
${editPrompt}

Validation/security error:
${lastError.message}

Current extension files:
${JSON.stringify(files)}

Regenerate the complete extension files from scratch as valid Extensio.ai JSON. Preserve the edit request exactly. Return JSON only.`);
  const normalizedFiles = normalizeFiles(repairPayload);
  const manifest = validateExtensionFiles(normalizedFiles);
  const securityScan = scanGeneratedFiles(normalizedFiles);
  if (securityScan.findings.some(item => item.severity === 'critical')) {
    const error = new Error('Edited code failed malicious-code detection');
    error.status = 422;
    error.securityScan = securityScan;
    throw error;
  }
  return { aiPayload: repairPayload, files: normalizedFiles, manifest, securityScan };
}
