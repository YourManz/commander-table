import { fetchJSONWithFallback } from "../cors";
import type { ParsedDeck, ParsedEntry } from "./parse";

interface MoxfieldBoard {
  count: number;
  card: { name: string };
}
interface MoxfieldDeck {
  name: string;
  boards?: {
    mainboard?: { cards: Record<string, MoxfieldBoard> };
    commanders?: { cards: Record<string, MoxfieldBoard> };
  };
  // legacy v2 shape
  mainboard?: Record<string, MoxfieldBoard>;
  commanders?: Record<string, MoxfieldBoard>;
}

export function moxfieldId(url: string): string | null {
  const m = url.match(/moxfield\.com\/decks\/([\w-]+)/);
  return m ? m[1] : url.trim() || null;
}

export async function fetchMoxfield(url: string): Promise<ParsedDeck> {
  const id = moxfieldId(url);
  if (!id) throw new Error("Could not parse Moxfield deck id");
  const data = await fetchJSONWithFallback<MoxfieldDeck>(
    `https://api.moxfield.com/v2/decks/all/${id}`,
  );

  const main = data.boards?.mainboard?.cards ?? data.mainboard ?? {};
  const cmd = data.boards?.commanders?.cards ?? data.commanders ?? {};

  const cards: ParsedEntry[] = [];
  const commanders: string[] = [];
  for (const e of Object.values(cmd)) {
    cards.push({ qty: e.count || 1, name: e.card.name, commander: true });
    commanders.push(e.card.name);
  }
  for (const e of Object.values(main)) {
    cards.push({ qty: e.count || 1, name: e.card.name, commander: false });
  }
  return { cards, commanders };
}
