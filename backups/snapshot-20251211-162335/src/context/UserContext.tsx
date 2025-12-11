"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type UserContextType = {
  user: any | null;
  loading: boolean;
  logout: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  logout: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseBrowser();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user ?? null);
      setLoading(false);
    }

    loadUser();

    // Listener de login/logout
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/login"; // redireciona automaticamente
  }

  return (
    <UserContext.Provider value={{ user, loading, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
