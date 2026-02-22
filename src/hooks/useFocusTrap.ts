"use client";

import { useEffect, type RefObject } from "react";

/** Focusable elements: buttons, links, form controls, tabindex ≥ 0, contenteditable */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

function getFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null && getComputedStyle(el).visibility !== "hidden"
  );
}

export type UseFocusTrapOptions = {
  /** When true, trap is active (focus first, listen for Tab/Escape). */
  enabled: boolean;
  /** Called when user presses Escape. */
  onEscape?: () => void;
};

/**
 * Traps focus inside the container when enabled. Focuses first focusable element,
 * cycles Tab/Shift+Tab within the container, and calls onEscape on Escape.
 */
export function useFocusTrap<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  options: UseFocusTrapOptions
): void {
  const { enabled, onEscape } = options;

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    const focusables = getFocusables(el);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onEscape?.();
        return;
      }
      if (e.key !== "Tab") return;
      const target = document.activeElement as HTMLElement | null;
      if (!target || !el.contains(target)) return;
      if (e.shiftKey) {
        if (target === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (target === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, onEscape, containerRef]);
}
