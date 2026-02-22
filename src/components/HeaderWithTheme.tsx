"use client";

import { ThemeToggle } from "./ThemeToggle";

export function HeaderWithTheme({ userEmail }: { userEmail: string }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 animate-headline">
      <div className="space-y-0.5">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
          Logged in as
        </p>
        <p className="text-body text-sm font-medium text-[var(--headline-2)]">
          {userEmail}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <form action="/api/auth/signout" method="post" className="inline">
          <button
            type="submit"
            className="btn-secondary inline-flex h-10 items-center justify-center px-5 text-sm"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
