"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface SessionContextType {
  sessionId: Id<"users"> | null;
  sessionEmail: string | null;
  profile: any;
  isReady: boolean;
  setSession: (userId: string, email: string) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextType>({
  sessionId: null,
  sessionEmail: null,
  profile: null,
  isReady: false,
  setSession: () => {},
  clearSession: () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<Id<"users"> | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedId = localStorage.getItem("radar_user_id");
        const storedEmail = localStorage.getItem("or_email");
        if (storedId) {
          setSessionId(storedId as Id<"users">);
        }
        if (storedEmail) {
          setSessionEmail(storedEmail);
        }
      } catch (e) {
        console.warn("Could not read session from localStorage:", e);
      }
      setIsReady(true);
    }
  }, []);

  const profile = useQuery(
    api.users.getProfile,
    sessionId ? { userId: sessionId } : "skip"
  );

  const setSession = (userId: string, email: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("radar_user_id", userId);
      localStorage.setItem("or_email", email);
    }
    setSessionId(userId as Id<"users">);
    setSessionEmail(email);
  };

  const clearSession = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("radar_user_id");
      localStorage.removeItem("or_email");
    }
    setSessionId(null);
    setSessionEmail(null);
  };

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        sessionEmail,
        profile,
        isReady,
        setSession,
        clearSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
