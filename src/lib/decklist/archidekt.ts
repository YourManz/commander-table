import { fetchJSONWithFallback } from "../cors";
import type { ParsedDeck, ParsedEntry } from "./parse";

interface ArchidektCard {
  quantity: number;
  card: { oracleCard: { name: string } };
  categories?: string[];
}
interface ArchidektDeck {
  name: string;
  cards: ArchidektCard[];
}

export function archidektId(url: string): string | null {
  const m = url.match(/archidekt\.com\/decks\/(\d+)/);
  return m ? m[1] : url.trim() || null;
}

export async function fetchArchidekt(url: string): Promise<ParsedDeck> {
  const id = archidektId(url);
  if (!id) throw new Error("Could not parse Archidekt deck id");
  const data = await fetchJSONWithFallback<ArchidektDeck>(
    `https://archidekt.com/api/decks/${id}/`,
  );

  const cards: ParsedEntry[] = [];
  const commanders: string[] = [];
  for (const c of data.cards) {
    const name = c.card.oracleCard.name;
    const cats = c.categories ?? [];
    const isCmd = cats.includes("Commander");
    const isMaybe = cats.includes("Maybeboard") || cats.includes("Sideboard");
    if (isMaybe) continue;
    cards.push({ qty: c.quantity || 1, name, commander: isCmd });
    if (isCmd) commanders.push(name);
  }
  return { cards, commanders };
}
