import { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Check,
  Mail,
  Lock,
  AlertTriangle,
  BarChart3,
  Shield,
} from 'lucide-react';
import {
  getFirebaseAuth,
  getMissingFirebaseEnvVars,
  isFirebaseConfigured,
} from '../firebase/config';
import client from '../api/client';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { dashboardPathForRole } from '../utils/roleRoutes';

// Passwords: never stored in this app — Firebase Auth hashes credentials server-side (HTTPS).
// Chrome’s “password found in a data breach” warning is from Google Password Checkup (browser),
// comparing your password to known leaked lists; it is not specific to CareOps code.

const LOGIN_TEAM_AVATARS = [
  { src: '/avatars/nurse.jpg', labelKey: 'team.nurse' },
  { src: '/avatars/doctor-male.jpg', labelKey: 'team.doctor' },
  { src: '/avatars/pharmacist.jpg', labelKey: 'team.pharmacy' },
];

function apiUrlConfigured() {
  const raw = import.meta.env.VITE_API_URL;
  return typeof raw === 'string' && raw.trim().length > 0;
}

function firebaseConfigErrorMessage(t) {
  const missing = getMissingFirebaseEnvVars();
  const list = missing.length ? missing.join(', ') : 'VITE_FIREBASE_*';
  if (import.meta.env.PROD) {
    return t('login.errorFirebaseProd', { list });
  }
  return t('login.errorFirebaseDev', { list });
}

/** Maps Firebase, fetch, axios, and network errors to a clear UI message. */
function loginErrorMessage(err, t) {
  const code = err?.code;
  if (typeof code === 'string' && code.startsWith('auth/')) {
    const key = `login.${code.replace(/\//g, '_').replace(/-/g, '_')}`;
    const translated = t(key, { defaultValue: '' });
    if (translated && translated !== key) return translated;
    return err.message || t('login.auth_generic');
  }

  const status = err?.response?.status;
  if (status === 404) {
    return t('login.errorAccount404');
  }
  if (status === 401) {
    return t('login.error401');
  }
  const apiMsg = err?.response?.data?.error;
  if (typeof apiMsg === 'string' && apiMsg.trim()) return apiMsg;

  const msg = err?.message || '';
  if (msg === 'Network Error' || msg === 'Failed to fetch') {
    if (import.meta.env.PROD) {
      return t('login.errorNetwork');
    }
    const api = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');
    return t('login.errorNetworkDev', { api, origin: window.location.origin });
  }
  return msg || t('login.errorLoginGeneric');
}

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!apiUrlConfigured()) {
      setError(
        import.meta.env.PROD ? t('login.errorApiUrlProd') : t('login.errorApiUrlDev')
      );
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      setError(firebaseConfigErrorMessage(t));
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);

      const { data } = await client.get('/api/auth/me');

      const rawRole = typeof data.role === 'string' ? data.role.trim().toLowerCase() : '';
      const destination = dashboardPathForRole(rawRole);
      if (destination === '/login') {
        await signOut(getFirebaseAuth());
        throw new Error(t('login.errorRoleUnknown'));
      }
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[CareOps login]', { role: rawRole, destination });
      }
      navigate(destination, { replace: true });
    } catch (err) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error('[CareOps login]', err);
      }
      if (getFirebaseAuth().currentUser) {
        try {
          await signOut(getFirebaseAuth());
        } catch {
          /* ignore */
        }
      }
      setError(loginErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  }

  const features = [t('login.feature1'), t('login.feature2'), t('login.feature3')];

  return (
    <div className="flex min-h-screen w-full justify-center bg-[#f0f4f8] p-3 sm:p-4 md:p-5">
      <div className="flex w-full max-w-[1600px] flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl lg:min-h-[calc(100vh-40px)]">
        <div className="flex min-h-0 flex-1 flex-col lg:min-h-0 lg:flex-row">
        {/* LEFT — branding & visuals */}
        <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-br from-blue-600 to-blue-800 px-6 py-8 text-white sm:px-10 sm:py-10 lg:overflow-y-auto">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
              <Plus className="h-6 w-6 stroke-[2.5]" aria-hidden />
            </span>
            <span className="text-xl font-bold tracking-tight">CareOps AI</span>
          </div>

          <h1 className="mt-6 text-2xl font-bold leading-tight sm:mt-8 sm:text-3xl">
            {t('login.welcomeTitle')}
          </h1>
          <p className="mt-3 max-w-lg text-sm text-blue-100">
            {t('login.subtitle')}
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
              {t('login.sampleInsights')}
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex gap-2 rounded-lg bg-white/5 p-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
                <span className="text-white/95">{t('login.insightSpo2')}</span>
              </div>
              <div className="flex gap-2 rounded-lg bg-white/5 p-2">
                <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                <span className="text-white/95">{t('login.insightBp')}</span>
              </div>
              <div className="flex gap-2 rounded-lg bg-white/5 p-2">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-red-300" aria-hidden />
                <span className="text-white/95">{t('login.insightAllergy')}</span>
              </div>
            </div>
          </div>

          {/* Physicians + team avatars — replaces bottom illustration */}
          <div className="mt-8 border-t border-white/15 pt-6 lg:mt-auto">
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-blue-100/90">
              {t('login.clinicalTeam')}
            </p>
            <div className="mt-4 flex flex-wrap items-end justify-center gap-4 sm:gap-6">
              <figure className="text-center">
                <img
                  src="/avatars/login-doctor-male.jpg"
                  alt=""
                  className="mx-auto h-36 w-[7.25rem] rounded-2xl object-cover shadow-lg ring-2 ring-white/30 sm:h-44 sm:w-36"
                />
                <figcaption className="mt-2 text-[11px] font-medium text-blue-100/90">
                  {t('login.physician')}
                </figcaption>
              </figure>
              <figure className="text-center">
                <img
                  src="/avatars/login-doctor-female.jpg"
                  alt=""
                  className="mx-auto h-36 w-[7.25rem] rounded-2xl object-cover shadow-lg ring-2 ring-white/30 sm:h-44 sm:w-36"
                />
                <figcaption className="mt-2 text-[11px] font-medium text-blue-100/90">
                  {t('login.physician')}
                </figcaption>
              </figure>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-5 sm:gap-6">
              {LOGIN_TEAM_AVATARS.map(({ src, labelKey }) => (
                <div key={labelKey} className="flex flex-col items-center gap-1.5">
                  <img
                    src={src}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-white/40 shadow-md sm:h-14 sm:w-14"
                  />
                  <span className="text-[10px] font-medium uppercase tracking-wide text-blue-100/85">
                    {t(labelKey)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — form */}
        <div className="flex w-full shrink-0 flex-col justify-start border-t border-gray-100 bg-white px-6 pb-8 pt-5 sm:px-10 sm:pb-10 sm:pt-6 lg:w-[min(100%,460px)] lg:border-l lg:border-t-0 lg:pb-12 lg:pt-8 xl:w-[min(100%,480px)]">
          <div className="mb-4 w-full max-w-sm">
            <LanguageSwitcher />
          </div>
          <div className="mb-6 flex flex-col items-center sm:mb-7">
            {/* mix-blend-multiply: softens baked-in white in the PNG on this white panel */}
            <div className="flex w-full justify-center [isolation:isolate]">
              <img
                src="/logo-careops.png"
                alt=""
                width={400}
                height={400}
                className="h-[11rem] w-auto max-h-[18rem] max-w-[min(100%,26rem)] object-contain mix-blend-multiply sm:h-[13rem] sm:max-h-[20rem] sm:max-w-[28rem]"
              />
            </div>
            <p
              className="mt-3 text-center text-3xl font-extrabold tracking-tight text-[#1565C0] sm:mt-4 sm:text-4xl"
              style={{
                textShadow:
                  '0 1px 0 #fff, 0 2px 0 #e3f2fd, 0 4px 8px rgba(21,101,192,0.35), 0 6px 16px rgba(10,102,255,0.15)',
              }}
            >
              CareOps AI
            </p>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{t('login.signIn')}</h2>
          <p className="mt-1 text-sm text-gray-500">{t('login.credentialsHint')}</p>

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
                  placeholder={t('login.emailPlaceholder')}
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
                  placeholder={t('login.passwordPlaceholder')}
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
              {loading ? t('login.signingIn') : t('login.signIn')}
            </button>

            <button
              type="button"
              className="text-center text-sm text-primary-600 hover:underline"
            >
              {t('login.forgotPassword')}
            </button>

            <p className="text-center text-xs text-gray-500">
              {t('login.troublePrefix')}{' '}
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
    </div>
  );
}
