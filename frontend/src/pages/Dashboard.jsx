import { useEffect, useMemo, useState } from 'react';
import { Download, Plus, Search, Send, Trash2, WandSparkles } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import FileViewer from '../components/FileViewer.jsx';
import PlanCard from '../components/PlanCard.jsx';
import { apiRequest, downloadUrl } from '../services/api.js';
import { useAuth } from '../services/auth.jsx';

export default function Dashboard() {
  const { token, subscription, setSubscription } = useAuth();
  const [extensions, setExtensions] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [prompt, setPrompt] = useState('Create a Chrome extension that replaces all website images with red squares.');
  const [editPrompt, setEditPrompt] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selected = useMemo(() => extensions.find(item => item._id === selectedId) || extensions[0], [extensions, selectedId]);

  useEffect(() => {
    loadExtensions();
  }, []);

  async function loadExtensions(q = '') {
    const data = await apiRequest(`/api/extensions${q ? `?search=${encodeURIComponent(q)}` : ''}`, { token });
    setExtensions(data);
    if (!selectedId && data[0]) setSelectedId(data[0]._id);
  }

  async function generate(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const extension = await apiRequest('/api/extensions/generate', {
        token,
        method: 'POST',
        body: JSON.stringify({ prompt }),
      });
      await loadExtensions();
      setSelectedId(extension._id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function edit(event) {
    event.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      const extension = await apiRequest(`/api/extensions/${selected._id}/edit`, {
        token,
        method: 'POST',
        body: JSON.stringify({ editPrompt }),
      });
      await loadExtensions();
      setSelectedId(extension._id);
      setEditPrompt('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function removeExtension(id) {
    await apiRequest(`/api/extensions/${id}`, { token, method: 'DELETE' });
    await loadExtensions();
  }

  async function choosePlan(plan) {
    const data = await apiRequest('/api/subscriptions/me', {
      token,
      method: 'PATCH',
      body: JSON.stringify({ plan }),
    });
    setSubscription(data);
  }

  return (
    <Layout>
      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Plus size={18} />
              <h1 className="font-black text-slate-950">New Extension</h1>
            </div>
            <form onSubmit={generate} className="space-y-3">
              <textarea value={prompt} onChange={event => setPrompt(event.target.value)} rows={6} className="w-full resize-none rounded-lg border border-slate-200 p-3 text-sm" />
              <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
                <WandSparkles size={17} /> {loading ? 'Generating...' : 'Generate ZIP'}
              </button>
            </form>
            {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p>}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Search size={18} />
              <h2 className="font-black">Search Extensions</h2>
            </div>
            <div className="flex gap-2">
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search history" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <button onClick={() => loadExtensions(search)} className="rounded-lg bg-slate-900 px-3 py-2 text-white"><Search size={16} /></button>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 font-black">My Extensions</h2>
            <div className="space-y-2">
              {extensions.map(item => (
                <button key={item._id} onClick={() => setSelectedId(item._id)} className="w-full rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">{item.name}</span>
                    <Trash2 onClick={(event) => { event.stopPropagation(); removeExtension(item._id); }} size={16} className="text-slate-400 hover:text-red-600" />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.prompt}</p>
                </button>
              ))}
              {!extensions.length && <p className="text-sm text-slate-500">No extensions yet.</p>}
            </div>
          </section>
        </aside>

        <section className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-emerald-600">Extension History</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">{selected?.name || 'Generate your first extension'}</h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-500">{selected?.description}</p>
              </div>
              {selected?.zipUrl && (
                <a href={downloadUrl(selected.zipUrl)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">
                  <Download size={17} /> Download Extension
                </a>
              )}
            </div>

            {selected && (
              <form onSubmit={edit} className="mt-5 flex flex-col gap-2 sm:flex-row">
                <input value={editPrompt} onChange={event => setEditPrompt(event.target.value)} placeholder="Edit request, e.g. Change button to blue" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <button disabled={loading || !editPrompt} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
                  <Send size={16} /> Apply Edit
                </button>
              </form>
            )}

            {selected?.versionHistory?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selected.versionHistory.map(version => (
                  <span key={version.version} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    v{version.version} {version.editRequest ? 'edit' : 'generated'}
                  </span>
                ))}
              </div>
            )}
          </div>

          <FileViewer extension={selected} />

          <section className="grid gap-3 md:grid-cols-3">
            <PlanCard name="Free" price="$0" active={(subscription?.plan || 'free') === 'free'} onSelect={() => choosePlan('free')}>
              3 extensions per day.
            </PlanCard>
            <PlanCard name="Pro" price="$19" active={subscription?.plan === 'pro'} onSelect={() => choosePlan('pro')}>
              Unlimited generation.
            </PlanCard>
            <PlanCard name="Premium" price="$49" active={subscription?.plan === 'premium'} onSelect={() => choosePlan('premium')}>
              API-call extensions enabled.
            </PlanCard>
          </section>
        </section>
      </main>
    </Layout>
  );
}
