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
        <input name="name" required placeholder="Name" className="w-full rounded-xl border border-[#1F2937] bg-[#111827] px-4 py-3 text-[#F9FAFB] outline-none placeholder:text-[#6B7280] focus:border-[#00E599]/60" />
        <input name="email" type="email" required placeholder="Email" className="w-full rounded-xl border border-[#1F2937] bg-[#111827] px-4 py-3 text-[#F9FAFB] outline-none placeholder:text-[#6B7280] focus:border-[#00E599]/60" />
        <input name="password" type="password" required minLength={8} placeholder="Password" className="w-full rounded-xl border border-[#1F2937] bg-[#111827] px-4 py-3 text-[#F9FAFB] outline-none placeholder:text-[#6B7280] focus:border-[#00E599]/60" />
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <button disabled={loading} className="w-full rounded-xl premium-gradient px-4 py-3 font-black text-[#030712] disabled:opacity-60">
          {loading ? 'Creating...' : 'Register'}
        </button>
      </form>
      <p className="mt-5 text-sm text-[#9CA3AF]">Already registered? <Link className="font-bold text-[#00E599]" to="/login">Login</Link></p>
    </AuthShell>
  );
}
