import { useState } from "react";

type Screen = "cart" | "shipping" | "confirmation";

export function PrototypePage() {
  const [screen, setScreen] = useState<Screen>("cart");

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
            <button className="wf-btn-solid mt-5 w-full" onClick={() => setScreen("shipping")}>
              Continue to shipping
            </button>
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
              <button className="wf-btn" onClick={() => setScreen("cart")}>
                Back
              </button>
              <button className="wf-btn-solid flex-1" onClick={() => setScreen("confirmation")}>
                Place order
              </button>
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
            <button className="wf-btn mt-5 w-full" onClick={() => setScreen("cart")}>
              Start over
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
