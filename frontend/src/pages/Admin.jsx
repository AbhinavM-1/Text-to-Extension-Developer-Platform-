import { motion } from 'framer-motion';
import { Activity, Crown, Puzzle, Shield, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { apiRequest } from '../services/api.js';
import { useAuth } from '../services/auth.jsx';

export default function Admin() {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [extensions, setExtensions] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiRequest('/api/admin/analytics', { token }),
      apiRequest('/api/admin/users', { token }),
      apiRequest('/api/admin/extensions', { token }),
    ]).then(([analyticsData, userData, extensionData]) => {
      setAnalytics(analyticsData);
      setUsers(userData);
      setExtensions(extensionData);
    }).catch(err => setError(err.message));
  }, [token]);

  return (
    <Layout>
      <main className="min-h-screen overflow-hidden bg-[#030712] px-4 py-8 text-slate-50 sm:px-6 lg:px-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(0,229,153,0.18),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(20,184,166,0.16),transparent_24%)]" />
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-7xl space-y-6"
        >
          <div className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-emerald-950/20 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.35em] text-emerald-300">Operations Center</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Admin Panel</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Monitor users, generated extensions, subscription activity, and platform health from one polished control room.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-black text-emerald-200">
              <Shield size={16} />
              Admin Access
            </div>
          </div>

          {error && (
            <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 font-bold text-red-200">
              {error}
            </p>
          )}

          <section className="grid gap-4 md:grid-cols-3">
            <Metric icon={Users} label="Users" value={analytics?.users || 0} />
            <Metric icon={Puzzle} label="Extensions" value={analytics?.extensions || 0} />
            <Metric icon={Crown} label="Plans" value={analytics?.subscriptions?.length || 0} />
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <Panel title="Users" icon={Users}>
              {users.length ? (
                users.map(user => <Row key={user._id} title={user.email} subtitle={`${user.name} - ${user.role}`} />)
              ) : (
                <Empty label="No users loaded yet" />
              )}
            </Panel>
            <Panel title="Extensions" icon={Activity}>
              {extensions.length ? (
                extensions.map(item => <Row key={item._id} title={item.name} subtitle={item.owner?.email || 'Unknown owner'} />)
              ) : (
                <Empty label="No extensions loaded yet" />
              )}
            </Panel>
          </section>
        </motion.section>
      </main>
    </Layout>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-400">{label}</p>
        <span className="rounded-2xl bg-emerald-400/10 p-3 text-emerald-300">
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-5 text-4xl font-black tracking-tight">{value}</p>
    </motion.div>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.04] shadow-xl shadow-black/20 backdrop-blur-xl">
      <h2 className="flex items-center gap-3 border-b border-white/10 px-5 py-4 font-black">
        <span className="rounded-xl bg-white/5 p-2 text-emerald-300">
          <Icon size={18} />
        </span>
        {title}
      </h2>
      <div className="divide-y divide-white/10">{children}</div>
    </section>
  );
}

function Row({ title, subtitle }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-white/[0.03]">
      <div className="min-w-0">
        <p className="truncate font-bold text-slate-100">{title}</p>
        <p className="mt-1 truncate text-sm text-slate-500">{subtitle}</p>
      </div>
      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_20px_rgba(0,229,153,0.8)]" />
    </div>
  );
}

function Empty({ label }) {
  return (
    <div className="px-5 py-10 text-center text-sm font-semibold text-slate-500">
      {label}
    </div>
  );
}
