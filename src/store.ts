import { create } from "zustand";
import type { ScryCard } from "./lib/types";

interface UIState {
  code: string | null;
  name: string;
  setCode: (code: string | null) => void;
  setName: (name: string) => void;

  // table UI
  focusedSeat: number | null; // null = fit all
  setFocusedSeat: (seat: number | null) => void;

  // multi-select of battlefield cards (instanceIds)
  selectedCards: string[];
  setSelection: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;

  // hover preview (large image)
  preview: { scryfallId: string; back: boolean } | null;
  setPreview: (p: { scryfallId: string; back: boolean } | null) => void;

  // resolved scryfall cards cache (in-memory mirror of IndexedDB)
  cardCache: Record<string, ScryCard>;
  putCards: (cards: ScryCard[]) => void;
}

export const useUI = create<UIState>((set) => ({
  code: null,
  name: localStorage.getItem("ct-name") ?? "",
  setCode: (code) => set({ code }),
  setName: (name) => {
    localStorage.setItem("ct-name", name);
    set({ name });
  },

  focusedSeat: null,
  setFocusedSeat: (focusedSeat) => set({ focusedSeat }),

  selectedCards: [],
  setSelection: (selectedCards) => set({ selectedCards }),
  toggleSelection: (id) =>
    set((s) => ({
      selectedCards: s.selectedCards.includes(id)
        ? s.selectedCards.filter((x) => x !== id)
        : [...s.selectedCards, id],
    })),
  clearSelection: () => set({ selectedCards: [] }),

  preview: null,
  setPreview: (preview) => set({ preview }),

  cardCache: {},
  putCards: (cards) =>
    set((s) => {
      const next = { ...s.cardCache };
      for (const c of cards) next[c.id] = c;
      return { cardCache: next };
    }),
}));
