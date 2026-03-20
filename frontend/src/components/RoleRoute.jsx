import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

export default function RoleRoute({ children, allowedRoles }) {
  const { role, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!allowedRoles.includes(role)) return <Navigate to="/login" replace />;

  return children;
}
