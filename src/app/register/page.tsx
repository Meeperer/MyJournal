"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { IconWarning, IconCheck } from "@/components/icons";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Unable to create account.");
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <main className="card-warm animate-card w-full max-w-md p-8 sm:p-10">
        <div className="mb-10 space-y-3 text-center animate-headline">
          <h1 className="text-headline text-2xl sm:text-3xl">
            Create your journal account
          </h1>
          <p className="text-body text-sm text-[var(--body-soft)]">
            Sign up to start writing and tracking your days.
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
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input-warm block w-full px-4 py-2.5 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm" className="text-body text-sm font-medium text-[var(--headline-2)]">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="input-warm block w-full px-4 py-2.5 text-sm"
            />
          </div>

          {error ? (
            <p className="flex items-center gap-2 text-sm font-medium text-[var(--error)]" role="alert">
              <IconWarning className="shrink-0" />
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="flex items-center gap-2 text-sm font-medium text-[var(--success)]">
              <IconCheck className="shrink-0" />
              Account created. You can now{" "}
              <Link href="/login" className="underline underline-offset-2">
                log in
              </Link>
              .
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex w-full items-center justify-center py-3 text-sm disabled:opacity-60"
          >
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[var(--body-soft)]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[var(--accent)] underline underline-offset-2">
            Log in
          </Link>
        </p>
      </main>
    </div>
  );
}

