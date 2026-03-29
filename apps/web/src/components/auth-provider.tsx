"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AuthUser, getCurrentUser } from "@/lib/client-auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  refreshSession: () => Promise<AuthUser | null>;
  setSessionUser: (user: AuthUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      const payload = await getCurrentUser();
      setUser(payload.user);
      setStatus("authenticated");
      return payload.user;
    } catch {
      setUser(null);
      setStatus("unauthenticated");
      return null;
    }
  }, []);

  function setSessionUser(nextUser: AuthUser | null) {
    setUser(nextUser);
    setStatus(nextUser ? "authenticated" : "unauthenticated");
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshSession();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [refreshSession]);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        refreshSession,
        setSessionUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthSession() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthSession must be used within AuthProvider.");
  }

  return context;
}
