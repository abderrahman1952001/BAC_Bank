"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthSession } from "@/components/auth-provider";
import { logoutUser } from "@/lib/client-auth";

export function useSignOut() {
  const router = useRouter();
  const { setSessionUser } = useAuthSession();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await logoutUser();
    } finally {
      setSessionUser(null);
      router.replace("/auth");
      setIsSigningOut(false);
    }
  }

  return {
    isSigningOut,
    signOut,
  };
}
