import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import clsx from 'clsx';

export default function PlanCard({ name, price, active, recommended, children, features = [], onSelect }) {
  return (
    <motion.article
      whileHover={{ y: -6, scale: 1.01 }}
      className={clsx(
        'relative overflow-hidden rounded-2xl border p-5 transition',
        active ? 'border-[#00E599] bg-[#00E599]/10 shadow-2xl shadow-emerald-500/10' : 'border-[#1F2937] bg-[#111827]/80'
      )}
    >
      {recommended && (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full premium-gradient px-3 py-1 text-xs font-black text-[#030712]">
          <Sparkles size={13} /> Recommended
        </span>
      )}
      <h3 className="text-xl font-black text-[#F9FAFB]">{name}</h3>
      <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">{children}</p>
      <p className="mt-5 text-3xl font-black text-[#F9FAFB]">{price}<span className="text-sm font-semibold text-[#9CA3AF]">/mo</span></p>

      <div className="mt-5 space-y-2">
        {features.map(feature => (
          <div key={feature} className="flex items-center gap-2 text-sm text-[#D1D5DB]">
            <Check size={15} className="text-[#00E599]" />
            {feature}
          </div>
        ))}
      </div>

      <button
        onClick={onSelect}
        disabled={active}
        className={clsx(
          'mt-6 w-full rounded-xl px-4 py-3 text-sm font-black transition',
          active ? 'bg-[#1F2937] text-[#9CA3AF]' : 'premium-gradient text-[#030712] hover:shadow-lg hover:shadow-emerald-500/20'
        )}
      >
        {active ? 'Current plan' : `Choose ${name}`}
      </button>
    </motion.article>
  );
}
