"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { SessionUser } from "@/lib/types";

type UserState = { user: SessionUser | null; loading: boolean };
const UserContext = createContext<UserState>({ user: null, loading: true });

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UserState>({ user: null, loading: true });

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setState({ user: d.user ?? null, loading: false }))
      .catch(() => setState({ user: null, loading: false }));
  }, []);

  return <UserContext.Provider value={state}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
