import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

/**
 * Sesión y rol de la cuenta.
 * status: 'loading' · 'signed-out' · 'denied' (cuenta sin habilitar) · 'ready'
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [role, setRole] = useState(undefined);
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession(data.session ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s ?? null));
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session === undefined) return undefined;
    if (!userId) {
      setRole(null);
      return undefined;
    }
    let alive = true;
    setRole(undefined);
    supabase.rpc('my_role').then(({ data, error }) => {
      if (alive) setRole(error ? null : data ?? null);
    });
    return () => {
      alive = false;
    };
  }, [userId, session]);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  let status = 'ready';
  if (session === undefined || (userId && role === undefined)) status = 'loading';
  else if (!userId) status = 'signed-out';
  else if (!role) status = 'denied';

  return (
    <AuthCtx.Provider value={{ status, session, role, email: session?.user?.email ?? null, signIn, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}
