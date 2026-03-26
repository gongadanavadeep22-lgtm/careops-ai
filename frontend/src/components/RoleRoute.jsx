import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

export default function RoleRoute({ children, allowedRoles }) {
  const { role, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  const normalized = role != null ? String(role).toLowerCase().trim() : '';
  const allowed = allowedRoles.map((r) => String(r).toLowerCase());
  if (!normalized || !allowed.includes(normalized)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
