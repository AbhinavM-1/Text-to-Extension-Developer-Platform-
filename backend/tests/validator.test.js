import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFiles, validateExtensionFiles } from '../server/services/validator.service.js';
import { scanGeneratedFiles } from '../server/services/security.service.js';

function basePayload(cssFilename = 'styles.css') {
  return {
    files: [
      {
        filename: 'manifest.json',
        content: JSON.stringify({
          manifest_version: 3,
          name: 'Test Extension',
          version: '1.0.0',
          action: { default_popup: 'popup.html' },
          background: { service_worker: 'background.js' },
          content_scripts: [{ matches: ['<all_urls>'], js: ['content.js'], css: [cssFilename] }],
        }),
      },
      { filename: 'background.js', content: "chrome.runtime.onInstalled.addListener(() => {});" },
      { filename: 'content.js', content: "document.documentElement.dataset.extensio = 'ready';" },
      { filename: 'popup.html', content: '<!doctype html><html><body><script src="popup.js"></script></body></html>' },
      { filename: 'popup.js', content: "console.log('popup');" },
      { filename: cssFilename, content: 'body { outline-color: transparent; }' },
    ],
  };
}

test('normalizes legacy style.css to styles.css and updates manifest references', () => {
  const files = normalizeFiles(basePayload('style.css'));
  assert.ok(files.some(file => file.filename === 'styles.css'));
  assert.ok(!files.some(file => file.filename === 'style.css'));

  const manifest = validateExtensionFiles(files);
  assert.deepEqual(manifest.content_scripts[0].css, ['styles.css']);
});

test('validates complete Manifest V3 extension files', () => {
  const files = normalizeFiles(basePayload());
  const manifest = validateExtensionFiles(files);
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.action.default_popup, 'popup.html');
});

test('rejects missing required extension files', () => {
  const payload = basePayload();
  payload.files = payload.files.filter(file => file.filename !== 'content.js');
  assert.throws(() => validateExtensionFiles(normalizeFiles(payload)), /content\.js is required/);
});

test('flags critical generated-code security risks', () => {
  const scan = scanGeneratedFiles([{ filename: 'content.js', content: 'eval(window.name)' }]);
  assert.equal(scan.findings[0].severity, 'critical');
});
