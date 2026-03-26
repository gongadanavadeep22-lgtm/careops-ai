import { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
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

// Passwords: never stored in this app — Firebase Auth hashes credentials server-side (HTTPS).
// Chrome’s “password found in a data breach” warning is from Google Password Checkup (browser),
// comparing your password to known leaked lists; it is not specific to CareOps code.

const ROLE_ROUTES = {
  nurse: '/nurse',
  doctor: '/doctor',
  pharmacist: '/pharmacy',
  ops: '/ops',
  patient: '/patient',
};

const LOGIN_TEAM_AVATARS = [
  { src: '/avatars/nurse.jpg', label: 'Nurse' },
  { src: '/avatars/doctor-male.jpg', label: 'Doctor' },
  { src: '/avatars/pharmacist.jpg', label: 'Pharmacy' },
];

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
      const rawRole = typeof data.role === 'string' ? data.role.trim().toLowerCase() : '';
      const destination = ROLE_ROUTES[rawRole];
      if (!destination) {
        await signOut(auth);
        throw new Error('Your account role is not recognized. Contact admin.');
      }
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[CareOps login]', { role: rawRole, destination });
      }
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
    <div className="flex min-h-screen w-full justify-center bg-[#f0f4f8] p-3 sm:p-4 md:p-5">
      <div className="flex w-full max-w-[1600px] flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl lg:min-h-[calc(100vh-40px)] lg:flex-row">
        {/* LEFT — branding & visuals */}
        <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-br from-blue-600 to-blue-800 px-6 py-8 text-white sm:px-10 sm:py-10 lg:overflow-y-auto">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
              <Plus className="h-6 w-6 stroke-[2.5]" aria-hidden />
            </span>
            <span className="text-xl font-bold tracking-tight">CareOps AI</span>
          </div>

          <h1 className="mt-6 text-2xl font-bold leading-tight sm:mt-8 sm:text-3xl">
            Welcome to CareOps AI
          </h1>
          <p className="mt-3 max-w-lg text-sm text-blue-100">
            AI-Powered Healthcare Management System
          </p>

          <ul className="mt-6 space-y-2 sm:mt-8">
            {features.map((text) => (
              <li key={text} className="flex items-start gap-2 text-sm text-blue-50">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm sm:mt-8">
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

          {/* Physicians + team avatars — replaces bottom illustration */}
          <div className="mt-8 border-t border-white/15 pt-6 lg:mt-auto">
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-blue-100/90">
              Your clinical team
            </p>
            <div className="mt-4 flex flex-wrap items-end justify-center gap-4 sm:gap-6">
              <figure className="text-center">
                <img
                  src="/avatars/login-doctor-male.jpg"
                  alt=""
                  className="mx-auto h-36 w-[7.25rem] rounded-2xl object-cover shadow-lg ring-2 ring-white/30 sm:h-44 sm:w-36"
                />
                <figcaption className="mt-2 text-[11px] font-medium text-blue-100/90">
                  Physician
                </figcaption>
              </figure>
              <figure className="text-center">
                <img
                  src="/avatars/login-doctor-female.jpg"
                  alt=""
                  className="mx-auto h-36 w-[7.25rem] rounded-2xl object-cover shadow-lg ring-2 ring-white/30 sm:h-44 sm:w-36"
                />
                <figcaption className="mt-2 text-[11px] font-medium text-blue-100/90">
                  Physician
                </figcaption>
              </figure>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-5 sm:gap-6">
              {LOGIN_TEAM_AVATARS.map(({ src, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5">
                  <img
                    src={src}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-white/40 shadow-md sm:h-14 sm:w-14"
                  />
                  <span className="text-[10px] font-medium uppercase tracking-wide text-blue-100/85">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — form */}
        <div className="flex w-full shrink-0 flex-col justify-center border-t border-gray-100 bg-white px-6 py-10 sm:px-10 lg:w-[min(100%,460px)] lg:border-l lg:border-t-0 lg:py-12 xl:w-[min(100%,480px)]">
          <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
          <p className="mt-1 text-sm text-gray-500">Use your CareOps account credentials</p>

          {error && (
            <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
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
                  className="w-full rounded-lg border border-gray-200 bg-slate-50/80 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
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
                  className="w-full rounded-lg border border-gray-200 bg-slate-50/80 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
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
