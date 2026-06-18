import { useEffect } from "react";

export interface HotkeyMap {
  [key: string]: () => void;
}

// Bind single-key shortcuts. Ignores keystrokes while typing in inputs.
export function useHotkeys(map: HotkeyMap, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const fn = map[key];
      if (fn) {
        e.preventDefault();
        fn();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [map, enabled]);
}

export const HOTKEY_HELP: [string, string][] = [
  ["U", "Untap all your permanents"],
  ["D", "Draw a card"],
  ["T", "Tap / untap selected card"],
  ["Space", "Pass turn"],
  ["M", "Mill (prompts for N)"],
  ["S", "Scry (prompts for N)"],
  ["V", "Surveil (prompts for N)"],
  ["F", "Toggle field zoom"],
  ["R", "Roll d20"],
  ["?", "Show this help"],
];
