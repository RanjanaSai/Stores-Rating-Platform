import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { getProfile } from '../services/supabaseService';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      if (session?.user) {
        try {
          const profile = await getProfile(session.user.id);
          // This is the critical fix:
          // We must ensure a profile exists. If not, the user cannot proceed.
          if (profile) {
            setUser({ ...session.user, ...profile });
          } else {
            // This handles the case where a user is authenticated but has no profile row yet (e.g., right after signup).
            // Safest action is to sign them out to prevent an inconsistent state.
            console.warn(`Profile not found for user ${session.user.id}. Signing out.`);
            await supabase.auth.signOut();
            setUser(null);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
          await supabase.auth.signOut();
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const register = async (userData) => {
    const { name, email, address, password } = userData;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          address,
          role: 'user' // Default role for signup
        }
      }
    });
    if (error) return { success: false, error: error.message };
    // Note: You might want to inform the user to check their email for confirmation.
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updatePassword = async (currentPassword, newPassword) => {
    // Supabase doesn’t need currentPassword for updateUser,
    // but keep it here so the function signature matches our call
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  // Admin function to create a user
  const createUser = async (userData) => {
    const { name, email, address, password, role } = userData;
    // This uses the standard signUp but specifies a role.
    // The trigger in the DB will use this role.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          address,
          role
        }
      }
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const value = {
    user,
    login,
    register,
    logout,
    updatePassword,
    createUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
