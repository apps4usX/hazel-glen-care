// Auth context: holds the current user, exposes login/logout, and guards pages.
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { api, tokenStore } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, if we have a token, resolve the current user.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!tokenStore.get()) { setLoading(false); return; }
      try {
        const { user } = await api.auth.me();
        if (active) setUser(user);
      } catch {
        tokenStore.clear();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user } = await api.auth.login(email, password);
    tokenStore.set(token);
    // hydrate full profile
    try { const me = await api.auth.me(); setUser(me.user); } catch { setUser(user); }
    return user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

/** Wrap a page component to require auth (and optionally a role). */
export function withAuth(Component, { role } = {}) {
  return function Guarded(props) {
    const { user, loading } = useAuth();
    const router = useRouter();
    useEffect(() => {
      if (loading) return;
      if (!user) router.replace('/login');
      else if (role && user.role !== role) router.replace('/login');
    }, [user, loading, router]);

    if (loading || !user || (role && user.role !== role)) {
      return <div style={{ padding: 40, fontFamily: 'Inter, sans-serif' }}>Loading…</div>;
    }
    return <Component {...props} />;
  };
}
