import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../lib/firebase";
import type {
  CardEntry,
  ChatEntry,
  LifeState,
  LogEntry,
  PlayerState,
  RoomMeta,
  RoomSnapshot,
} from "../lib/types";

const EMPTY: RoomSnapshot = {
  meta: null,
  players: {},
  life: {},
  cards: {},
  zones: {},
  counts: {},
  log: [],
  chat: [],
};

// Subscribe to a whole room's public tree.
export function useRoom(code: string | null): RoomSnapshot {
  const [snap, setSnap] = useState<RoomSnapshot>(EMPTY);

  useEffect(() => {
    if (!code) {
      setSnap(EMPTY);
      return;
    }
    const unsub = onValue(ref(db, `rooms/${code}`), (s) => {
      const v = s.val() as
        | {
            meta?: RoomMeta;
            players?: Record<string, PlayerState>;
            life?: Record<string, LifeState>;
            cards?: Record<string, CardEntry>;
            zones?: RoomSnapshot["zones"];
            counts?: RoomSnapshot["counts"];
            log?: Record<string, LogEntry>;
            chat?: Record<string, ChatEntry>;
          }
        | null;
      if (!v) {
        setSnap(EMPTY);
        return;
      }
      setSnap({
        meta: v.meta ?? null,
        players: v.players ?? {},
        life: v.life ?? {},
        cards: v.cards ?? {},
        zones: v.zones ?? {},
        counts: v.counts ?? {},
        log: v.log ? Object.values(v.log).sort((a, b) => a.ts - b.ts) : [],
        chat: v.chat ? Object.values(v.chat).sort((a, b) => a.ts - b.ts) : [],
      });
    });
    return () => unsub();
  }, [code]);

  return snap;
}

// Subscribe to the local player's private subtree (hand, library, tray, cardmap).
export function usePrivate(code: string | null, uid: string | null) {
  const [state, setState] = useState<{
    hand: string[];
    library: string[];
    tray: { scryfallId: string; name: string }[];
    cardmap: Record<string, { scryfallId: string; name: string }>;
  }>({ hand: [], library: [], tray: [], cardmap: {} });

  useEffect(() => {
    if (!code || !uid) return;
    const unsub = onValue(ref(db, `private/${code}/${uid}`), (s) => {
      const v = s.val() as {
        hand?: string[];
        library?: string[];
        tray?: { scryfallId: string; name: string }[];
        cardmap?: Record<string, { scryfallId: string; name: string }>;
      } | null;
      setState({
        hand: v?.hand ?? [],
        library: v?.library ?? [],
        tray: v?.tray ?? [],
        cardmap: v?.cardmap ?? {},
      });
    });
    return () => unsub();
  }, [code, uid]);

  return state;
}
