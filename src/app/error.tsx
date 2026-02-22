"use client";

/**
 * Route segment error boundary. Renders when a component in this segment throws.
 * Does not replace API error handling or validation.
 */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-headline text-xl font-medium">Something went wrong</h1>
      <p className="text-[var(--body-soft)] text-sm">
        An unexpected error occurred. You can try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-[var(--radius)] border-2 border-[var(--accent)] bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--btn-text)] transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        Try again
      </button>
    </div>
  );
}
