import { ref, get, set, update, push, remove } from "firebase/database";
import { db } from "./firebase";
import { genInstanceId } from "./ids";
import { resolveNames, resolveIds } from "./scryfall";
import { emptyMana } from "./room";
import type {
  BattlefieldCard,
  CardEntry,
  ManaColor,
  ParsedDeckCardMap,
  RoomMeta,
  ZoneName,
} from "./types";
import type { ParsedDeck } from "./decklist";

const PHASES = [
  "Untap",
  "Upkeep",
  "Draw",
  "Main 1",
  "Combat",
  "Main 2",
  "End",
];

// ---------- logging ----------

export async function logAction(code: string, uid: string, text: string) {
  await push(ref(db, `rooms/${code}/log`), { ts: Date.now(), uid, text });
}

export async function sendChat(
  code: string,
  uid: string,
  name: string,
  text: string,
) {
  await push(ref(db, `rooms/${code}/chat`), {
    ts: Date.now(),
    uid,
    name,
    text,
  });
}

// ---------- private subtree helpers ----------

function privRef(code: string, uid: string, child = "") {
  return ref(db, `private/${code}/${uid}${child ? "/" + child : ""}`);
}

async function getArray(path: ReturnType<typeof ref>): Promise<string[]> {
  const snap = await get(path);
  return (snap.val() as string[] | null) ?? [];
}

async function getCardMap(code: string, uid: string): Promise<ParsedDeckCardMap> {
  const snap = await get(privRef(code, uid, "cardmap"));
  return (snap.val() as ParsedDeckCardMap | null) ?? {};
}

async function writeCounts(code: string, uid: string) {
  const hand = await getArray(privRef(code, uid, "hand"));
  const library = await getArray(privRef(code, uid, "library"));
  await set(ref(db, `rooms/${code}/counts/${uid}`), {
    hand: hand.length,
    library: library.length,
  });
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- deck loading ----------

export async function loadDeck(code: string, uid: string, deck: ParsedDeck) {
  const names = deck.cards.map((c) => c.name);
  const resolved = await resolveNames(names);

  const cardmap: ParsedDeckCardMap = {};
  const library: string[] = [];
  const command: string[] = [];
  const cardRegistry: Record<string, CardEntry> = {};
  const tokenIds = new Set<string>();

  for (const entry of deck.cards) {
    const card = resolved.get(entry.name.toLowerCase());
    if (!card) continue;
    card.tokenIds.forEach((t) => tokenIds.add(t));
    for (let i = 0; i < entry.qty; i++) {
      const id = genInstanceId();
      cardmap[id] = { scryfallId: card.id, name: card.name };
      if (card.meldResultId) cardmap[id].meldResultId = card.meldResultId;
      if (entry.commander) {
        command.push(id);
        cardRegistry[id] = {
          scryfallId: card.id,
          name: card.name,
          ownerUid: uid,
        };
      } else {
        library.push(id);
      }
    }
  }

  // Build the token tray from related tokens.
  const tray: { scryfallId: string; name: string }[] = [];
  if (tokenIds.size) {
    const tokens = await resolveIds([...tokenIds]);
    for (const t of tokens.values())
      tray.push({ scryfallId: t.id, name: t.name });
  }

  await set(privRef(code, uid), {
    hand: [],
    library: shuffle(library),
    tray,
    cardmap,
  });

  const updates: Record<string, unknown> = {
    [`zones/${uid}/command`]: command,
    [`zones/${uid}/graveyard`]: [],
    [`zones/${uid}/exile`]: [],
    [`zones/${uid}/battlefield`]: {},
    [`players/${uid}/deckLoaded`]: true,
  };
  for (const [id, entry] of Object.entries(cardRegistry))
    updates[`cards/${id}`] = entry;
  await update(ref(db, `rooms/${code}`), updates);
  await writeCounts(code, uid);
  await logAction(code, uid, `loaded a deck (${library.length} cards)`);
}

async function revealCard(code: string, uid: string, instanceId: string) {
  const cardmap = await getCardMap(code, uid);
  const entry = cardmap[instanceId];
  if (!entry) return;
  const data: CardEntry = {
    scryfallId: entry.scryfallId,
    name: entry.name,
    ownerUid: uid,
  };
  if (entry.isToken) data.isToken = true;
  if (entry.meldResultId) data.meldResultId = entry.meldResultId;
  await set(ref(db, `rooms/${code}/cards/${instanceId}`), data);
}

// ---------- zone movement ----------

async function removeFromZone(
  code: string,
  uid: string,
  instanceId: string,
  zone: ZoneName,
) {
  if (zone === "hand" || zone === "library") {
    const path = privRef(code, uid, zone);
    const arr = await getArray(path);
    await set(path, arr.filter((id) => id !== instanceId));
    await writeCounts(code, uid);
  } else if (zone === "battlefield") {
    await remove(ref(db, `rooms/${code}/zones/${uid}/battlefield/${instanceId}`));
  } else {
    const path = ref(db, `rooms/${code}/zones/${uid}/${zone}`);
    const arr = await getArray(path);
    await set(path, arr.filter((id) => id !== instanceId));
  }
}

async function addToZone(
  code: string,
  uid: string,
  instanceId: string,
  zone: ZoneName,
  bf?: Partial<BattlefieldCard>,
) {
  if (zone === "hand" || zone === "library") {
    const path = privRef(code, uid, zone);
    const arr = await getArray(path);
    arr.push(instanceId);
    await set(path, arr);
    await writeCounts(code, uid);
    // hide identity again
    await remove(ref(db, `rooms/${code}/cards/${instanceId}`));
  } else if (zone === "battlefield") {
    await revealCard(code, uid, instanceId);
    const card: BattlefieldCard = {
      x: bf?.x ?? 40 + Math.random() * 200,
      y: bf?.y ?? 40 + Math.random() * 120,
      tapped: bf?.tapped ?? false,
      faceDown: bf?.faceDown ?? false,
      flipped: bf?.flipped ?? false,
      counters: bf?.counters ?? {},
    };
    await set(ref(db, `rooms/${code}/zones/${uid}/battlefield/${instanceId}`), card);
  } else {
    await revealCard(code, uid, instanceId);
    const path = ref(db, `rooms/${code}/zones/${uid}/${zone}`);
    const arr = await getArray(path);
    arr.push(instanceId);
    await set(path, arr);
  }
}

// Move a card the local player owns from one zone to another.
export async function moveCard(
  code: string,
  uid: string,
  instanceId: string,
  from: ZoneName,
  to: ZoneName,
  bf?: Partial<BattlefieldCard>,
) {
  await removeFromZone(code, uid, instanceId, from);
  await addToZone(code, uid, instanceId, to, bf);
}

// Move a card to the owner's library at top or bottom.
export async function moveToLibrary(
  code: string,
  uid: string,
  instanceId: string,
  from: ZoneName,
  toTop = true,
) {
  await removeFromZone(code, uid, instanceId, from);
  const path = privRef(code, uid, "library");
  const lib = await getArray(path);
  if (toTop) lib.push(instanceId);
  else lib.unshift(instanceId);
  await set(path, lib);
  await remove(ref(db, `rooms/${code}/cards/${instanceId}`));
  await writeCounts(code, uid);
}

// ---------- battlefield card edits ----------

export async function updateBattlefieldCard(
  code: string,
  uid: string,
  instanceId: string,
  patch: Partial<BattlefieldCard>,
) {
  await update(
    ref(db, `rooms/${code}/zones/${uid}/battlefield/${instanceId}`),
    patch,
  );
}

export async function setCounter(
  code: string,
  uid: string,
  instanceId: string,
  kind: string,
  value: number,
) {
  const path = ref(
    db,
    `rooms/${code}/zones/${uid}/battlefield/${instanceId}/counters/${kind}`,
  );
  if (value <= 0) await remove(path);
  else await set(path, value);
}

// ---------- library ops: draw / mill / scry / surveil ----------

export async function drawCards(code: string, uid: string, n = 1) {
  const libPath = privRef(code, uid, "library");
  const handPath = privRef(code, uid, "hand");
  const lib = await getArray(libPath);
  const hand = await getArray(handPath);
  const drawn = lib.splice(lib.length - n, n); // top = end
  hand.push(...drawn.reverse());
  await set(libPath, lib);
  await set(handPath, hand);
  await writeCounts(code, uid);
}

// Shuffle the current hand back into the library and draw a fresh hand.
export async function mulligan(code: string, uid: string, n = 7) {
  const handPath = privRef(code, uid, "hand");
  const libPath = privRef(code, uid, "library");
  const hand = await getArray(handPath);
  const lib = await getArray(libPath);
  const combined = shuffle([...lib, ...hand]);
  const draw = combined.splice(combined.length - n, n).reverse();
  await set(libPath, combined);
  await set(handPath, draw);
  await writeCounts(code, uid);
  await logAction(code, uid, `drew a new hand of ${draw.length}`);
}

export async function millCards(code: string, uid: string, n = 1) {
  const libPath = privRef(code, uid, "library");
  const lib = await getArray(libPath);
  const milled = lib.splice(lib.length - n, n).reverse();
  await set(libPath, lib);
  for (const id of milled) await addToZone(code, uid, id, "graveyard");
  await writeCounts(code, uid);
  await logAction(code, uid, `milled ${milled.length}`);
}

// Return the top N library instanceIds with names (owner-only) for scry/surveil.
export async function peekTop(
  code: string,
  uid: string,
  n: number,
): Promise<{ id: string; name: string }[]> {
  const lib = await getArray(privRef(code, uid, "library"));
  const cardmap = await getCardMap(code, uid);
  const top = lib.slice(Math.max(0, lib.length - n)).reverse();
  return top.map((id) => ({ id, name: cardmap[id]?.name ?? "Card" }));
}

// Apply a scry/surveil result: keepTopOrder is the new top order (first = very
// top), toBottom go under the library, toGrave are surveilled into graveyard.
export async function applyScry(
  code: string,
  uid: string,
  n: number,
  keepTopOrder: string[],
  toBottom: string[],
  toGrave: string[],
) {
  const libPath = privRef(code, uid, "library");
  const lib = await getArray(libPath);
  const without = lib.slice(0, Math.max(0, lib.length - n));
  // bottom of library is index 0
  const newLib = [...toBottom, ...without, ...[...keepTopOrder].reverse()];
  await set(libPath, newLib);
  for (const id of toGrave) await addToZone(code, uid, id, "graveyard");
  await writeCounts(code, uid);
}

// Full owner-only library contents (for the search/tutor viewer).
export async function getLibraryContents(
  code: string,
  uid: string,
): Promise<{ instanceId: string; scryfallId: string; name: string }[]> {
  const lib = await getArray(privRef(code, uid, "library"));
  const cardmap = await getCardMap(code, uid);
  // show top of library first
  return [...lib].reverse().map((id) => ({
    instanceId: id,
    scryfallId: cardmap[id]?.scryfallId ?? "",
    name: cardmap[id]?.name ?? "Card",
  }));
}

export async function shuffleLibrary(code: string, uid: string) {
  const libPath = privRef(code, uid, "library");
  await set(libPath, shuffle(await getArray(libPath)));
  await logAction(code, uid, "shuffled");
}

// ---------- life / mana / monarch ----------

export async function setLife(code: string, uid: string, total: number) {
  await set(ref(db, `rooms/${code}/life/${uid}/total`), total);
}
export async function setPoison(code: string, uid: string, n: number) {
  await set(ref(db, `rooms/${code}/life/${uid}/poison`), Math.max(0, n));
}
export async function setMana(
  code: string,
  uid: string,
  color: ManaColor,
  n: number,
) {
  await set(ref(db, `rooms/${code}/life/${uid}/mana/${color}`), Math.max(0, n));
}
export async function clearMana(code: string, uid: string) {
  await set(ref(db, `rooms/${code}/life/${uid}/mana`), emptyMana());
}
export async function setCmdDmg(
  code: string,
  uid: string,
  fromUid: string,
  n: number,
) {
  await set(
    ref(db, `rooms/${code}/life/${uid}/cmdDmg/${fromUid}`),
    Math.max(0, n),
  );
}
export async function setMonarch(code: string, uid: string | null) {
  await set(ref(db, `rooms/${code}/meta/monarchUid`), uid);
}

// ---------- turn / phase ----------

export async function setPhase(code: string, phase: string) {
  await set(ref(db, `rooms/${code}/meta/phase`), phase);
}

export async function toggleSkipDraw(code: string, value: boolean) {
  await set(ref(db, `rooms/${code}/meta/skipDraw`), value);
}

// Pass the turn: untap the next player's battlefield, auto-draw unless skipDraw.
export async function passTurn(code: string) {
  const metaSnap = await get(ref(db, `rooms/${code}/meta`));
  const meta = metaSnap.val() as RoomMeta;
  const playersSnap = await get(ref(db, `rooms/${code}/players`));
  const players = Object.values(
    (playersSnap.val() ?? {}) as Record<string, { uid: string; seat: number }>,
  ).sort((a, b) => a.seat - b.seat);
  if (!players.length) return;

  const seats = players.map((p) => p.seat);
  const currentIdx = seats.indexOf(meta.turnSeat);
  const nextSeat = seats[(currentIdx + 1) % seats.length];
  const nextPlayer = players.find((p) => p.seat === nextSeat)!;

  // Untap all of the next player's permanents.
  const bfPath = ref(db, `rooms/${code}/zones/${nextPlayer.uid}/battlefield`);
  const bfSnap = await get(bfPath);
  const bf = (bfSnap.val() ?? {}) as Record<string, BattlefieldCard>;
  const untapUpdate: Record<string, boolean> = {};
  for (const id of Object.keys(bf)) untapUpdate[`${id}/tapped`] = false;
  if (Object.keys(untapUpdate).length) await update(bfPath, untapUpdate);

  await update(ref(db, `rooms/${code}/meta`), {
    turnSeat: nextSeat,
    turnCount: (meta.turnCount ?? 0) + 1,
    phase: "Main 1",
    skipDraw: false,
  });

  if (!meta.skipDraw) await drawCards(code, nextPlayer.uid, 1);

  // Monarch draws on their end step — approximate by drawing when their turn ends.
  await logAction(code, nextPlayer.uid, "took their turn");
}

// ---------- tokens ----------

export async function createToken(
  code: string,
  uid: string,
  scryfallId: string,
  name: string,
) {
  const id = genInstanceId();
  const cardmap = await getCardMap(code, uid);
  cardmap[id] = { scryfallId, name, isToken: true };
  await set(privRef(code, uid, "cardmap"), cardmap);
  await addToZone(code, uid, id, "battlefield");
  await logAction(code, uid, `created token: ${name}`);
}

// ---------- meld ----------

export async function meldCards(
  code: string,
  uid: string,
  instanceId: string,
  meldResultId: string,
) {
  // Resolve the merged card and represent it on the instance as flipped state.
  const merged = (await resolveIds([meldResultId])).get(meldResultId);
  if (!merged) return;
  const cardmap = await getCardMap(code, uid);
  cardmap[instanceId] = {
    ...cardmap[instanceId],
    melded: true,
    meldedScryfallId: meldResultId,
    meldedName: merged.name,
  };
  await set(privRef(code, uid, "cardmap"), cardmap);
  await set(ref(db, `rooms/${code}/cards/${instanceId}`), {
    scryfallId: meldResultId,
    name: merged.name,
    ownerUid: uid,
  } satisfies CardEntry);
  await logAction(code, uid, `melded into ${merged.name}`);
}

// ---------- dice ----------

export async function rollDie(code: string, uid: string, sides: number) {
  const result = 1 + Math.floor(Math.random() * sides);
  await logAction(code, uid, `rolled d${sides}: ${result}`);
  return result;
}

export async function flipCoin(code: string, uid: string) {
  const result = Math.random() < 0.5 ? "heads" : "tails";
  await logAction(code, uid, `flipped a coin: ${result}`);
  return result;
}

// ---------- reset ----------

// Reset the whole table back to lobby: clear public zones & private decks,
// keeping players and their seats.
export async function resetGame(code: string) {
  const playersSnap = await get(ref(db, `rooms/${code}/players`));
  const players = (playersSnap.val() ?? {}) as Record<string, { uid: string }>;
  const metaSnap = await get(ref(db, `rooms/${code}/meta`));
  const meta = metaSnap.val() as RoomMeta;

  const updates: Record<string, unknown> = {
    "meta/status": "lobby",
    "meta/turnSeat": 0,
    "meta/turnCount": 0,
    "meta/phase": "Main 1",
    "meta/monarchUid": null,
    "meta/skipDraw": false,
    cards: {},
    zones: {},
  };
  for (const uid of Object.keys(players)) {
    updates[`life/${uid}`] = {
      total: meta.life,
      poison: 0,
      mana: emptyMana(),
      cmdDmg: {},
    };
    updates[`players/${uid}/deckLoaded`] = false;
    updates[`counts/${uid}`] = { hand: 0, library: 0 };
  }
  await update(ref(db, `rooms/${code}`), updates);
  // Clear all private decks.
  for (const uid of Object.keys(players)) {
    await remove(privRef(code, uid));
  }
  await logAction(code, meta.hostUid, "reset the game");
}

export { PHASES };
