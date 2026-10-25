import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { ApiError, onUnauthorized } from "@/services/api";
import { authApi } from "@/services/endpoints";
import type { Me } from "@/types";

interface AuthCtx { me: Me | null; loading: boolean; backendUnavailable: boolean; setMe: (m: Me | null) => void; logout: () => Promise<void> }
const Ctx = createContext<AuthCtx | null>(null);
export const ME_KEY = ["me"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ME_KEY, queryFn: authApi.me, retry: false, staleTime: 5 * 60_000,
    throwOnError: false,
  });
  useEffect(() => onUnauthorized(() => { qc.setQueryData(ME_KEY, null); qc.removeQueries({ predicate: (qq) => qq.queryKey[0] !== "me" }); }), [qc]);
  const me = q.data ?? null;
  const backendUnavailable = Boolean(q.error && !(q.error instanceof ApiError && q.error.status === 401));
  const value: AuthCtx = {
    me, loading: q.isLoading, backendUnavailable,
    setMe: (m) => qc.setQueryData(ME_KEY, m),
    logout: async () => { try { await authApi.logout(); } finally { qc.setQueryData(ME_KEY, null); qc.removeQueries({ predicate: (query) => query.queryKey[0] !== ME_KEY[0] }); } },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
