
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { getProfile } from "../services/supabaseService";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ fetch session safely inside useEffect
    const initAuth = async () => {
      setLoading(true);

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error fetching session:", error);
        setUser(null);
        setLoading(false);
        return;
      }

      if (data.session?.user) {
        try {
          const profile = await getProfile(data.session.user.id);
          if (profile) {
            setUser({ ...data.session.user, ...profile });
          } else {
            console.warn("No profile found → signing out");
            await supabase.auth.signOut();
            setUser(null);
          }
        } catch (err) {
          console.error("Error fetching profile:", err);
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    };

    initAuth();

    // ✅ listen for login/logout events
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const profile = await getProfile(session.user.id);
          setUser({ ...session.user, ...profile });
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  // ---------- auth methods ----------
  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const register = async ({ name, email, address, password }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, address, role: "user" } },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const createUser = async ({ name, email, address, password, role }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, address, role } },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updatePassword,
    createUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="h-screen flex items-center justify-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

