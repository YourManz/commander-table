import { parseDecklist, type ParsedDeck } from "./parse";
import { fetchMoxfield } from "./moxfield";
import { fetchArchidekt } from "./archidekt";

export type { ParsedDeck, ParsedEntry } from "./parse";

// Decide how to import based on the input. A URL routes to the matching site;
// anything else is treated as a pasted decklist.
export async function importDeck(input: string): Promise<ParsedDeck> {
  const trimmed = input.trim();
  if (/moxfield\.com/.test(trimmed)) return fetchMoxfield(trimmed);
  if (/archidekt\.com/.test(trimmed)) return fetchArchidekt(trimmed);
  return parseDecklist(trimmed);
}
