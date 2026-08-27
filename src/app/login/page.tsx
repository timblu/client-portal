import Link from "next/link";
import { requestMagicLink } from "./actions";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; email?: string; devlink?: string; error?: string }>;
}) {
  const params = await searchParams;

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

          {params.sent ? (
            <div className="mt-10 space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                If <span className="text-[var(--text-primary)]">{params.email}</span> has an account, a
                sign-in link was sent.
              </p>
              {params.devlink ? (
                <div className="wf-panel wf-dash p-4">
                  <p className="wf-tag mb-2">Dev inbox</p>
                  <Link
                    href={`/auth/verify?token=${params.devlink}`}
                    className="break-all text-sm text-[var(--text-link)] underline"
                  >
                    Open sign-in link
                  </Link>
                </div>
              ) : null}
              <Link href="/login" className="wf-link text-sm text-[var(--text-secondary)]">
                Use a different email
              </Link>
            </div>
          ) : (
            <form action={requestMagicLink} className="mt-10">
              {params.error === "notfound" ? (
                <p className="mb-4 text-sm text-[var(--text-secondary)]">
                  No account for {params.email ? params.email : "that email"}. Accounts are
                  invite-only.
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
