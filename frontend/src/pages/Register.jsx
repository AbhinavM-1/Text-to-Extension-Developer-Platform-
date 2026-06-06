import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import { useAuth } from '../services/auth.jsx';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <AuthShell title="Create account" subtitle="Start with the Free plan and five extension generations per day.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="name" required placeholder="Name" className="w-full rounded-xl border border-[#1F2937] bg-[#111827] px-4 py-3 text-[#F9FAFB] outline-none placeholder:text-[#6B7280] focus:border-[#00E599]/60" />
        <input name="email" type="email" required placeholder="Email" className="w-full rounded-xl border border-[#1F2937] bg-[#111827] px-4 py-3 text-[#F9FAFB] outline-none placeholder:text-[#6B7280] focus:border-[#00E599]/60" />
        <div className="relative">
          <input name="password" type={showPassword ? 'text' : 'password'} required minLength={8} placeholder="Password" className="w-full rounded-xl border border-[#1F2937] bg-[#111827] px-4 py-3 pr-12 text-[#F9FAFB] outline-none placeholder:text-[#6B7280] focus:border-[#00E599]/60" />
          <button
            type="button"
            onClick={() => setShowPassword(value => !value)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-[#9CA3AF] transition hover:bg-[#030712] hover:text-[#00E599]"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <button disabled={loading} className="w-full rounded-xl premium-gradient px-4 py-3 font-black text-[#030712] disabled:opacity-60">
          {loading ? 'Creating...' : 'Register'}
        </button>
      </form>
      <p className="mt-5 text-sm text-[#9CA3AF]">Already registered? <Link className="font-bold text-[#00E599]" to="/login">Login</Link></p>
    </AuthShell>
  );
}
