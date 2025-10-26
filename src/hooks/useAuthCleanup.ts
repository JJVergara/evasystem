import { supabase } from "@/integrations/supabase/client";

/**
 * Comprehensive auth state cleanup utility to prevent limbo states
 * when users switch accounts or experience authentication issues
 */
export const cleanupAuthState = () => {
  console.log('Cleaning up authentication state...');
  
  // Remove standard Supabase auth tokens
  localStorage.removeItem('supabase.auth.token');
  
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
      console.log(`Removed localStorage key: ${key}`);
    }
  });
  
  // Remove from sessionStorage if in use
  if (typeof sessionStorage !== 'undefined') {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
        console.log(`Removed sessionStorage key: ${key}`);
      }
    });
  }
  
  console.log('Auth state cleanup completed');
};

/**
 * Enhanced sign out function that ensures complete cleanup
 */
export const performSecureSignOut = async (): Promise<void> => {
  try {
    console.log('Performing secure sign out...');
    
    // Step 1: Clean up local storage first
    cleanupAuthState();
    
    // Step 2: Attempt global sign out (ignore errors)
    try {
      await supabase.auth.signOut({ scope: 'global' });
      console.log('Global sign out successful');
    } catch (signOutError) {
      console.warn('Global sign out failed (continuing anyway):', signOutError);
    }
    
    // Step 3: Force page reload for clean state
    console.log('Redirecting to clean state...');
    window.location.href = '/auth';
    
  } catch (error) {
    console.error('Error during secure sign out:', error);
    // Force redirect even if there are errors
    window.location.href = '/auth';
  }
};

/**
 * Enhanced sign in function that ensures clean state before authentication
 */
export const performSecureSignIn = async (email: string, password: string): Promise<void> => {
  try {
    console.log('Performing secure sign in...');
    
    // Step 1: Clean up any existing state
    cleanupAuthState();
    
    // Step 2: Attempt global sign out to clear any server-side sessions
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.warn('Cleanup sign out failed (continuing):', error);
    }
    
    // Step 3: Sign in with email/password
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      throw error;
    }
    
    if (data.user) {
      console.log('Sign in successful, redirecting...');
      // Force page reload to ensure clean state
      window.location.href = '/';
    }
    
  } catch (error) {
    console.error('Secure sign in error:', error);
    throw error;
  }
};

/**
 * Hook for components that need auth cleanup functionality
 */
export const useAuthCleanup = () => {
  return {
    cleanupAuthState,
    performSecureSignOut,
    performSecureSignIn,
  };
};