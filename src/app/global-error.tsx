"use client";

/**
 * Root error boundary. Wraps the entire app when the root layout fails.
 * Must define its own <html> and <body>; uses minimal inline styles so it works
 * even if the main layout or CSS fails to load.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
          backgroundColor: "#f7f3ed",
          color: "#2c2420",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          Something went wrong
        </h1>
        <p style={{ color: "#6b6560", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
          An unexpected error occurred. You can try again.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            backgroundColor: "#b87333",
            color: "#faf8f4",
            border: "none",
            borderRadius: "14px",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
