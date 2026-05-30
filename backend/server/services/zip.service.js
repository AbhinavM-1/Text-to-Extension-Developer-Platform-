import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');
const storageRoot = path.join(backendRoot, 'storage');
const zipRoot = path.join(storageRoot, 'zips');
const buildRoot = path.join(storageRoot, 'builds');

function safeName(name) {
  return name.replace(/[^a-z0-9_-]/gi, '_').slice(0, 80) || 'extension';
}

export async function packageExtension({ extensionId, version, name, files }) {
  const projectDir = path.join(buildRoot, String(extensionId), `v${version}`);
  const zipName = `${safeName(name)}_${extensionId}_v${version}.zip`;
  const zipPath = path.join(zipRoot, zipName);

  await fs.promises.rm(projectDir, { recursive: true, force: true });
  await fs.promises.mkdir(projectDir, { recursive: true });
  await fs.promises.mkdir(zipRoot, { recursive: true });

  for (const file of files) {
    const outPath = path.join(projectDir, file.filename);
    await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
    await fs.promises.writeFile(outPath, file.content, 'utf8');
  }

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(projectDir, false);
    archive.finalize();
  });

  return { zipPath, zipUrl: `/downloads/${zipName}` };
}
