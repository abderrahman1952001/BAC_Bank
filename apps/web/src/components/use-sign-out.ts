"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthSession } from "@/components/auth-provider";

export function useSignOut() {
  const clerk = useClerk();
  const router = useRouter();
  const { setSessionUser } = useAuthSession();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await clerk.signOut();
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
