import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import { useAuth } from '../services/auth.jsx';
import { useState } from 'react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      await register(form.get('name'), form.get('email'), form.get('password'));
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Create account" subtitle="Start with the Free plan and three generations per day.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="name" required placeholder="Name" className="w-full rounded-lg border border-slate-200 px-4 py-3" />
        <input name="email" type="email" required placeholder="Email" className="w-full rounded-lg border border-slate-200 px-4 py-3" />
        <input name="password" type="password" required minLength={8} placeholder="Password" className="w-full rounded-lg border border-slate-200 px-4 py-3" />
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <button disabled={loading} className="w-full rounded-lg bg-slate-950 px-4 py-3 font-bold text-white disabled:opacity-60">
          {loading ? 'Creating...' : 'Register'}
        </button>
      </form>
      <p className="mt-5 text-sm text-slate-600">Already registered? <Link className="font-bold text-slate-950" to="/login">Login</Link></p>
    </AuthShell>
  );
}
