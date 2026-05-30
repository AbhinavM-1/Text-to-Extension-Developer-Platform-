import { Extension } from '../models/Extension.js';
import { buildEditPrompt, buildGenerationPrompt } from '../services/prompt.service.js';
import { generateExtensionJson } from '../services/ai.service.js';
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
    const aiPayload = await generateExtensionJson(buildGenerationPrompt(req.body.prompt));
    const files = normalizeFiles(aiPayload);
    const manifest = validateExtensionFiles(files);
    const securityScan = scanGeneratedFiles(files);
    if (securityScan.findings.some(item => item.severity === 'critical')) {
      return res.status(422).json({ message: 'Generated code failed malicious-code detection', securityScan });
    }

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
