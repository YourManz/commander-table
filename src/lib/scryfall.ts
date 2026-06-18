import { openDB, type DBSchema } from "idb";
import type { ScryCard } from "./types";

interface CacheDB extends DBSchema {
  cards: { key: string; value: ScryCard };
  byName: { key: string; value: string }; // lowercased name -> scryfallId
}

const dbPromise = openDB<CacheDB>("commander-table-cache", 1, {
  upgrade(db) {
    db.createObjectStore("cards");
    db.createObjectStore("byName");
  },
});

interface RawCard {
  id: string;
  name: string;
  layout: string;
  type_line?: string;
  oracle_text?: string;
  image_uris?: { normal?: string; large?: string };
  card_faces?: Array<{
    image_uris?: { normal?: string; large?: string };
    type_line?: string;
    oracle_text?: string;
  }>;
  all_parts?: Array<{ id: string; component: string; name: string; type_line?: string }>;
}

function normalize(raw: RawCard): ScryCard {
  const faceImg = (i: number) =>
    raw.card_faces?.[i]?.image_uris?.normal ??
    raw.card_faces?.[i]?.image_uris?.large ??
    null;
  const image = raw.image_uris?.normal ?? raw.image_uris?.large ?? faceImg(0);
  const backImage = raw.card_faces && raw.card_faces.length > 1 ? faceImg(1) : null;

  const tokenIds: string[] = [];
  let meldResultId: string | null = null;
  for (const part of raw.all_parts ?? []) {
    if (part.id === raw.id) continue;
    if (part.component === "token") tokenIds.push(part.id);
    if (part.component === "meld_result") meldResultId = part.id;
  }

  return {
    id: raw.id,
    name: raw.name,
    image,
    backImage,
    typeLine: raw.type_line ?? raw.card_faces?.[0]?.type_line ?? "",
    oracle: raw.oracle_text ?? raw.card_faces?.[0]?.oracle_text ?? "",
    layout: raw.layout,
    tokenIds,
    meldResultId,
  };
}

async function cacheCards(cards: ScryCard[]) {
  const db = await dbPromise;
  const tx = db.transaction(["cards", "byName"], "readwrite");
  for (const c of cards) {
    tx.objectStore("cards").put(c, c.id);
    tx.objectStore("byName").put(c.id, c.name.toLowerCase());
  }
  await tx.done;
}

export async function getCachedById(id: string): Promise<ScryCard | undefined> {
  return (await dbPromise).get("cards", id);
}

// Resolve a batch of card names to ScryCards (cache-first, then Scryfall
// /cards/collection in chunks of 75).
export async function resolveNames(names: string[]): Promise<Map<string, ScryCard>> {
  const db = await dbPromise;
  const result = new Map<string, ScryCard>();
  const missing: string[] = [];

  for (const name of names) {
    const id = await db.get("byName", name.toLowerCase());
    const cached = id ? await db.get("cards", id) : undefined;
    if (cached) result.set(name.toLowerCase(), cached);
    else missing.push(name);
  }

  for (let i = 0; i < missing.length; i += 75) {
    const chunk = missing.slice(i, i + 75);
    const body = { identifiers: chunk.map((n) => ({ name: n })) };
    const res = await fetch("https://api.scryfall.com/cards/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Scryfall collection error ${res.status}`);
    const data = (await res.json()) as { data: RawCard[] };
    const cards = data.data.map(normalize);
    await cacheCards(cards);
    for (const c of cards) result.set(c.name.toLowerCase(), c);
  }

  return result;
}

// Fetch single cards by scryfallId (cache-first). Used for tokens & meld results.
export async function resolveIds(ids: string[]): Promise<Map<string, ScryCard>> {
  const result = new Map<string, ScryCard>();
  const missing: string[] = [];
  for (const id of ids) {
    const cached = await getCachedById(id);
    if (cached) result.set(id, cached);
    else missing.push(id);
  }
  for (let i = 0; i < missing.length; i += 75) {
    const chunk = missing.slice(i, i + 75);
    const body = { identifiers: chunk.map((id) => ({ id })) };
    const res = await fetch("https://api.scryfall.com/cards/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Scryfall collection error ${res.status}`);
    const data = (await res.json()) as { data: RawCard[] };
    const cards = data.data.map(normalize);
    await cacheCards(cards);
    for (const c of cards) result.set(c.id, c);
  }
  return result;
}

// Free-text token search (for one-off tokens not on a card's all_parts).
export async function searchTokens(query: string): Promise<ScryCard[]> {
  return rawSearch(`t:token ${query}`);
}

// General card search (for putting any card into play / testing).
export async function searchCards(query: string): Promise<ScryCard[]> {
  return rawSearch(query);
}

async function rawSearch(query: string): Promise<ScryCard[]> {
  const q = encodeURIComponent(query);
  const res = await fetch(`https://api.scryfall.com/cards/search?q=${q}&unique=cards`);
  if (!res.ok) return [];
  const data = (await res.json()) as { data: RawCard[] };
  const cards = data.data.slice(0, 24).map(normalize);
  await cacheCards(cards);
  return cards;
}
