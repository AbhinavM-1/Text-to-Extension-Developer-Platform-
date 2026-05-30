import clsx from 'clsx';

export default function PlanCard({ name, price, active, children, onSelect }) {
  return (
    <article className={clsx('rounded-lg border bg-white p-4', active ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200')}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-950">{name}</h3>
          <p className="text-sm text-slate-500">{children}</p>
        </div>
        <p className="text-xl font-black">{price}</p>
      </div>
      <button
        onClick={onSelect}
        disabled={active}
        className="mt-4 w-full rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-500"
      >
        {active ? 'Current plan' : `Choose ${name}`}
      </button>
    </article>
  );
}
