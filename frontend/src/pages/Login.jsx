import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import { useAuth } from '../services/auth.jsx';
import { useState } from 'react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      await login(form.get('email'), form.get('password'));
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to generate and manage extensions.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="email" type="email" required placeholder="Email" className="w-full rounded-lg border border-slate-200 px-4 py-3" />
        <input name="password" type="password" required placeholder="Password" className="w-full rounded-lg border border-slate-200 px-4 py-3" />
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <button disabled={loading} className="w-full rounded-lg bg-slate-950 px-4 py-3 font-bold text-white disabled:opacity-60">
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>
      <div className="mt-5 flex justify-between text-sm">
        <Link className="font-bold text-slate-700" to="/register">Create account</Link>
        <Link className="font-bold text-slate-700" to="/forgot-password">Forgot password?</Link>
      </div>
    </AuthShell>
  );
}
