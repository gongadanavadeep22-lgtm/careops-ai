import { useEffect, useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  ChevronDown,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Mail,
  Shield,
} from 'lucide-react';
import {
  getFirebaseAuth,
  getMissingFirebaseEnvVars,
  isFirebaseConfigured,
} from '../firebase/config';
import client from '../api/client';
import { dashboardPathForRole } from '../utils/roleRoutes';

const REMEMBER_EMAIL_KEY = 'careops_login_email';

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'ta', label: 'தமிழ்' },
];

function CareOpsLogo({ compact = false }) {
  const iconSize = compact ? 'h-9 w-9' : 'h-10 w-10';
  const svgSize = compact ? 'h-[18px] w-[18px]' : 'h-5 w-5';

  return (
    <div className="flex items-center gap-2">
      <span
        className={`login-brand-icon flex shrink-0 items-center justify-center rounded-lg ${iconSize}`}
      >
        <svg viewBox="0 0 24 24" className={svgSize} aria-hidden>
          <path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4z" fill="white" />
          <circle cx="12" cy="12" r="2" fill="white" />
        </svg>
      </span>
      <span className={`font-bold tracking-tight ${compact ? 'text-base' : 'text-lg'}`}>
        <span className="text-gray-900">CareOps </span>
        <span className="login-brand-blue">AI</span>
      </span>
    </div>
  );
}

function LoginLanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const base = (i18n.language || 'en').split('-')[0];
  const value = LANGUAGE_OPTIONS.some((o) => o.code === base) ? base : 'en';

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t('nav.language')}</span>
      <Globe className="pointer-events-none absolute left-3 h-4 w-4 text-gray-500" aria-hidden />
      <select
        value={value}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        aria-label={t('nav.language')}
        className="h-9 cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white py-0 pl-8 pr-8 text-sm font-medium text-gray-600 login-input-focus"
      >
        {LANGUAGE_OPTIONS.map(({ code, label }) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-gray-400" aria-hidden />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 23 23" aria-hidden>
      <path fill="#f25022" d="M1 1h10v10H1z" />
      <path fill="#00a4ef" d="M12 1h10v10H12z" />
      <path fill="#7fba00" d="M1 12h10v10H1z" />
      <path fill="#ffb900" d="M12 12h10v10H12z" />
    </svg>
  );
}

function apiUrlConfigured() {
  const raw = import.meta.env.VITE_API_URL;
  return typeof raw === 'string' && raw.trim().length > 0;
}

function firebaseConfigErrorMessage(t) {
  const missing = getMissingFirebaseEnvVars();
  const list = missing.length ? missing.join(', ') : 'VITE_FIREBASE_*';
  if (import.meta.env.PROD) return t('login.errorFirebaseProd', { list });
  return t('login.errorFirebaseDev', { list });
}

function loginErrorMessage(err, t) {
  const code = err?.code;
  if (typeof code === 'string' && code.startsWith('auth/')) {
    const key = `login.${code.replace(/\//g, '_').replace(/-/g, '_')}`;
    const translated = t(key, { defaultValue: '' });
    if (translated && translated !== key) return translated;
    return err.message || t('login.auth_generic');
  }
  const status = err?.response?.status;
  if (status === 404) return t('login.errorAccount404');
  if (status === 401) return t('login.error401');
  const apiMsg = err?.response?.data?.error;
  if (typeof apiMsg === 'string' && apiMsg.trim()) return apiMsg;
  const msg = err?.message || '';
  if (msg === 'Network Error' || msg === 'Failed to fetch') {
    if (import.meta.env.PROD) return t('login.errorNetwork');
    const api = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');
    return t('login.errorNetworkDev', { api, origin: window.location.origin });
  }
  return msg || t('login.errorLoginGeneric');
}

function LoginHeroPanel() {
  const { t } = useTranslation();

  return (
    <>
      {/* Desktop — full hero artwork (your provided panel) */}
      <aside className="login-hero-panel relative hidden min-h-screen w-1/2 shrink-0 lg:block">
        <img
          src="/login-hero-panel.png"
          alt=""
          className="login-hero-img"
          decoding="sync"
          fetchPriority="high"
        />
        <span className="sr-only">
          {t('login.heroWelcome')} {t('login.heroBrand')}. {t('login.heroDescription')}
        </span>
      </aside>

      {/* Mobile — compact hero strip */}
      <div className="login-hero-panel relative h-32 w-full shrink-0 sm:h-36 lg:hidden">
        <img
          src="/login-hero-panel.png"
          alt=""
          className="login-hero-img"
        />
      </div>
    </>
  );
}

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!apiUrlConfigured()) {
      setError(import.meta.env.PROD ? t('login.errorApiUrlProd') : t('login.errorApiUrlDev'));
      setLoading(false);
      return;
    }
    if (!isFirebaseConfigured()) {
      setError(firebaseConfigErrorMessage(t));
      setLoading(false);
      return;
    }

    try {
      if (rememberMe) localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
      else localStorage.removeItem(REMEMBER_EMAIL_KEY);

      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      const { data } = await client.get('/api/auth/me');
      const rawRole = typeof data.role === 'string' ? data.role.trim().toLowerCase() : '';
      const destination = dashboardPathForRole(rawRole);
      if (destination === '/login') {
        await signOut(getFirebaseAuth());
        throw new Error(t('login.errorRoleUnknown'));
      }
      navigate(destination, { replace: true });
    } catch (err) {
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

  const inputClass =
    'login-input-focus w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-[16px] text-gray-900 placeholder:text-gray-400';

  const linkClass = 'login-brand-link text-sm hover:underline';

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <LoginHeroPanel />

      <main className="login-auth-bg relative flex min-h-0 w-full flex-1 flex-col lg:min-h-screen lg:w-1/2">
        <div className="flex justify-end px-5 pt-5 sm:px-8 sm:pt-6 lg:absolute lg:right-8 lg:top-6 lg:z-20 lg:px-0 lg:pt-0">
          <LoginLanguageSwitcher />
        </div>

        <div className="flex flex-1 flex-col justify-center px-5 pb-6 pt-2 sm:px-8 lg:px-10 lg:py-8">
          <div className="login-auth-card mx-auto w-full max-w-[400px] px-6 py-6 sm:px-8 sm:py-7">
            <div className="mb-5">
              <CareOpsLogo compact />
            </div>

            <div className="mb-5">
              <h2 className="text-2xl font-bold text-gray-900">{t('login.welcomeBack')}</h2>
              <p className="mt-1 text-sm text-gray-500">{t('login.signInContinue')}</p>
            </div>

            {error && (
              <p
                role="alert"
                className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
              <div>
                <label htmlFor="login-email" className="mb-1 block text-sm font-semibold text-gray-800">
                  {t('login.emailLabel')}
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-gray-400" aria-hidden />
                  <input
                    id="login-email"
                    type="email"
                    placeholder={t('login.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="mb-1 block text-sm font-semibold text-gray-800">
                  {t('login.passwordLabel')}
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-gray-400" aria-hidden />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('login.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  >
                    {showPassword ? (
                      <EyeOff className="h-[17px] w-[17px]" aria-hidden />
                    ) : (
                      <Eye className="h-[17px] w-[17px]" aria-hidden />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-0.5">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 accent-[#2563eb]"
                  />
                  {t('login.rememberMe')}
                </label>
                <button type="button" className={linkClass}>
                  {t('login.forgotPassword')}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="login-brand-btn flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm text-white transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? t('login.signingIn') : t('login.signIn')}
                {!loading && <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />}
              </button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full border-t border-gray-200" />
              </div>
              <p className="relative mx-auto w-fit bg-white px-2 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                {t('login.orContinueWith')}
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setError(t('login.ssoUnavailable'))}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <GoogleIcon />
                {t('login.continueGoogle')}
              </button>
              <button
                type="button"
                onClick={() => setError(t('login.ssoUnavailable'))}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <MicrosoftIcon />
                {t('login.continueMicrosoft')}
              </button>
            </div>

            <p className="mt-4 text-center text-sm text-gray-600">
              {t('login.noAccount')}{' '}
              <Link to="/patients/register" className={`${linkClass} font-semibold`}>
                {t('login.createOne')}
              </Link>
            </p>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-400">
              <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {t('login.secureData')}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
