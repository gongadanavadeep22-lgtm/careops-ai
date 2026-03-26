import { NavLink, useNavigate } from 'react-router-dom';
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

const ROLE_BADGE_CLASS = {
  nurse: 'bg-blue-100 text-blue-800 border border-blue-200',
  doctor: 'bg-green-100 text-green-800 border border-green-200',
  pharmacist: 'bg-purple-100 text-purple-800 border border-purple-200',
  patient: 'bg-gray-100 text-gray-800 border border-gray-200',
  ops: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
};

/** Default profile photos per role (sidebar). Ops/demo keep letter fallback. */
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
        { to: '/nurse', label: 'Dashboard', Icon: Home },
        { to: '/patients/waiting', label: 'Appointments', Icon: Calendar },
        { to: '/patients/register', label: 'Patients', Icon: Users },
        { to: '/appointments/book', label: 'Book Appointment', Icon: Plus },
      ];
    case 'doctor':
      return [
        { to: '/doctor', label: 'Dashboard', Icon: Home },
        { to: '/patients/waiting', label: 'Appointments', Icon: Calendar },
        { to: '/patients/register', label: 'Patients', Icon: Users },
        { to: '/pharmacy', label: 'Pharmacy', Icon: Package },
      ];
    case 'pharmacist':
      return [
        { to: '/pharmacy', label: 'Dashboard', Icon: Home },
        { to: '/pharmacy', label: 'Queue', Icon: List },
        { to: '/pharmacy', label: 'Completed', Icon: CheckCircle },
      ];
    case 'patient':
      return [
        { to: '/patient', label: 'Dashboard', Icon: Home },
        { to: '/patient', label: 'Profile', Icon: User },
        { to: '/patient', label: 'Symptoms', Icon: Heart },
        { to: '/patient', label: 'Appointments', Icon: Calendar },
        { to: '/patient', label: 'Lab Reports', Icon: FileText },
      ];
    case 'ops':
      return [
        { to: '/ops', label: 'Dashboard', Icon: Home },
        { to: '/patients/waiting', label: 'Appointments', Icon: Calendar },
        { to: '/patients/register', label: 'Patients', Icon: Users },
        { to: '/appointments/book', label: 'Book Appointment', Icon: Plus },
      ];
    default:
      return [{ to: '/demo', label: 'Dashboard', Icon: Home }];
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
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const items = navItemsForRole(role);

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
        <p className="pl-[44px] text-xs text-gray-500">AI-Powered Healthcare</p>
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
              {user?.name?.trim() || user?.email || 'User'}
            </p>
            {user?.email && (
              <p className="truncate text-xs text-gray-500">{user.email}</p>
            )}
            {role && (
              <span
                className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}
              >
                {role}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
        {items.map(({ to, label, Icon }) => (
          <NavLink
            key={`${to}-${label}`}
            to={to}
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
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="shrink-0 border-t border-gray-100 p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <LogOut className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
          Logout
        </button>
      </div>
    </aside>
  );
}
