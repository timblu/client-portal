export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "STAFF" | "CLIENT";
  companyId: string | null;
  companyRole: "COMPANY_ADMIN" | "MEMBER" | null;
  removedAt: string | null;
};

export type SwitchTarget = {
  id: string;
  name: string;
  roleLabel: string;
  companyName: string | null;
};

export type SessionResponse = {
  user: SessionUser | null;
  switchTargets: SwitchTarget[];
};

type ActionResponse = {
  ok?: boolean;
  redirectTo?: string;
  data?: unknown;
  error?: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: "include" });
  if (response.status === 401) {
    // I2: typed catch so `body` is always `{ error?: string }` (avoids TS2339 on `body.error`)
    const body = await readJson<{ error?: string }>(response).catch((): { error?: string } => ({}));
    throw new ApiError(401, body.error ?? "Not signed in.");
  }
  if (!response.ok) {
    const body = await readJson<{ error?: string }>(response);
    throw new ApiError(response.status, body.error ?? response.statusText, body);
  }
  return readJson<T>(response);
}

export async function apiAction(
  action: string,
  body: Record<string, unknown> = {}
): Promise<{ ok: true; redirectTo?: string; data?: unknown } | { ok: false; error: string; status: number }> {
  const response = await fetch(`/api/actions/${action}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await readJson<ActionResponse>(response);
  if (!response.ok || !result.ok) {
    // I6: include HTTP status so callers can detect 401 and redirect to login
    return { ok: false, error: result.error ?? "Request failed.", status: response.status };
  }
  return { ok: true, redirectTo: result.redirectTo, data: result.data };
}

export async function requestMagicLink(email: string): Promise<{
  ok: boolean;
  email?: string;
  devLink?: string;
  error?: string;
}> {
  const response = await fetch("/api/auth/magic-link", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (response.status === 404) {
    return { ok: false, error: "notfound" };
  }
  if (!response.ok) {
    const body = await readJson<{ error?: string }>(response);
    return { ok: false, error: body.error ?? "Request failed." };
  }
  const body = await readJson<{ ok: boolean; email: string; devLink?: string }>(response);
  return { ok: true, email: body.email, devLink: body.devLink };
}

export async function logout(): Promise<void> {
  await fetch("/auth/logout", { method: "POST", credentials: "include" });
}
