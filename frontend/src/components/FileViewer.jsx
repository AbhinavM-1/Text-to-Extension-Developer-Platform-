import { lazy, Suspense, useMemo, useState } from 'react';
import { Copy, Download, Expand, FileCode2 } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const Editor = lazy(() => import('@monaco-editor/react'));

function languageFor(filename = '') {
  if (filename.endsWith('.json')) return 'json';
  if (filename.endsWith('.html')) return 'html';
  if (filename.endsWith('.css')) return 'css';
  return 'javascript';
}

export default function FileViewer({ extension }) {
  const files = extension?.files || [];
  const [activeName, setActiveName] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const active = useMemo(() => files.find(file => file.filename === activeName) || files[0], [files, activeName]);

  function copyActive() {
    if (!active) return;
    navigator.clipboard.writeText(active.content);
    toast.success(`${active.filename} copied`);
  }

  function downloadActive() {
    if (!active) return;
    const blob = new Blob([active.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = active.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className={clsx(
      'glass-panel overflow-hidden rounded-2xl',
      fullscreen && 'fixed inset-4 z-50'
    )}>
      <div className="flex flex-col gap-3 border-b border-[#1F2937] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#00E599]/10 text-[#00E599]">
            <FileCode2 size={18} />
          </span>
          <div>
            <h2 className="font-black text-[#F9FAFB]">Generated Files</h2>
            <p className="text-xs text-[#9CA3AF]">{files.length ? `${files.length} production files` : 'Generate an extension to inspect files'}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={copyActive} disabled={!active} className="inline-flex items-center gap-2 rounded-lg border border-[#1F2937] px-3 py-2 text-sm font-bold text-[#F9FAFB] hover:border-[#00E599]/50 disabled:opacity-40">
            <Copy size={15} /> Copy
          </button>
          <button onClick={downloadActive} disabled={!active} className="inline-flex items-center gap-2 rounded-lg border border-[#1F2937] px-3 py-2 text-sm font-bold text-[#F9FAFB] hover:border-[#00E599]/50 disabled:opacity-40">
            <Download size={15} /> File
          </button>
          <button onClick={() => setFullscreen(value => !value)} className="inline-flex items-center gap-2 rounded-lg border border-[#1F2937] px-3 py-2 text-sm font-bold text-[#F9FAFB] hover:border-[#00E599]/50">
            <Expand size={15} /> {fullscreen ? 'Exit' : 'Fullscreen'}
          </button>
        </div>
      </div>

      <div className="flex overflow-x-auto border-b border-[#1F2937] bg-[#030712]">
        {files.map(file => (
          <button
            key={file.filename}
            onClick={() => setActiveName(file.filename)}
            className={clsx(
              'min-w-max border-r border-[#1F2937] px-4 py-3 text-sm font-bold transition',
              active?.filename === file.filename ? 'bg-[#111827] text-[#00E599]' : 'text-[#9CA3AF] hover:bg-[#111827]/70 hover:text-[#F9FAFB]'
            )}
          >
            {file.filename}
          </button>
        ))}
      </div>

      <div className={clsx('bg-[#030712]', fullscreen ? 'h-[calc(100vh-9rem)]' : 'h-[520px]')}>
        {active ? (
          <Suspense fallback={<div className="grid h-full place-items-center text-sm font-bold text-[#9CA3AF]">Loading code workspace...</div>}>
            <Editor
              height="100%"
              language={languageFor(active.filename)}
              value={active.content}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                padding: { top: 18, bottom: 18 },
              }}
            />
          </Suspense>
        ) : (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#00E599]/10 text-[#00E599]">
                <FileCode2 size={24} />
              </div>
              <h3 className="mt-4 text-xl font-black text-[#F9FAFB]">No files yet</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[#9CA3AF]">Generate your first extension and the complete Manifest V3 project will appear here.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
