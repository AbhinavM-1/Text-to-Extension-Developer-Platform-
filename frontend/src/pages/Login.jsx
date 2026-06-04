import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import { useAuth } from '../services/auth.jsx';
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../services/api.js';

const socialProviders = [
  { id: 'google', name: 'Google', mark: 'G', tone: 'bg-white text-[#111827]' },
  { id: 'github', name: 'GitHub', mark: 'GH', tone: 'bg-[#111827] text-white border border-[#334155]' },
  { id: 'microsoft', name: 'Microsoft', mark: 'MS', tone: 'bg-[#2563EB] text-white' },
];

export default function Login() {
  const { acceptOAuthToken, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get('token');
    const oauthError = params.get('oauthError');

    if (oauthError) {
      setError(oauthError);
      window.history.replaceState({}, '', '/login');
      return;
    }

    if (!oauthToken) return;
    setLoading(true);
    acceptOAuthToken(oauthToken)
      .then(() => {
        window.history.replaceState({}, '', '/login');
        navigate('/');
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [acceptOAuthToken, navigate]);

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

  function startOAuth(provider) {
    window.location.href = `${API_BASE_URL}/api/auth/oauth/${provider}/start`;
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to generate and manage extensions.">
      <div className="mb-4">
        <p className="mb-2.5 text-xs font-black uppercase tracking-[0.18em] text-[#00E599]">Account access</p>
        <div className="grid gap-2.5">
        {socialProviders.map(provider => (
          <button
            key={provider.id}
            type="button"
            onClick={() => startOAuth(provider.id)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#1F2937] bg-[#111827]/80 px-4 py-2.5 text-left text-[#F9FAFB] transition hover:border-[#00E599]/60 hover:bg-[#111827]"
          >
            <span className="flex items-center gap-3">
              <span className={`grid h-8 min-w-8 place-items-center rounded-lg px-1 text-xs font-black ${provider.tone}`}>
                {provider.mark}
              </span>
              <span className="font-bold">Continue with {provider.name}</span>
            </span>
          </button>
        ))}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 text-xs font-black uppercase tracking-[0.18em] text-[#6B7280]">
        <span className="h-px flex-1 bg-[#1F2937]" />
        secure email login
        <span className="h-px flex-1 bg-[#1F2937]" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input id="login-email" name="email" type="email" required placeholder="Email" className="w-full rounded-xl border border-[#1F2937] bg-[#111827] px-4 py-2.5 text-[#F9FAFB] outline-none placeholder:text-[#6B7280] focus:border-[#00E599]/60" />
        <input name="password" type="password" required placeholder="Password" className="w-full rounded-xl border border-[#1F2937] bg-[#111827] px-4 py-2.5 text-[#F9FAFB] outline-none placeholder:text-[#6B7280] focus:border-[#00E599]/60" />
        {error && (
          <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold leading-5 text-red-300">
            {error}
          </p>
        )}
        <button disabled={loading} className="w-full rounded-xl premium-gradient px-4 py-3 font-black text-[#030712] disabled:opacity-60">
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <Link className="font-bold text-[#00E599]" to="/register">Create account</Link>
        <Link className="font-bold text-[#00E599]" to="/forgot-password">Forgot password?</Link>
      </div>
    </AuthShell>
  );
}
