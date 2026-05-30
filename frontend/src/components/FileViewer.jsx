export default function FileViewer({ extension }) {
  const files = extension?.files || [];
  const active = files[0];

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-black text-slate-950">Generated Files</h2>
      </div>
      <div className="grid min-h-[420px] grid-cols-1 md:grid-cols-[220px_1fr]">
        <aside className="border-b border-slate-200 p-3 md:border-b-0 md:border-r">
          {files.map(file => (
            <div key={file.filename} className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700">
              {file.filename}
            </div>
          ))}
        </aside>
        <pre className="code-pane overflow-auto p-4 text-xs leading-6 text-slate-800">
          {active?.content || 'Generate an extension to inspect the project files.'}
        </pre>
      </div>
    </section>
  );
}
