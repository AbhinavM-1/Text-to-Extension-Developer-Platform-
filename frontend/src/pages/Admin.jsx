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
      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6">
        <h1 className="text-3xl font-black">Admin Panel</h1>
        {error && <p className="rounded-lg bg-red-50 p-3 font-semibold text-red-600">{error}</p>}
        <section className="grid gap-3 md:grid-cols-3">
          <Metric label="Users" value={analytics?.users || 0} />
          <Metric label="Extensions" value={analytics?.extensions || 0} />
          <Metric label="Plans" value={analytics?.subscriptions?.length || 0} />
        </section>
        <section className="grid gap-5 lg:grid-cols-2">
          <Panel title="Users">
            {users.map(user => <Row key={user._id} title={user.email} subtitle={`${user.name} - ${user.role}`} />)}
          </Panel>
          <Panel title="Extensions">
            {extensions.map(item => <Row key={item._id} title={item.name} subtitle={item.owner?.email || 'Unknown owner'} />)}
          </Panel>
        </section>
      </main>
    </Layout>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <h2 className="border-b border-slate-200 px-4 py-3 font-black">{title}</h2>
      <div className="divide-y divide-slate-100">{children}</div>
    </section>
  );
}

function Row({ title, subtitle }) {
  return (
    <div className="px-4 py-3">
      <p className="font-bold text-slate-900">{title}</p>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}
