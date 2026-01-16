import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { toast } from 'sonner';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      void ('Auth state changed:', event, !!session);

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === 'SIGNED_OUT') {
        void ('User signed out - redirecting to auth');
        localStorage.clear();
        sessionStorage.clear();
        setTimeout(() => {
          navigate('/auth', { replace: true });
        }, 0);
        return;
      }

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
      void ('Ensuring user profile for:', authUser.id);

      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id, organization_id, name')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (fetchError) {
        void ('Error checking existing user:', fetchError);
        return;
      }

      if (!existingUser) {
        void ('User does not exist, will need to create profile after organization setup');
      } else {
        void ('User already exists:', existingUser);
      }
    } catch (error) {
      void ('Error in ensureUserProfile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      void ('Attempting to sign in:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        void ('Sign in error:', error);
        toast.error(error.message);
      } else {
        void ('Sign in successful:', data);
        toast.success('¡Bienvenido de vuelta!');
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 100);
      }

      return { data, error };
    } catch (error) {
      void ('Sign in error:', error);
      toast.error('Error al iniciar sesión');
      return { data: null, error: error as AuthError };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      void ('Attempting to sign up:', email);

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
        void ('Sign up error:', error);
        toast.error(error.message);
      } else {
        void ('Sign up successful:', data);
        toast.success('¡Cuenta creada correctamente! Ahora puedes iniciar sesión.');
      }

      return { data, error };
    } catch (error) {
      void ('Sign up error:', error);
      toast.error('Error al crear cuenta');
      return { data: null, error: error as AuthError };
    }
  };

  const signOut = async () => {
    try {
      void ('Attempting to sign out');

      setLoading(true);

      const { error } = await supabase.auth.signOut();

      if (error) {
        void ('Sign out error:', error);
        toast.error('Error al cerrar sesión');
        setLoading(false);
      } else {
        void ('Sign out successful');
        localStorage.clear();
        sessionStorage.clear();

        setSession(null);
        setUser(null);
        setLoading(false);

        toast.success('Sesión cerrada correctamente');

        navigate('/auth', { replace: true });
      }

      return { error };
    } catch (error) {
      void ('Sign out error:', error);
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
