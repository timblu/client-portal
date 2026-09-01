import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiGet, ApiError, type SessionResponse } from "@/client/api";

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

type RouteDataEntry<T> = {
  fetchKey: string;
  data: T | null;
  error: Error | null;
  done: boolean;
};

export function useRouteData<T>(path: string) {
  const { revalidateKey } = useRouteState();
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
        if (!cancelled) {
          setEntry({
            fetchKey,
            data: null,
            error: caught instanceof Error ? caught : new Error("Failed to load data."),
            done: true,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fetchKey, path]);

  const stale = entry.fetchKey !== fetchKey;
  return {
    data: stale ? null : entry.data,
    error: stale ? null : entry.error,
    loading: stale || !entry.done,
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
