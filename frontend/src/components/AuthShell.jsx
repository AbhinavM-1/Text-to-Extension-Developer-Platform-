import { Globe2, Sparkles } from 'lucide-react';

export default function AuthShell({ title, subtitle, children }) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-[1fr_420px]">
        <section className="flex flex-col justify-between px-6 py-8 lg:px-10">
          <div className="flex items-center gap-3 text-lg font-black">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-400 text-slate-950">
              <Globe2 size={22} />
            </span>
            Extensio.ai
          </div>
          <div className="max-w-2xl py-16">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-sm text-emerald-200">
              <Sparkles size={15} /> No-Code Chrome Extension Factory
            </div>
            <h1 className="text-5xl font-black tracking-tight sm:text-6xl">
              Describe it. Generate it. Download the ZIP.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
              Extensio.ai turns plain English into complete Manifest V3 extension projects with validation, version history, and subscription controls.
            </p>
          </div>
          <p className="text-sm text-slate-500">Production-ready React, Express, MongoDB, JWT, OpenAI, and archiver workflow.</p>
        </section>
        <section className="flex items-center bg-white px-6 py-10 text-slate-950 lg:px-10">
          <div className="w-full">
            <h2 className="text-3xl font-black">{title}</h2>
            <p className="mt-2 text-slate-500">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
