import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Check,
  Mail,
  Lock,
  AlertTriangle,
  BarChart3,
  Shield,
} from 'lucide-react';
import { auth } from '../firebase/config';

const ROLE_ROUTES = {
  nurse: '/nurse',
  doctor: '/doctor',
  pharmacist: '/pharmacy',
  ops: '/ops',
  patient: '/patient',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) throw new Error('Failed to fetch user profile');

      const data = await res.json();
      const destination = ROLE_ROUTES[data.role] || '/';
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  const features = [
    'Streamline patient management',
    'Automate appointment scheduling',
    'Enhance care with AI-powered insights',
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8] p-8">
      <div
        className="flex w-full max-w-6xl min-w-[900px] overflow-hidden rounded-2xl bg-white shadow-xl"
        style={{ minHeight: '560px' }}
      >
        {/* LEFT — branding */}
        <div className="flex flex-1 flex-col bg-gradient-to-br from-blue-600 to-blue-800 px-10 py-10 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
              <Plus className="h-6 w-6 stroke-[2.5]" aria-hidden />
            </span>
            <span className="text-xl font-bold tracking-tight">CareOps AI</span>
          </div>

          <h1 className="mt-8 text-3xl font-bold leading-tight">Welcome to CareOps AI</h1>
          <p className="mt-4 max-w-md text-sm text-blue-100">
            AI-Powered Healthcare Management System
          </p>

          <ul className="mt-8 space-y-2">
            {features.map((text) => (
              <li key={text} className="flex items-start gap-2 text-sm text-blue-50">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-100">
              Sample AI insights
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex gap-2 rounded-lg bg-white/5 p-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
                <span className="text-white/95">SpO2 at 92% is below safe level</span>
              </div>
              <div className="flex gap-2 rounded-lg bg-white/5 p-2">
                <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                <span className="text-white/95">BP has been high in last 2 visits</span>
              </div>
              <div className="flex gap-2 rounded-lg bg-white/5 p-2">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-red-300" aria-hidden />
                <span className="text-white/95">Patient allergic to Penicillin</span>
              </div>
            </div>
          </div>

          <div className="mt-auto flex justify-center pt-8">
            <img
              src="/login-illustration.svg"
              alt=""
              className="mx-auto h-auto w-full max-w-[320px] opacity-95"
            />
          </div>
        </div>

        {/* RIGHT — form */}
        <div className="flex w-[min(100%,450px)] shrink-0 flex-col justify-center border-l border-gray-100 bg-white px-10 py-12">
          <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
          <p className="mt-1 text-sm text-gray-500">Use your CareOps account credentials</p>

          {error && (
            <p className="mt-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <form
            onSubmit={handleSubmit}
            className={`flex flex-col gap-4 ${error ? 'mt-4' : 'mt-8'}`}
          >
            <div>
              <label htmlFor="login-email" className="sr-only">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                  aria-hidden
                />
                <input
                  id="login-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                  aria-hidden
                />
                <input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <button
              type="button"
              className="text-center text-sm text-primary-600 hover:underline"
            >
              Forgot password?
            </button>

            <p className="text-center text-xs text-gray-500">
              Having trouble? Contact{' '}
              <a
                href="mailto:admin@careops.com"
                className="font-medium text-primary-600 hover:underline"
              >
                admin@careops.com
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
