import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Calendar,
  Users,
  Plus,
  Package,
  List,
  CheckCircle,
  User,
  Heart,
  FileText,
  LogOut,
  Stethoscope,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import LanguageSwitcher from './LanguageSwitcher';

const ROLE_BADGE_CLASS = {
  nurse: 'bg-blue-100 text-blue-800 border border-blue-200',
  doctor: 'bg-green-100 text-green-800 border border-green-200',
  pharmacist: 'bg-purple-100 text-purple-800 border border-purple-200',
  patient: 'bg-gray-100 text-gray-800 border border-gray-200',
  ops: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
};

/** Default profile photos per role (sidebar). */
const ROLE_AVATAR_SRC = {
  patient: '/avatars/patient.jpg',
  nurse: '/avatars/nurse.jpg',
  doctor: '/avatars/doctor-male.jpg',
  pharmacist: '/avatars/pharmacist.jpg',
};

const ROLE_AVATAR_BADGE = {
  patient: User,
  nurse: Heart,
  doctor: Stethoscope,
  pharmacist: Package,
};

function navItemsForRole(role) {
  switch (role) {
    case 'nurse':
      return [
        { to: '/nurse', labelKey: 'navItems.dashboard', Icon: Home, end: true },
        { to: '/patients/waiting', labelKey: 'navItems.appointments', Icon: Calendar },
        { to: '/patients/register', labelKey: 'navItems.patients', Icon: Users },
        { to: '/nurse?view=book', labelKey: 'navItems.bookAppointment', Icon: Plus },
      ];
    case 'doctor':
      return [
        { to: '/doctor', labelKey: 'navItems.dashboard', Icon: Home },
        { to: '/patients/waiting', labelKey: 'navItems.appointments', Icon: Calendar },
        { to: '/patients/register', labelKey: 'navItems.patients', Icon: Users },
        { to: '/pharmacy', labelKey: 'navItems.pharmacy', Icon: Package },
      ];
    case 'pharmacist':
      return [
        { to: '/pharmacy', labelKey: 'navItems.dashboard', Icon: Home },
        { to: '/pharmacy', labelKey: 'navItems.queue', Icon: List },
        { to: '/pharmacy', labelKey: 'navItems.completed', Icon: CheckCircle },
      ];
    case 'patient':
      return [
        { to: '/patient', labelKey: 'navItems.dashboard', Icon: Home },
        { to: '/patient', labelKey: 'navItems.profile', Icon: User },
        { to: '/patient', labelKey: 'navItems.symptoms', Icon: Heart },
        { to: '/patient', labelKey: 'navItems.appointments', Icon: Calendar },
        { to: '/patient', labelKey: 'navItems.labReports', Icon: FileText },
      ];
    case 'ops':
      return [
        { to: '/ops', labelKey: 'navItems.dashboard', Icon: Home },
        { to: '/patients/waiting', labelKey: 'navItems.appointments', Icon: Calendar },
        { to: '/patients/register', labelKey: 'navItems.patients', Icon: Users },
        { to: '/appointments/book', labelKey: 'navItems.bookAppointment', Icon: Plus },
      ];
    default:
      return [{ to: '/login', labelKey: 'navItems.dashboard', Icon: Home }];
  }
}

function avatarLetter(user) {
  const name = user?.name && String(user.name).trim();
  if (name) return name[0].toUpperCase();
  const email = user?.email && String(user.email).trim();
  if (email) return email[0].toUpperCase();
  return 'U';
}

export default function Navbar() {
  const { t } = useTranslation();
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const items = navItemsForRole(role);
  const roleLabel = role && t(`role.${role}`, { defaultValue: role });

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const badgeClass = ROLE_BADGE_CLASS[role] || 'bg-gray-100 text-gray-700 border border-gray-200';
  const avatarSrc = role && ROLE_AVATAR_SRC[role] ? ROLE_AVATAR_SRC[role] : null;
  const AvatarBadge = role && ROLE_AVATAR_BADGE[role] ? ROLE_AVATAR_BADGE[role] : null;

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col border-r border-[#e2e8f0] bg-white"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex shrink-0 flex-col gap-1 px-5 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
            <Plus className="h-5 w-5 stroke-[2.5]" aria-hidden />
          </span>
          <span className="text-lg font-bold text-gray-900">CareOps AI</span>
        </div>
        <p className="pl-[44px] text-xs text-gray-500">{t('nav.tagline')}</p>
      </div>

      {/* Profile */}
      <div className="shrink-0 border-b border-gray-100 px-5 pb-4">
        <div className="flex items-start gap-3">
          <div className="relative h-10 w-10 shrink-0" aria-hidden>
            {avatarSrc ? (
              <>
                <img
                  src={avatarSrc}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover shadow-sm ring-2 ring-white"
                />
                {AvatarBadge && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 ring-2 ring-white">
                    <AvatarBadge className="h-2.5 w-2.5 text-white" strokeWidth={2.5} aria-hidden />
                  </span>
                )}
              </>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                {avatarLetter(user)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {user?.name?.trim() || user?.email || t('role.user')}
            </p>
            {user?.email && (
              <p className="truncate text-xs text-gray-500">{user.email}</p>
            )}
            {role && (
              <span
                className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}
              >
                {roleLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
        {items.map(({ to, labelKey, Icon, end }) => (
          <NavLink
            key={`${to}-${labelKey}`}
            to={to}
            end={end}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg border-l-4 px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary-600 bg-primary-100 text-primary-700'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              ].join(' ')
            }
          >
            <Icon className="h-5 w-5 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="shrink-0 border-t border-gray-100 p-4 space-y-3">
        <LanguageSwitcher />
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <LogOut className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
          {t('nav.logout')}
        </button>
      </div>
    </aside>
  );
}
