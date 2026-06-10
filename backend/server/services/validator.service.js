const allowedExtensions = new Set(['.json', '.js', '.html', '.css', '.png', '.svg', '.txt']);
const requiredFilenames = ['manifest.json', 'background.js', 'content.js', 'popup.html', 'popup.js'];

export function normalizeFiles(aiPayload) {
  if (!aiPayload || !Array.isArray(aiPayload.files)) {
    const error = new Error('AI response must include a files array');
    error.status = 422;
    throw error;
  }

  const files = aiPayload.files.map(file => ({
    filename: file.filename || file.name,
    content: String(file.content ?? ''),
  }));

  const legacyStyle = files.find(file => file.filename === 'style.css');
  const modernStyle = files.find(file => file.filename === 'styles.css');
  if (legacyStyle && !modernStyle) legacyStyle.filename = 'styles.css';

  const manifestFile = files.find(file => file.filename === 'manifest.json');
  if (manifestFile) {
    try {
      const manifest = JSON.parse(manifestFile.content);
      for (const key of ['permissions', 'host_permissions', 'optional_permissions', 'optional_host_permissions']) {
        if (typeof manifest[key] === 'string') manifest[key] = [manifest[key]];
      }
      for (const script of manifest.content_scripts || []) {
        for (const key of ['matches', 'exclude_matches', 'js', 'css']) {
          if (typeof script[key] === 'string') script[key] = [script[key]];
        }
        if (Array.isArray(script.css)) {
          script.css = script.css.map(filename => filename === 'style.css' ? 'styles.css' : filename);
        }
      }
      manifestFile.content = JSON.stringify(manifest, null, 2);
    } catch {
      // The validator will return the precise manifest JSON error later.
    }
  }

  return files;
}

export function validateExtensionFiles(files) {
  if (!files.length) throwValidation('No files were generated');

  for (const file of files) {
    if (!file.filename || file.filename.includes('..') || file.filename.startsWith('/') || file.filename.startsWith('\\')) {
      throwValidation(`Invalid filename: ${file.filename}`);
    }

    const ext = file.filename.slice(file.filename.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.has(ext)) throwValidation(`Unsupported file type: ${file.filename}`);
    if (!file.content.trim()) throwValidation(`${file.filename} is empty`);
  }

  const manifestFile = files.find(file => file.filename === 'manifest.json');
  if (!manifestFile) throwValidation('manifest.json is required');

  for (const filename of requiredFilenames) {
    if (!files.some(file => file.filename === filename)) {
      throwValidation(`${filename} is required`);
    }
  }
  if (!files.some(file => file.filename === 'styles.css' || file.filename === 'style.css')) {
    throwValidation('styles.css is required');
  }

  let manifest;
  try {
    manifest = JSON.parse(manifestFile.content);
  } catch (error) {
    throwValidation(`manifest.json is not valid JSON: ${error.message}`);
  }

  if (manifest.manifest_version !== 3) throwValidation('manifest.json must use manifest_version: 3');
  if (!manifest.name || !manifest.version) throwValidation('manifest.json must include name and version');
  for (const key of ['permissions', 'host_permissions', 'optional_permissions', 'optional_host_permissions']) {
    if (manifest[key] !== undefined && !Array.isArray(manifest[key])) {
      throwValidation(`manifest.json ${key} must be an array`);
    }
  }

  const referenced = new Set();
  if (manifest.action?.default_popup) referenced.add(manifest.action.default_popup);
  if (manifest.background?.service_worker) referenced.add(manifest.background.service_worker);
  if (manifest.content_scripts !== undefined && !Array.isArray(manifest.content_scripts)) {
    throwValidation('manifest.json content_scripts must be an array');
  }
  for (const [index, script] of (manifest.content_scripts || []).entries()) {
    if (!script || typeof script !== 'object' || Array.isArray(script)) {
      throwValidation(`manifest.json content_scripts[${index}] must be an object`);
    }
    if (!Array.isArray(script.matches) || !script.matches.every(item => typeof item === 'string')) {
      throwValidation(`manifest.json content_scripts[${index}].matches must be an array of strings`);
    }
    for (const key of ['exclude_matches', 'js', 'css']) {
      if (script[key] !== undefined && (!Array.isArray(script[key]) || !script[key].every(item => typeof item === 'string'))) {
        throwValidation(`manifest.json content_scripts[${index}].${key} must be an array of strings`);
      }
    }
    for (const js of script.js || []) referenced.add(js);
    for (const css of script.css || []) referenced.add(css);
  }

  for (const filename of referenced) {
    if (!files.some(file => file.filename === filename)) {
      throwValidation(`manifest.json references missing file: ${filename}`);
    }
  }

  return manifest;
}

function throwValidation(message) {
  const error = new Error(message);
  error.status = 422;
  throw error;
}
