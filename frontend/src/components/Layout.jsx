import { Globe2, LogOut, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/auth.jsx';

export default function Layout({ children }) {
  const { user, subscription, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-3 font-black text-slate-950">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-950 text-emerald-300">
              <Globe2 size={20} />
            </span>
            Extensio.ai
          </Link>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase text-emerald-700">
              {subscription?.plan || 'free'}
            </span>
            {user?.role === 'admin' && (
              <button onClick={() => navigate('/admin')} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" title="Admin">
                <ShieldCheck size={18} />
              </button>
            )}
            <span className="hidden text-sm font-semibold text-slate-600 sm:block">{user?.name}</span>
            <button onClick={logout} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
