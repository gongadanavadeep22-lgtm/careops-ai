import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const { data } = await client.get('/api/auth/me');
          const normalizedRole =
            typeof data.role === 'string' && data.role.trim()
              ? data.role.trim().toLowerCase()
              : null;
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.debug('[CareOps auth]', {
              path: '/api/auth/me',
              uid: data.uid,
              role: normalizedRole,
            });
          }
          setUser({
            uid: data.uid,
            email: firebaseUser.email,
            name: data.name,
            clinicId: data.clinicId,
          });
          setRole(normalizedRole);
        } catch (err) {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.warn('[CareOps auth] /api/auth/me failed', err?.response?.status, err?.message);
          }
          setUser(null);
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx == null) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
