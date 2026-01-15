/**
 * @fileoverview Authentication hook for managing user sessions.
 *
 * Provides Supabase authentication functionality including:
 * - Session management (automatic token refresh)
 * - Sign in / Sign up / Sign out methods
 * - Loading states during authentication
 *
 * @example
 * ```tsx
 * function App() {
 *   const { user, loading, signIn, signOut } = useAuth();
 *
 *   if (loading) return <LoadingSpinner />;
 *   if (!user) return <LoginForm onSubmit={signIn} />;
 *
 *   return <Dashboard user={user} onLogout={signOut} />;
 * }
 * ```
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { toast } from 'sonner';

/**
 * Hook for managing authentication state and actions.
 *
 * @returns Object containing:
 * - `user` - Current Supabase User object or null
 * - `session` - Current Supabase Session or null
 * - `loading` - Whether auth state is being determined
 * - `signIn(email, password)` - Sign in with email/password
 * - `signUp(email, password, fullName?)` - Create a new account
 * - `signOut()` - Sign out and clear session
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, !!session);

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Handle sign out - redirect immediately
      if (event === 'SIGNED_OUT') {
        console.log('User signed out - redirecting to auth');
        // Clear any cached data
        localStorage.clear();
        sessionStorage.clear();
        // Force redirect to auth page
        setTimeout(() => {
          navigate('/auth', { replace: true });
        }, 0);
        return;
      }

      // Si el usuario se acaba de registrar, crear su perfil en users
      if (session?.user && event === 'SIGNED_IN') {
        setTimeout(() => {
          ensureUserProfile(session.user);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const ensureUserProfile = async (authUser: User) => {
    try {
      console.log('Ensuring user profile for:', authUser.id);

      // Verificar si ya existe el usuario en la tabla users
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id, organization_id, name')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking existing user:', fetchError);
        return;
      }

      if (!existingUser) {
        console.log('User does not exist, will need to create profile after organization setup');
        // No creamos el usuario automáticamente, esperamos a que cree una organización
      } else {
        console.log('User already exists:', existingUser);
      }
    } catch (error) {
      console.error('Error in ensureUserProfile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting to sign in:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        toast.error(error.message);
      } else {
        console.log('Sign in successful:', data);
        toast.success('¡Bienvenido de vuelta!');
        // Redirect to main page after successful login
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 100);
      }

      return { data, error };
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error('Error al iniciar sesión');
      return { data: null, error: error as AuthError };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      console.log('Attempting to sign up:', email);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email.split('@')[0],
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        console.error('Sign up error:', error);
        toast.error(error.message);
      } else {
        console.log('Sign up successful:', data);
        toast.success('¡Cuenta creada correctamente! Ahora puedes iniciar sesión.');
      }

      return { data, error };
    } catch (error) {
      console.error('Sign up error:', error);
      toast.error('Error al crear cuenta');
      return { data: null, error: error as AuthError };
    }
  };

  const signOut = async () => {
    try {
      console.log('Attempting to sign out');

      // Clear local state first
      setLoading(true);

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Sign out error:', error);
        toast.error('Error al cerrar sesión');
        setLoading(false);
      } else {
        console.log('Sign out successful');
        // Clear all local data
        localStorage.clear();
        sessionStorage.clear();

        // Reset states
        setSession(null);
        setUser(null);
        setLoading(false);

        toast.success('Sesión cerrada correctamente');

        // Force redirect to auth page
        navigate('/auth', { replace: true });
      }

      return { error };
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Error al cerrar sesión');
      setLoading(false);
      return { error };
    }
  };

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };
}
