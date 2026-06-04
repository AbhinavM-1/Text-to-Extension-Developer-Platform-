import { motion } from 'framer-motion';
import { ArrowRight, Code2, Download, Globe2, Play, Sparkles, Zap } from 'lucide-react';
import { useState } from 'react';

const generationSteps = ['manifest.json', 'content.js', 'popup.html', 'popup.js', 'ZIP ready'];

export default function AuthShell({ title, subtitle, children }) {
  const [showDemo, setShowDemo] = useState(false);

  function focusAuthPanel() {
    const panel = document.getElementById('auth-panel-card');
    const firstField = document.getElementById('login-email') || document.querySelector('#auth-panel input:not([type="hidden"])');
    panel?.classList.add('ring-2', 'ring-[#00E599]', 'ring-offset-2', 'ring-offset-[#030712]');
    window.setTimeout(() => panel?.classList.remove('ring-2', 'ring-[#00E599]', 'ring-offset-2', 'ring-offset-[#030712]'), 900);
    firstField?.focus();
  }

  return (
    <main className="h-screen overflow-hidden mesh-background text-[#F9FAFB]">
      <div className="mx-auto grid h-screen max-w-7xl grid-cols-1 lg:grid-cols-[1fr_440px]">
        <section className="relative flex flex-col justify-between px-6 py-8 lg:px-10">
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <div className="absolute left-0 top-24 h-px w-full bg-gradient-to-r from-transparent via-[#00E599]/30 to-transparent" />
            <div className="absolute bottom-40 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#14B8A6]/20 to-transparent" />
          </div>

          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="relative flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl premium-gradient text-[#030712] shadow-lg shadow-emerald-500/20">
              <Globe2 size={23} />
            </span>
            <div>
              <p className="text-lg font-black tracking-tight">Extensio.ai</p>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#00E599]">No-code extension factory</p>
            </div>
          </motion.div>

          <div className="relative max-w-3xl py-14 lg:py-20">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#1F2937] bg-[#111827]/70 px-4 py-2 text-sm font-semibold text-[#D1FAE5]"
            >
              <Sparkles size={16} className="text-[#00E599]" />
              AI-powered Manifest V3 generation
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="max-w-4xl text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl"
            >
              Build Chrome Extensions With AI
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="mt-6 max-w-2xl text-lg leading-8 text-[#9CA3AF]"
            >
              Describe your idea in plain English. Extensio.ai generates a complete Manifest V3 extension and packages it instantly.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <button type="button" onClick={focusAuthPanel} className="inline-flex items-center justify-center gap-2 rounded-xl premium-gradient px-5 py-3 font-black text-[#030712] shadow-lg shadow-emerald-500/20">
                Start Building <ArrowRight size={18} />
              </button>
              <button type="button" onClick={() => setShowDemo(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1F2937] bg-[#111827]/80 px-5 py-3 font-bold text-[#F9FAFB] hover:border-[#00E599]/50">
                <Play size={18} /> Watch Demo
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.34 }}
              className="mt-10 grid max-w-3xl gap-4 md:grid-cols-3"
            >
              {[
                ['AI Generator', Code2],
                ['Secure Validation', Zap],
                ['Instant ZIP', Download],
              ].map(([label, Icon]) => (
                <div key={label} className="glass-panel rounded-xl p-4">
                  <Icon size={20} className="text-[#00E599]" />
                  <p className="mt-3 text-sm font-black">{label}</p>
                  <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">Production-ready extension workflow.</p>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.42 }} className="relative glass-panel rounded-2xl p-4">
            <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00E599]">Live AI Demo</p>
              <span className="rounded-full bg-[#00E599]/10 px-3 py-1 text-xs font-bold text-[#00E599]">Running</span>
            </div>
            <div className="mt-4 rounded-xl bg-[#030712] p-4 font-mono text-sm">
              <p className="text-[#9CA3AF]">&gt; Block all YouTube Shorts</p>
              <div className="mt-4 space-y-2">
                {generationSteps.map((step, index) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55 + index * 0.18 }}
                    className="flex items-center gap-2 text-[#F9FAFB]"
                  >
                    <span className="h-2 w-2 rounded-full bg-[#00E599]" />
                    {step}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        <section id="auth-panel" className="flex h-screen items-center justify-center overflow-hidden border-l border-[#1F2937]/70 bg-[#030712]/72 px-6 py-4 backdrop-blur-xl lg:px-10">
          <motion.div
            id="auth-panel-card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full max-w-md rounded-3xl border border-[#1F2937] bg-[#0B1220]/88 p-5 shadow-2xl shadow-black/30 transition"
          >
            <div className="mb-5">
              <h2 className="text-3xl font-black leading-tight">{title}</h2>
              <p className="mt-1.5 text-sm text-[#9CA3AF]">{subtitle}</p>
            </div>
            {children}
          </motion.div>
        </section>
      </div>

      {showDemo && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#030712]/80 px-4 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-lg rounded-3xl border border-[#1F2937] bg-[#0B1220] p-6 shadow-2xl shadow-black/50"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#00E599]">Product Demo</p>
                <h3 className="mt-2 text-2xl font-black">Prompt to extension in seconds</h3>
                <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">Extensio.ai validates the prompt, creates Manifest V3 files, packages them, and prepares a ZIP download.</p>
              </div>
              <button type="button" onClick={() => setShowDemo(false)} className="rounded-xl border border-[#1F2937] px-3 py-2 text-sm font-black text-[#F9FAFB] hover:border-[#00E599]/60">
                Close
              </button>
            </div>
            <div className="mt-5 rounded-2xl bg-[#030712] p-4 font-mono text-sm">
              <p className="text-[#9CA3AF]">&gt; Create a YouTube sidebar ad cleaner</p>
              <div className="mt-4 space-y-3">
                {generationSteps.map((step, index) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.12 }}
                    className="flex items-center gap-2 text-[#F9FAFB]"
                  >
                    <span className="h-2 w-2 rounded-full bg-[#00E599]" />
                    {step}
                  </motion.div>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => { setShowDemo(false); window.setTimeout(focusAuthPanel, 50); }} className="mt-5 w-full rounded-xl premium-gradient px-4 py-3 font-black text-[#030712]">
              Start Building Now
            </button>
          </motion.div>
        </div>
      )}
    </main>
  );
}
