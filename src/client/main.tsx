import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "@/client/router";
import { RouteStateProvider } from "@/client/RouteState";
import "@/client/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <RouteStateProvider>
        <div className="flex min-h-full flex-col bg-[var(--surface-page)] text-[var(--text-primary)] antialiased">
          <AppRouter />
        </div>
      </RouteStateProvider>
    </BrowserRouter>
  </StrictMode>
);
