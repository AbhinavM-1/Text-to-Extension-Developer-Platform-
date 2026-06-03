import { Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import { apiRequest } from '../services/api.js';
import { useState } from 'react';

export default function ForgotPassword() {
  const [message, setMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await apiRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: form.get('email') }),
    });
    setMessage(result.resetToken ? `${result.message} Dev reset token: ${result.resetToken}` : result.message);
  }

  return (
    <AuthShell title="Reset password" subtitle="Request a password reset token.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="email" type="email" required placeholder="Email" className="w-full rounded-xl border border-[#1F2937] bg-[#111827] px-4 py-3 text-[#F9FAFB] outline-none placeholder:text-[#6B7280] focus:border-[#00E599]/60" />
        <button className="w-full rounded-xl premium-gradient px-4 py-3 font-black text-[#030712]">Send reset link</button>
      </form>
      {message && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p>}
      <Link className="mt-5 block text-sm font-bold text-[#00E599]" to="/login">Back to login</Link>
    </AuthShell>
  );
}
