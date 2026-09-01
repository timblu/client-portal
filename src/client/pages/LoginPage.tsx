import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { requestMagicLink } from "@/client/api";
import { safeRedirectPath } from "@/lib/safe-redirect";

function buildVerifyHref(token: string, redirect: string | null) {
  const params = new URLSearchParams({ token });
  if (redirect) params.set("redirect", redirect);
  return `/auth/verify?${params.toString()}`;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sent = searchParams.get("sent");
  const email = searchParams.get("email");
  const devlink = searchParams.get("devlink");
  const error = searchParams.get("error");
  const redirect = safeRedirectPath(searchParams.get("redirect"));
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextEmail = String(formData.get("email") ?? "")
      .toLowerCase()
      .trim();
    if (!nextEmail) {
      navigate("/login?error=required");
      return;
    }

    setSubmitting(true);
    const result = await requestMagicLink(nextEmail);
    setSubmitting(false);

    if (!result.ok) {
      const params = new URLSearchParams({
        error: "notfound",
        email: nextEmail,
      });
      if (redirect) params.set("redirect", redirect);
      navigate(`/login?${params.toString()}`);
      return;
    }

    const params = new URLSearchParams({
      sent: "1",
      email: result.email ?? nextEmail,
    });
    if (result.devLink) params.set("devlink", result.devLink);
    if (redirect) params.set("redirect", redirect);
    navigate(`/login?${params.toString()}`);
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <p className="text-sm font-semibold tracking-tight">Review Portal</p>
        <ThemeToggle />
      </header>

      <div className="flex flex-1 items-center justify-center px-6 pb-24">
        <div className="w-full max-w-[440px]">
          <h1 className="text-center text-[2.5rem] font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-center text-sm text-[var(--text-secondary)]">
            We’ll email you a one-time link.
          </p>

          {sent ? (
            <div className="mt-10 space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                If <span className="text-[var(--text-primary)]">{email}</span> has an account, a sign-in
                link was sent.
              </p>
              {devlink ? (
                <div className="wf-panel wf-dash p-4">
                  <p className="wf-tag mb-2">Dev inbox</p>
                  <a
                    href={buildVerifyHref(devlink, redirect)}
                    className="break-all text-sm text-[var(--text-link)] underline"
                  >
                    Open sign-in link
                  </a>
                </div>
              ) : null}
              <Link to="/login" className="wf-link text-sm text-[var(--text-secondary)]">
                Use a different email
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-10">
              {error === "notfound" ? (
                <p className="mb-4 text-sm text-[var(--text-secondary)]">
                  No account for {email ? email : "that email"}. Accounts are invite-only.
                </p>
              ) : null}
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@company.com"
                  className="wf-input h-12 w-full pr-12"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="wf-icon-btn-solid absolute right-1.5 top-1/2 -translate-y-1/2"
                  aria-label="Send sign-in link"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M5 12h14M13 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </form>
          )}

          <details className="mt-16 text-xs text-[var(--text-secondary)]">
            <summary className="cursor-pointer select-none">Demo accounts</summary>
            <ul className="mt-3 space-y-1.5">
              <li>sam@agency.test — staff</li>
              <li>casey@northwind.test — client, approver</li>
              <li>priya@northwind.test — client, comment-only</li>
              <li>devon@alpine.test — client, approver</li>
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}
