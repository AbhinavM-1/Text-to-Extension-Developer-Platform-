import { Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import { apiRequest } from '../services/api.js';
import { useMemo, useState } from 'react';

export default function ForgotPassword() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialToken = params.get('token') || '';
  const initialEmail = params.get('email') || '';
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [demoResetLink, setDemoResetLink] = useState('');
  const [resetToken, setResetToken] = useState(initialToken);
  const [resetReady, setResetReady] = useState(Boolean(initialToken));
  const [isSending, setIsSending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setDemoResetLink('');
    setIsSending(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: form.get('email') }),
      });
      setMessage(result.message);
      setDemoResetLink(result.resetLink || '');
      setResetReady(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSending(false);
    }
  }

  async function handleReset(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setDemoResetLink('');
    setIsResetting(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: resetToken || form.get('token'),
          password: form.get('password'),
        }),
      });
      setMessage(result.message);
      setResetToken('');
      setResetReady(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <AuthShell
      title="Reset password"
      subtitle={resetReady ? 'Enter a new password for your account.' : 'Enter your email and we will send a secure reset link.'}
    >
      {!resetReady && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="email"
            type="email"
            required
            defaultValue={initialEmail}
            placeholder="Email"
            className="w-full rounded-xl border border-[#1F2937] bg-[#111827] px-4 py-3 text-[#F9FAFB] outline-none placeholder:text-[#6B7280] focus:border-[#00E599]/60"
          />
          <button type="submit" disabled={isSending} className="w-full rounded-xl premium-gradient px-4 py-3 font-black text-[#030712] disabled:cursor-not-allowed disabled:opacity-70">
            {isSending ? 'Sending reset link...' : 'Send reset link'}
          </button>
        </form>
      )}
      {message && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold leading-6 text-emerald-700">{message}</p>}
      {demoResetLink && (
        <a
          href={demoResetLink}
          className="mt-3 block rounded-xl border border-[#00E599]/40 bg-[#00E599]/10 px-4 py-3 text-center text-sm font-black text-[#00E599] transition hover:bg-[#00E599]/15"
        >
          Open local demo reset link
        </a>
      )}
      {error && <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold leading-6 text-red-200">{error}</p>}
      {resetReady && (
        <form onSubmit={handleReset} className="mt-5 space-y-4">
          {!initialToken && (
            <input
              name="token"
              required
              value={resetToken}
              onChange={event => setResetToken(event.target.value)}
              placeholder="Reset token"
              className="w-full rounded-xl border border-[#1F2937] bg-[#111827] px-4 py-3 text-[#F9FAFB] outline-none placeholder:text-[#6B7280] focus:border-[#00E599]/60"
            />
          )}
          <input name="password" type="password" required minLength={8} placeholder="New password" className="w-full rounded-xl border border-[#1F2937] bg-[#111827] px-4 py-3 text-[#F9FAFB] outline-none placeholder:text-[#6B7280] focus:border-[#00E599]/60" />
          <button type="submit" disabled={isResetting} className="w-full rounded-xl border border-[#00E599]/40 px-4 py-3 font-black text-[#00E599] disabled:cursor-not-allowed disabled:opacity-70">
            {isResetting ? 'Resetting password...' : 'Reset password'}
          </button>
        </form>
      )}
      <Link className="mt-5 block text-sm font-bold text-[#00E599]" to="/login">Back to login</Link>
    </AuthShell>
  );
}
