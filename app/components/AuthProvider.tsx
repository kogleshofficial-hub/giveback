"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  error: null,
});

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const supabase = createClient();

    const loadSession = async () => {
      try {
        setError(null);

        const result = await supabase.auth.getSession();

        if (!active) return;

        if (result.error) {
          setSession(null);
          setError(result.error.message);
        } else {
          setSession(result.data.session);
        }
      } catch (err) {
        if (!active) return;

        setSession(null);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to restore your authentication session."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;

      setSession(nextSession);
      setLoading(false);
      setError(null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
