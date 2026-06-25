import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import RoleRoute from '../components/RoleRoute';

const useAuthMock = vi.fn();

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../components/LoadingSpinner', () => ({
  default: () => <div data-testid="loading">loading</div>,
}));

function renderProtected(user, loading = false) {
  useAuthMock.mockReturnValue({ user, loading, role: user?.role });
  return render(
    <MemoryRouter initialEntries={['/secret']}>
      <Routes>
        <Route
          path="/secret"
          element={
            <ProtectedRoute>
              <div>protected content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function renderRoleRoute(role, allowedRoles, loading = false) {
  useAuthMock.mockReturnValue({ role, loading, user: role ? { uid: '1' } : null });
  return render(
    <MemoryRouter initialEntries={['/role']}>
      <Routes>
        <Route
          path="/role"
          element={
            <RoleRoute allowedRoles={allowedRoles}>
              <div>role content</div>
            </RoleRoute>
          }
        />
        <Route path="/login" element={<div>login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows spinner while auth is loading', () => {
    renderProtected(null, true);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login', () => {
    renderProtected(null, false);
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('renders children when user is signed in', () => {
    renderProtected({ uid: 'abc' }, false);
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });
});

describe('RoleRoute', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('allows matching role', () => {
    renderRoleRoute('doctor', ['doctor']);
    expect(screen.getByText('role content')).toBeInTheDocument();
  });

  it('redirects when role is not allowed', () => {
    renderRoleRoute('patient', ['doctor']);
    expect(screen.getByText('login page')).toBeInTheDocument();
  });
});
