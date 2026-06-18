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
  selectedCard: string | null;
  setSelectedCard: (id: string | null) => void;

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
  selectedCard: null,
  setSelectedCard: (selectedCard) => set({ selectedCard }),

  cardCache: {},
  putCards: (cards) =>
    set((s) => {
      const next = { ...s.cardCache };
      for (const c of cards) next[c.id] = c;
      return { cardCache: next };
    }),
}));
