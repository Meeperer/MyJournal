"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { IconSun, IconMoon } from "./icons";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  if (!mounted) {
    return (
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-[var(--border)] bg-transparent" aria-hidden />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius)] border-2 border-[var(--accent)] text-[var(--accent)] transition-all duration-300 hover:scale-[1.03] hover:bg-[var(--accent)] hover:text-[var(--btn-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? <IconSun /> : <IconMoon />}
    </button>
  );
}
