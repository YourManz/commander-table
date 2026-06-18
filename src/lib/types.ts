// Shared domain types for Commander Table.

export type ZoneName =
  | "battlefield"
  | "graveyard"
  | "exile"
  | "command"
  | "hand"
  | "library";

export const PUBLIC_ZONES: ZoneName[] = [
  "battlefield",
  "graveyard",
  "exile",
  "command",
];

export const COLORS = ["W", "U", "B", "R", "G", "C"] as const;
export type ManaColor = (typeof COLORS)[number];

export type ManaPool = Record<ManaColor, number>;

export interface FormatPreset {
  id: string;
  name: string;
  life: number;
  seats: number; // max seats
  commander: boolean; // command zone + commander damage active
  custom?: boolean;
}

export interface RoomMeta {
  hostUid: string;
  formatId: string;
  life: number;
  seats: number;
  commander: boolean;
  status: "lobby" | "playing";
  turnSeat: number;
  turnCount: number; // number of turns passed since the game/reset started
  phase: string;
  monarchUid: string | null;
  skipDraw: boolean; // skip the next auto-draw for the active turn
  createdAt: number;
}

export interface PlayerState {
  uid: string;
  name: string;
  seat: number;
  connected: boolean;
  deckLoaded: boolean;
}

export interface LifeState {
  total: number;
  poison: number;
  mana: ManaPool;
  // commander damage taken: { fromUid: amount }
  cmdDmg: Record<string, number>;
}

// A card placed on the battlefield carries position + tap/counter state.
export interface BattlefieldCard {
  x: number;
  y: number;
  tapped: boolean;
  faceDown: boolean;
  flipped: boolean; // showing the back face of a DFC
  counters: Record<string, number>;
}

// Public registry entry — identity is revealed once a card enters a public zone.
export interface CardEntry {
  scryfallId: string;
  name: string;
  ownerUid: string;
  isToken?: boolean;
  meldPartnerId?: string; // instanceId of the meld partner
  meldResultId?: string; // scryfallId of the merged card
}

export interface LogEntry {
  ts: number;
  uid: string;
  text: string;
}

export interface ChatEntry {
  ts: number;
  uid: string;
  name: string;
  text: string;
}

// Mirror of a full room subscription used by the UI.
export interface RoomSnapshot {
  meta: RoomMeta | null;
  players: Record<string, PlayerState>;
  life: Record<string, LifeState>;
  cards: Record<string, CardEntry>;
  zones: Record<
    string,
    {
      battlefield?: Record<string, BattlefieldCard>;
      graveyard?: string[];
      exile?: string[];
      command?: string[];
    }
  >;
  counts: Record<string, { hand: number; library: number }>;
  log: LogEntry[];
  chat: ChatEntry[];
}

// Private (owner-only) subtree.
export interface PrivateState {
  hand: string[];
  library: string[];
  // tokens & meld results resolvable for this player, keyed by scryfallId
  tray: TokenTrayEntry[];
}

export interface TokenTrayEntry {
  scryfallId: string;
  name: string;
}

// Owner-only map from card instance id to its identity, used to reveal cards
// when they enter a public zone without exposing the whole library.
export interface CardMapEntry {
  scryfallId: string;
  name: string;
  isToken?: boolean;
  meldResultId?: string;
  meldPartnerId?: string;
  melded?: boolean;
  meldedScryfallId?: string;
  meldedName?: string;
}
export type ParsedDeckCardMap = Record<string, CardMapEntry>;

// A resolved Scryfall card (the subset we use), cached in IndexedDB.
export interface ScryCard {
  id: string;
  name: string;
  image: string | null;
  backImage: string | null;
  typeLine: string;
  oracle: string;
  layout: string;
  tokenIds: string[]; // scryfallIds of related tokens
  meldResultId: string | null; // scryfallId of meld result, if any
}
