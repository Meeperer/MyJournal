"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { IconWarning } from "@/components/icons";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setSubmitting(false);
      return;
    }

    window.location.href = "/";
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <main className="card-warm animate-card w-full max-w-md p-8 sm:p-10">
        <div className="mb-10 space-y-3 text-center animate-headline">
          <h1 className="text-headline text-2xl sm:text-3xl">
            Welcome back to your journal
          </h1>
          <p className="text-body text-sm text-[var(--body-soft)]">
            Log in to see your calendar and entries.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-body text-sm font-medium text-[var(--headline-2)]">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input-warm block w-full px-4 py-2.5 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-body text-sm font-medium text-[var(--headline-2)]">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input-warm block w-full px-4 py-2.5 text-sm"
            />
          </div>

          {error ? (
            <p className="flex items-center gap-2 text-sm font-medium text-[var(--error)]" role="alert">
              <IconWarning className="shrink-0" />
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex w-full items-center justify-center py-3 text-sm disabled:opacity-60"
          >
            {submitting ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[var(--body-soft)]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-[var(--accent)] underline underline-offset-2">
            Create one
          </Link>
        </p>
      </main>
    </div>
  );
}

