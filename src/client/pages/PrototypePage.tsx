import { useEffect } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { postScreenMessage, readNavigateMessage } from "@/lib/prototype-bridge";

type Screen = "cart" | "shipping" | "confirmation";
const SCREENS: Screen[] = ["cart", "shipping", "confirmation"];

function isScreen(value: string | undefined): value is Screen {
  return !!value && SCREENS.includes(value as Screen);
}

/** Multi-page checkout demo. Each screen is a real URL path so comment anchoring
 * works the same way as any same-origin hosted prototype URL. */
export function PrototypePage() {
  const { screen: screenParam } = useParams();
  const navigate = useNavigate();
  const screen = isScreen(screenParam) ? screenParam : null;

  // Optional bridge for parents that prefer postMessage; URL observation is primary.
  useEffect(() => {
    if (!screen) return;
    if (window.parent !== window) {
      postScreenMessage(
        window.parent,
        `${window.location.pathname}${window.location.search}${window.location.hash}`
      );
    }
  }, [screen]);

  useEffect(() => {
    if (!screen) return;
    function onMessage(e: MessageEvent) {
      const target = readNavigateMessage(e.data);
      if (!target) return;
      // Accept full path keys (/proto/checkout/shipping) or bare screen ids (shipping).
      const match = SCREENS.find(
        (s) => target === s || target.endsWith(`/proto/checkout/${s}`) || target.endsWith(`/${s}`)
      );
      if (match && match !== screen) navigate(`/proto/checkout/${match}`);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [navigate, screen]);

  if (!screen) {
    return <Navigate to="/proto/checkout/cart" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-page)] p-6 font-sans">
      <div className="wf-panel w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-2">
          <span className="text-xs font-semibold">Checkout prototype</span>
          <span className="text-[0.625rem] uppercase text-[var(--text-tertiary)]">{screen}</span>
        </div>

        {screen === "cart" ? (
          <div className="p-5">
            <h2 className="text-sm font-semibold">Your cart</h2>
            <div className="mt-4 space-y-3 border-y border-[var(--border-subtle)] py-3">
              <div className="flex justify-between text-sm">
                <span>Trail jacket — M</span>
                <span>$128</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Wool socks (2)</span>
                <span>$18</span>
              </div>
            </div>
            <div className="mt-3 flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span>$146</span>
            </div>
            <Link className="wf-btn-solid mt-5 block w-full text-center" to="/proto/checkout/shipping">
              Continue to shipping
            </Link>
          </div>
        ) : null}

        {screen === "shipping" ? (
          <div className="p-5">
            <h2 className="text-sm font-semibold">Shipping details</h2>
            <div className="mt-4 space-y-3">
              <input className="wf-input w-full" placeholder="Full name" />
              <input className="wf-input w-full" placeholder="Address" />
              <div className="grid grid-cols-2 gap-3">
                <input className="wf-input w-full" placeholder="City" />
                <input className="wf-input w-full" placeholder="ZIP" />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <Link className="wf-btn" to="/proto/checkout/cart">
                Back
              </Link>
              <Link className="wf-btn-solid flex-1 text-center" to="/proto/checkout/confirmation">
                Place order
              </Link>
            </div>
          </div>
        ) : null}

        {screen === "confirmation" ? (
          <div className="p-5">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--action-primary-bg)] text-sm text-[var(--action-primary-bg)]">
              ✓
            </div>
            <h2 className="text-center text-sm font-semibold">Order confirmed</h2>
            <p className="mt-2 text-center text-xs text-[var(--text-secondary)]">
              Order #10432 will ship within 2 business days.
            </p>
            <Link className="wf-btn mt-5 block w-full text-center" to="/proto/checkout/cart">
              Start over
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
