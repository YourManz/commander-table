// Device-local saved decklists (localStorage). Stores the raw import text so a
// saved deck loads instantly without re-fetching (Scryfall results stay cached).

export interface SavedDeck {
  id: string;
  name: string;
  text: string; // raw decklist text or deck URL
  createdAt: number;
}

const KEY = "ct-decks";

export function getDecks(): SavedDeck[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedDeck[]) : [];
  } catch {
    return [];
  }
}

function write(decks: SavedDeck[]) {
  localStorage.setItem(KEY, JSON.stringify(decks));
}

export function saveDeck(name: string, text: string): SavedDeck[] {
  const decks = getDecks();
  const existing = decks.find((d) => d.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    existing.text = text;
    existing.createdAt = Date.now();
  } else {
    decks.push({
      id: "d" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
      name,
      text,
      createdAt: Date.now(),
    });
  }
  write(decks);
  return getDecks();
}

export function deleteDeck(id: string): SavedDeck[] {
  write(getDecks().filter((d) => d.id !== id));
  return getDecks();
}

export function exportDecks(): string {
  return JSON.stringify(getDecks(), null, 2);
}

// Merge imported decks by name (imported wins).
export function importDecks(json: string): SavedDeck[] {
  const incoming = JSON.parse(json) as SavedDeck[];
  if (!Array.isArray(incoming)) throw new Error("Not a deck export file");
  const byName = new Map(getDecks().map((d) => [d.name.toLowerCase(), d]));
  for (const d of incoming) {
    if (d?.name && typeof d.text === "string") {
      byName.set(d.name.toLowerCase(), {
        id: d.id ?? "d" + Date.now().toString(36) + Math.random().toString(36).slice(2),
        name: d.name,
        text: d.text,
        createdAt: d.createdAt ?? Date.now(),
      });
    }
  }
  const merged = [...byName.values()];
  write(merged);
  return merged;
}
