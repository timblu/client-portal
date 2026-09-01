import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiAction, apiGet, ApiError, type SessionResponse } from "@/client/api";

type RouteStateContextValue = {
  session: SessionResponse | null;
  sessionLoading: boolean;
  sessionError: Error | null;
  refreshSession: () => Promise<void>;
  revalidateKey: number;
  revalidate: () => void;
};

const RouteStateContext = createContext<RouteStateContextValue | null>(null);

export function RouteStateProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<Error | null>(null);
  const [revalidateKey, setRevalidateKey] = useState(0);

  const refreshSession = useCallback(async () => {
    try {
      const data = await apiGet<SessionResponse>("/api/session");
      setSession(data);
      setSessionError(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setSession({ user: null, switchTargets: [] });
        setSessionError(null);
        return;
      }
      setSessionError(error instanceof Error ? error : new Error("Failed to load session."));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async session bootstrap
    void refreshSession().finally(() => {
      if (!cancelled) setSessionLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  const revalidate = useCallback(() => {
    setRevalidateKey((value) => value + 1);
  }, []);

  const value = useMemo(
    () => ({
      session,
      sessionLoading,
      sessionError,
      refreshSession,
      revalidateKey,
      revalidate,
    }),
    [session, sessionLoading, sessionError, refreshSession, revalidateKey, revalidate]
  );

  return <RouteStateContext.Provider value={value}>{children}</RouteStateContext.Provider>;
}

export function useRouteState() {
  const context = useContext(RouteStateContext);
  if (!context) {
    throw new Error("useRouteState must be used within RouteStateProvider.");
  }
  return context;
}

export function useRevalidate() {
  return useRouteState().revalidate;
}

/**
 * I6 – Centralized mutation action runner.
 *
 * Wraps `apiAction` so that any 401 response automatically:
 *   1. Refreshes the session (clears client-side user state)
 *   2. Performs a full navigate to /login with the current path as ?redirect=
 *
 * Use this hook in all components instead of calling `apiAction` directly.
 */
export function useApiAction() {
  const { refreshSession } = useRouteState();
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    async (
      action: string,
      body: Record<string, unknown> = {}
    ): ReturnType<typeof apiAction> => {
      const result = await apiAction(action, body);
      if (!result.ok && result.status === 401) {
        await refreshSession(); // clear client session state
        const redirect = encodeURIComponent(location.pathname + location.search);
        navigate(`/login?redirect=${redirect}`, { replace: true });
      }
      return result;
    },
    [refreshSession, navigate, location.pathname, location.search]
  );
}

type RouteDataEntry<T> = {
  fetchKey: string;
  data: T | null;
  error: Error | null;
  done: boolean;
};

export function useRouteData<T>(path: string) {
  const { revalidateKey, refreshSession } = useRouteState();
  const navigate = useNavigate();
  const location = useLocation();
  const fetchKey = `${path}::${revalidateKey}`;
  const [entry, setEntry] = useState<RouteDataEntry<T>>({
    fetchKey: "",
    data: null,
    error: null,
    done: false,
  });

  useEffect(() => {
    let cancelled = false;
    void apiGet<T>(path)
      .then((data) => {
        if (!cancelled) {
          setEntry({ fetchKey, data, error: null, done: true });
        }
      })
      .catch((caught) => {
        if (cancelled) return;
        if (caught instanceof ApiError && caught.status === 401) {
          void refreshSession();
          const redirect = encodeURIComponent(location.pathname + location.search);
          navigate(`/login?redirect=${redirect}`, { replace: true });
          return;
        }
        setEntry({
          fetchKey,
          data: null,
          error: caught instanceof Error ? caught : new Error("Failed to load data."),
          done: true,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [fetchKey, path, refreshSession, navigate, location.pathname, location.search]);

  // I1: distinguish a *path change* (different route, must not show old data) from a
  // same-path revalidation (key bump, may show stale data while refreshing).
  const isPathChange = !entry.fetchKey.startsWith(`${path}::`);
  const revalidating = entry.fetchKey !== fetchKey;
  return {
    data: isPathChange ? null : entry.data,
    error: revalidating ? null : entry.error,
    loading: isPathChange || (!entry.done && entry.data === null),
  };
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8 text-sm text-[var(--text-secondary)]">
      {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8 text-sm text-[var(--text-secondary)]">
      {message}
    </div>
  );
}
