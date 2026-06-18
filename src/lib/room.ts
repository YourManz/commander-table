import {
  ref,
  set,
  get,
  update,
  onDisconnect,
  serverTimestamp,
} from "firebase/database";
import { db, uidReady } from "./firebase";
import { genRoomCode } from "./ids";
import { getFormat } from "./formats";
import type { ManaPool, RoomMeta } from "./types";

export const emptyMana = (): ManaPool => ({ W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 });

function defaultLife(total: number) {
  return { total, poison: 0, mana: emptyMana(), cmdDmg: {} };
}

// Create a room with a fresh code; the creator takes seat 0 as host.
export async function createRoom(
  formatId: string,
  name: string,
  customLife?: number,
  customSeats?: number,
): Promise<string> {
  const uid = await uidReady;
  const fmt = getFormat(formatId);
  const life = fmt.custom && customLife ? customLife : fmt.life;
  const seats = fmt.custom && customSeats ? customSeats : fmt.seats;

  // Find an unused code (collisions are rare at 4 chars).
  let code = genRoomCode();
  for (let i = 0; i < 5; i++) {
    const exists = await get(ref(db, `rooms/${code}/meta`));
    if (!exists.exists()) break;
    code = genRoomCode();
  }

  const meta: RoomMeta = {
    hostUid: uid,
    formatId,
    life,
    seats,
    commander: fmt.commander,
    status: "lobby",
    turnSeat: 0,
    phase: "Main 1",
    monarchUid: null,
    skipDraw: false,
    createdAt: Date.now(),
  };

  await set(ref(db, `rooms/${code}`), {
    meta,
    players: {
      [uid]: { uid, name, seat: 0, connected: true, deckLoaded: false },
    },
    life: { [uid]: defaultLife(life) },
  });

  registerPresence(code, uid);
  return code;
}

// Join an existing room, claiming the lowest free seat.
export async function joinRoom(code: string, name: string): Promise<void> {
  const uid = await uidReady;
  const metaSnap = await get(ref(db, `rooms/${code}/meta`));
  if (!metaSnap.exists()) throw new Error("Room not found");
  const meta = metaSnap.val() as RoomMeta;

  const playersSnap = await get(ref(db, `rooms/${code}/players`));
  const players = (playersSnap.val() ?? {}) as Record<
    string,
    { seat: number }
  >;

  // Already in the room — just reconnect.
  if (players[uid]) {
    await update(ref(db, `rooms/${code}/players/${uid}`), { connected: true, name });
    registerPresence(code, uid);
    return;
  }

  const takenSeats = new Set(Object.values(players).map((p) => p.seat));
  let seat = 0;
  while (takenSeats.has(seat)) seat++;
  if (seat >= meta.seats) throw new Error("Room is full");

  await update(ref(db, `rooms/${code}`), {
    [`players/${uid}`]: { uid, name, seat, connected: true, deckLoaded: false },
    [`life/${uid}`]: defaultLife(meta.life),
  });
  registerPresence(code, uid);
}

function registerPresence(code: string, uid: string) {
  const connRef = ref(db, `rooms/${code}/players/${uid}/connected`);
  set(connRef, true);
  onDisconnect(connRef).set(false);
  // touch a heartbeat so onDisconnect is armed
  onDisconnect(ref(db, `rooms/${code}/players/${uid}/lastSeen`)).set(
    serverTimestamp(),
  );
}

export async function startGame(code: string) {
  await update(ref(db, `rooms/${code}/meta`), { status: "playing" });
}
