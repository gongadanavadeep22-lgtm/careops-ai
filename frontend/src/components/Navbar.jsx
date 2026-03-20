import { useAuth } from '../hooks/useAuth';

const ROLE_COLORS = {
  nurse: 'bg-green-100 text-green-800',
  doctor: 'bg-blue-100 text-blue-800',
  pharmacist: 'bg-purple-100 text-purple-800',
  ops: 'bg-yellow-100 text-yellow-800',
};

export default function Navbar() {
  const { user, role, logout } = useAuth();

  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm">
      <span className="text-xl font-bold text-blue-700">CareOps AI</span>

      <div className="flex items-center gap-4">
        {role && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ROLE_COLORS[role] || 'bg-gray-100 text-gray-700'}`}>
            {role}
          </span>
        )}
        {user && (
          <span className="text-sm text-gray-600">{user.email}</span>
        )}
        <button
          onClick={logout}
          className="text-sm px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
