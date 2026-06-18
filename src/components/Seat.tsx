import { useRef, useState } from "react";
import type { BattlefieldCard, RoomSnapshot } from "../lib/types";
import CardView from "./CardView";
import Menu, { type MenuItem } from "./Menu";
import ZoneViewer, { type ViewerCard } from "./ZoneViewer";
import { useUI } from "../store";
import {
  moveCard,
  moveToLibrary,
  updateBattlefieldCard,
  setCounter,
  getLibraryContents,
  shuffleLibrary,
} from "../lib/actions";

interface MenuState {
  x: number;
  y: number;
  items: MenuItem[];
}

export default function Seat({
  code,
  viewerUid,
  room,
  seatUid,
  active,
}: {
  code: string;
  viewerUid: string;
  room: RoomSnapshot;
  seatUid: string;
  active: boolean;
}) {
  const isSelf = seatUid === viewerUid;
  const player = room.players[seatUid];
  const life = room.life[seatUid];
  const zones = room.zones[seatUid] ?? {};
  const counts = room.counts[seatUid] ?? { hand: 0, library: 0 };
  const cards = room.cards;
  const bf = (zones.battlefield ?? {}) as Record<string, BattlefieldCard>;
  const selectedCard = useUI((s) => s.selectedCard);
  const setSelectedCard = useUI((s) => s.setSelectedCard);

  const [menu, setMenu] = useState<MenuState | null>(null);
  const [viewer, setViewer] = useState<{
    title: string;
    cards: ViewerCard[];
    actions?: { label: string; fn: (id: string) => void }[];
  } | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const cardCache = useUI((s) => s.cardCache);

  function zoneCards(zone: "graveyard" | "exile" | "command"): ViewerCard[] {
    return (zones[zone] ?? []).map((id) => ({
      instanceId: id,
      scryfallId: cards[id]?.scryfallId,
      name: cards[id]?.name,
    }));
  }

  function openZone(zone: "graveyard" | "exile" | "command") {
    const titleMap = { graveyard: "Graveyard", exile: "Exile", command: "Command zone" };
    const list = zoneCards(zone);
    const actions =
      isSelf
        ? [
            { label: "To hand", fn: (id: string) => moveCard(code, viewerUid, id, zone, "hand") },
            { label: "To battlefield", fn: (id: string) => moveCard(code, viewerUid, id, zone, "battlefield") },
          ]
        : undefined;
    setViewer({ title: titleMap[zone], cards: list, actions });
  }

  async function openLibrary() {
    if (!isSelf) return;
    const list = await getLibraryContents(code, viewerUid);
    setViewer({
      title: "Library (search)",
      cards: list,
      actions: [
        { label: "To hand", fn: (id: string) => moveCard(code, viewerUid, id, "library", "hand").then(() => shuffleLibrary(code, viewerUid)) },
        { label: "To battlefield", fn: (id: string) => moveCard(code, viewerUid, id, "library", "battlefield").then(() => shuffleLibrary(code, viewerUid)) },
      ],
    });
  }

  // ---- battlefield drag (self only) ----
  function onCardMouseDown(e: React.MouseEvent, id: string, card: BattlefieldCard) {
    if (!isSelf || e.button !== 0) return;
    const rect = fieldRef.current!.getBoundingClientRect();
    drag.current = {
      id,
      dx: e.clientX - rect.left - card.x,
      dy: e.clientY - rect.top - card.y,
    };
    setSelectedCard(id);
  }
  function onFieldMouseMove(e: React.MouseEvent) {
    if (!drag.current || !fieldRef.current) return;
    const rect = fieldRef.current.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left - drag.current.dx);
    const y = Math.max(0, e.clientY - rect.top - drag.current.dy);
    const el = document.getElementById("bf-" + drag.current.id);
    if (el) {
      el.style.left = x + "px";
      el.style.top = y + "px";
    }
  }
  function onFieldMouseUp(e: React.MouseEvent) {
    if (!drag.current || !fieldRef.current) return;
    const rect = fieldRef.current.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left - drag.current.dx);
    const y = Math.max(0, e.clientY - rect.top - drag.current.dy);
    updateBattlefieldCard(code, viewerUid, drag.current.id, { x, y });
    drag.current = null;
  }

  function openCardMenu(e: React.MouseEvent, id: string, card: BattlefieldCard) {
    if (!isSelf) return;
    e.preventDefault();
    const reg = cards[id];
    const sc = reg ? cardCache[reg.scryfallId] : undefined;
    const hasBack = !!sc?.backImage;
    const items: MenuItem[] = [
      {
        label: card.tapped ? "Untap" : "Tap",
        fn: () => updateBattlefieldCard(code, viewerUid, id, { tapped: !card.tapped }),
      },
      {
        label: card.faceDown ? "Turn face up" : "Turn face down",
        fn: () => updateBattlefieldCard(code, viewerUid, id, { faceDown: !card.faceDown }),
      },
    ];
    if (hasBack)
      items.push({
        label: card.flipped ? "Flip to front" : "Flip (DFC)",
        fn: () => updateBattlefieldCard(code, viewerUid, id, { flipped: !card.flipped }),
      });
    items.push(
      {
        label: "+1/+1 counter",
        fn: () =>
          setCounter(code, viewerUid, id, "+1/+1", (card.counters?.["+1/+1"] ?? 0) + 1),
      },
      {
        label: "Remove +1/+1",
        fn: () =>
          setCounter(code, viewerUid, id, "+1/+1", (card.counters?.["+1/+1"] ?? 0) - 1),
      },
      { label: "→ Hand", fn: () => moveCard(code, viewerUid, id, "battlefield", "hand") },
      { label: "→ Graveyard", fn: () => moveCard(code, viewerUid, id, "battlefield", "graveyard") },
      { label: "→ Exile", fn: () => moveCard(code, viewerUid, id, "battlefield", "exile") },
      { label: "→ Command", fn: () => moveCard(code, viewerUid, id, "battlefield", "command") },
      { label: "→ Library top", fn: () => moveToLibrary(code, viewerUid, id, "battlefield", true) },
      { label: "→ Library bottom", fn: () => moveToLibrary(code, viewerUid, id, "battlefield", false) },
    );
    setMenu({ x: e.clientX, y: e.clientY, items });
  }

  const cmdDmgTotal = life
    ? Object.values(life.cmdDmg ?? {}).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className={"seat" + (active ? " active" : "")}>
      <div className="seat-head">
        <strong style={{ flex: 1 }}>
          {player?.name ?? "—"}
          {isSelf && " (you)"}
          {room.meta?.monarchUid === seatUid && " 👑"}
          {!player?.connected && <span className="muted"> · offline</span>}
        </strong>
        <span className="pill">♥ {life?.total ?? "—"}</span>
        {life?.poison ? <span className="pill">☠ {life.poison}</span> : null}
      </div>

      <div className="row" style={{ flexWrap: "wrap", gap: 4 }}>
        <span className="zone-stack" onClick={() => openZone("command")}>
          Command {zones.command?.length ?? 0}
        </span>
        <span className="zone-stack" onClick={() => openZone("graveyard")}>
          GY {zones.graveyard?.length ?? 0}
        </span>
        <span className="zone-stack" onClick={() => openZone("exile")}>
          Exile {zones.exile?.length ?? 0}
        </span>
        <span
          className="zone-stack"
          onClick={openLibrary}
          title={isSelf ? "Search your library" : "Hidden"}
        >
          Library {counts.library}
        </span>
        <span className="zone-stack" style={{ cursor: "default" }}>
          Hand {counts.hand}
        </span>
        {cmdDmgTotal > 0 && <span className="pill">cmd dmg {cmdDmgTotal}</span>}
      </div>

      <div
        className="battlefield"
        ref={fieldRef}
        onMouseMove={onFieldMouseMove}
        onMouseUp={onFieldMouseUp}
        onMouseLeave={onFieldMouseUp}
      >
        {Object.entries(bf).map(([id, card]) => {
          const reg = cards[id];
          return (
            <div
              key={id}
              id={"bf-" + id}
              className={
                "bf-card" +
                (card.tapped ? " tapped" : "") +
                (selectedCard === id ? " selected" : "")
              }
              style={{ left: card.x, top: card.y }}
              onMouseDown={(e) => onCardMouseDown(e, id, card)}
              onClick={() => setSelectedCard(id)}
              onContextMenu={(e) => openCardMenu(e, id, card)}
            >
              <CardView
                scryfallId={reg?.scryfallId}
                name={reg?.name}
                back={card.flipped}
                faceDown={card.faceDown}
              />
              {card.counters &&
                Object.entries(card.counters).map(([k, v]) =>
                  v ? (
                    <span key={k} className="counter-badge">
                      {v}
                    </span>
                  ) : null,
                )}
            </div>
          );
        })}
        {isSelf && (
          <div
            className="muted"
            style={{ position: "absolute", bottom: 4, left: 6, fontSize: 11 }}
          >
            right-click a card for actions · drag to move
          </div>
        )}
      </div>

      {menu && <Menu {...menu} onClose={() => setMenu(null)} />}
      {viewer && (
        <ZoneViewer
          title={viewer.title}
          cards={viewer.cards}
          actions={viewer.actions}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}
