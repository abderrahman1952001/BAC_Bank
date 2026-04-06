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
type ResolvedAuthStatus = Exclude<AuthStatus, "loading">;

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  refreshSession: () => Promise<AuthUser | null>;
  setSessionUser: (user: AuthUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialUser = null,
  initialStatus,
}: {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
  initialStatus?: ResolvedAuthStatus;
}) {
  const [status, setStatus] = useState<AuthStatus>(() => {
    if (initialStatus) {
      return initialStatus;
    }

    return initialUser ? "authenticated" : "loading";
  });
  const [user, setUser] = useState<AuthUser | null>(initialUser);

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
    if (status !== "loading") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void refreshSession();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [refreshSession, status]);

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
