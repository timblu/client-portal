import type { Metadata } from "next";
import { ThemeScript } from "@/components/ThemeScript";
import "./globals.css";

export const metadata: Metadata = {
  title: "Review Portal",
  description: "Client review portal — publish designs and docs for client review and approval.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-[var(--surface-page)] text-[var(--text-primary)]">
        <ThemeScript />
        {children}
      </body>
    </html>
  );
}
