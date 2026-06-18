import { useRef, useState } from "react";
import type { BattlefieldCard, RoomSnapshot, ZoneName } from "../lib/types";
import CardView from "./CardView";
import Menu, { type MenuItem } from "./Menu";
import ZoneViewer, { type ViewerCard } from "./ZoneViewer";
import { useUI } from "../store";
import { seatColor } from "../lib/colors";
import {
  moveCard,
  moveToLibrary,
  updateBattlefieldCard,
  setCounter,
  getLibraryContents,
  shuffleLibrary,
} from "../lib/actions";

const CARD_W = 74;
const CARD_H = 103;

interface MenuState {
  x: number;
  y: number;
  items: MenuItem[];
}
interface Marquee {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
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

  const selectedCards = useUI((s) => s.selectedCards);
  const setSelection = useUI((s) => s.setSelection);
  const toggleSelection = useUI((s) => s.toggleSelection);
  const clearSelection = useUI((s) => s.clearSelection);
  const cardCache = useUI((s) => s.cardCache);

  const [menu, setMenu] = useState<MenuState | null>(null);
  const [marquee, setMarquee] = useState<Marquee | null>(null);
  const [viewer, setViewer] = useState<{
    title: string;
    cards: ViewerCard[];
    actions?: { label: string; fn: (id: string) => void }[];
    fromZone?: string;
  } | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const marqueeRef = useRef<Marquee | null>(null);
  const press = useRef<{ timer: number; x: number; y: number } | null>(null);

  const selectedHere = selectedCards.filter((id) => bf[id]);

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
    const actions = isSelf
      ? [
          { label: "To hand", fn: (id: string) => moveCard(code, viewerUid, id, zone, "hand") },
          { label: "To battlefield", fn: (id: string) => moveCard(code, viewerUid, id, zone, "battlefield") },
        ]
      : undefined;
    setViewer({ title: titleMap[zone], cards: list, actions, fromZone: isSelf ? zone : undefined });
  }

  async function openLibrary() {
    if (!isSelf) return;
    const list = await getLibraryContents(code, viewerUid);
    setViewer({
      title: "Library (search)",
      cards: list,
      fromZone: "library",
      actions: [
        { label: "To hand", fn: (id: string) => moveCard(code, viewerUid, id, "library", "hand").then(() => shuffleLibrary(code, viewerUid)) },
        { label: "To battlefield", fn: (id: string) => moveCard(code, viewerUid, id, "library", "battlefield").then(() => shuffleLibrary(code, viewerUid)) },
      ],
    });
  }

  function clearPress() {
    if (press.current) {
      clearTimeout(press.current.timer);
      press.current = null;
    }
  }

  // ---- pointer interaction (mouse + touch) ----
  function onCardPointerDown(e: React.PointerEvent, id: string, card: BattlefieldCard) {
    if (!isSelf || e.button !== 0) return;
    if (e.shiftKey) {
      toggleSelection(id);
      return;
    }
    if (!selectedCards.includes(id)) setSelection([id]);
    const rect = fieldRef.current!.getBoundingClientRect();
    try {
      fieldRef.current!.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    drag.current = {
      id,
      dx: e.clientX - rect.left - card.x,
      dy: e.clientY - rect.top - card.y,
      moved: false,
    };
    // long-press opens the action menu on touch
    if (e.pointerType === "touch") {
      const x = e.clientX;
      const y = e.clientY;
      press.current = {
        x,
        y,
        timer: window.setTimeout(() => {
          drag.current = null;
          showCardMenu(x, y, id, card);
        }, 450),
      };
    }
  }

  function onFieldPointerDown(e: React.PointerEvent) {
    if (!isSelf || e.button !== 0) return;
    if (e.target !== fieldRef.current) return; // started on a card
    if (!e.shiftKey) clearSelection();
    try {
      fieldRef.current.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const rect = fieldRef.current.getBoundingClientRect();
    const m = {
      x0: e.clientX - rect.left,
      y0: e.clientY - rect.top,
      x1: e.clientX - rect.left,
      y1: e.clientY - rect.top,
    };
    marqueeRef.current = m;
    setMarquee(m);
  }

  function onFieldPointerMove(e: React.PointerEvent) {
    if (!fieldRef.current) return;
    const rect = fieldRef.current.getBoundingClientRect();
    if (drag.current) {
      const x = Math.max(0, e.clientX - rect.left - drag.current.dx);
      const y = Math.max(0, e.clientY - rect.top - drag.current.dy);
      clearPress(); // any movement cancels a pending long-press
      drag.current.moved = true;
      const el = document.getElementById("bf-" + drag.current.id);
      if (el) {
        el.style.left = x + "px";
        el.style.top = y + "px";
      }
    } else if (marqueeRef.current) {
      const m = { ...marqueeRef.current, x1: e.clientX - rect.left, y1: e.clientY - rect.top };
      marqueeRef.current = m;
      setMarquee(m);
    }
  }

  function onFieldPointerUp(e: React.PointerEvent) {
    clearPress();
    if (!fieldRef.current) return;
    const rect = fieldRef.current.getBoundingClientRect();
    if (drag.current) {
      if (drag.current.moved) {
        const x = Math.max(0, e.clientX - rect.left - drag.current.dx);
        const y = Math.max(0, e.clientY - rect.top - drag.current.dy);
        updateBattlefieldCard(code, viewerUid, drag.current.id, { x, y });
      }
      drag.current = null;
    } else if (marqueeRef.current) {
      const m = marqueeRef.current;
      const minX = Math.min(m.x0, m.x1);
      const maxX = Math.max(m.x0, m.x1);
      const minY = Math.min(m.y0, m.y1);
      const maxY = Math.max(m.y0, m.y1);
      const hits = Object.entries(bf)
        .filter(([, c]) => c.x < maxX && c.x + CARD_W > minX && c.y < maxY && c.y + CARD_H > minY)
        .map(([id]) => id);
      if (hits.length) setSelection(e.shiftKey ? [...new Set([...selectedCards, ...hits])] : hits);
      marqueeRef.current = null;
      setMarquee(null);
    }
  }

  // ---- card / group action menu ----
  function onFieldDrop(e: React.DragEvent) {
    if (!isSelf || !fieldRef.current) return;
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    e.preventDefault();
    let data: { id: string; from: string };
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    const rect = fieldRef.current.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left - CARD_W / 2);
    const y = Math.max(0, e.clientY - rect.top - CARD_H / 2);
    moveCard(code, viewerUid, data.id, data.from as ZoneName, "battlefield", { x, y });
  }

  function showCardMenu(clientX: number, clientY: number, id: string, card: BattlefieldCard) {
    if (!isSelf) return;
    const group = selectedHere.length > 1 && selectedHere.includes(id);
    const targets = group ? selectedHere : [id];
    const reg = cards[id];
    const sc = reg ? cardCache[reg.scryfallId] : undefined;
    const hasBack = !!sc?.backImage;
    const each = (fn: (tid: string) => void) => () => targets.forEach(fn);

    const items: MenuItem[] = [
      {
        label: group ? `Tap ${targets.length}` : card.tapped ? "Untap" : "Tap",
        fn: each((tid) =>
          updateBattlefieldCard(code, viewerUid, tid, { tapped: group ? true : !bf[tid].tapped }),
        ),
      },
    ];
    if (group)
      items.push({
        label: `Untap ${targets.length}`,
        fn: each((tid) => updateBattlefieldCard(code, viewerUid, tid, { tapped: false })),
      });
    if (!group && hasBack)
      items.push({
        label: card.flipped ? "Flip to front" : "Flip (DFC)",
        fn: () => updateBattlefieldCard(code, viewerUid, id, { flipped: !card.flipped }),
      });
    if (!group)
      items.push({
        label: card.faceDown ? "Turn face up" : "Turn face down",
        fn: () => updateBattlefieldCard(code, viewerUid, id, { faceDown: !card.faceDown }),
      });
    items.push(
      {
        label: "+1/+1 counter",
        fn: each((tid) => setCounter(code, viewerUid, tid, "+1/+1", (bf[tid].counters?.["+1/+1"] ?? 0) + 1)),
      },
      {
        label: "Add counter…",
        fn: () => {
          const kind = prompt("Counter type (e.g. loyalty, charge, oil):");
          if (!kind) return;
          targets.forEach((tid) => setCounter(code, viewerUid, tid, kind, (bf[tid].counters?.[kind] ?? 0) + 1));
        },
      },
      { label: "→ Hand", fn: each((tid) => moveCard(code, viewerUid, tid, "battlefield", "hand")) },
      { label: "→ Graveyard", fn: each((tid) => moveCard(code, viewerUid, tid, "battlefield", "graveyard")) },
      { label: "→ Exile", fn: each((tid) => moveCard(code, viewerUid, tid, "battlefield", "exile")) },
      { label: "→ Command", fn: each((tid) => moveCard(code, viewerUid, tid, "battlefield", "command")) },
      { label: "→ Library top", fn: each((tid) => moveToLibrary(code, viewerUid, tid, "battlefield", true)) },
    );
    setMenu({ x: clientX, y: clientY, items });
  }

  function groupAction(fn: (id: string) => void) {
    selectedHere.forEach(fn);
  }

  const cmdDmgTotal = life ? Object.values(life.cmdDmg ?? {}).reduce((a, b) => a + b, 0) : 0;
  const color = seatColor(player?.seat ?? 0);

  return (
    <div className={"seat" + (active ? " active" : "")} style={{ borderLeft: `4px solid ${color}` }}>
      <div className="seat-head">
        <span style={{ width: 10, height: 10, borderRadius: 999, background: color, flex: "0 0 auto" }} />
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
        <span className="zone-stack" onClick={openLibrary} title={isSelf ? "Search your library" : "Hidden"}>
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
        onPointerDown={onFieldPointerDown}
        onPointerMove={onFieldPointerMove}
        onPointerUp={onFieldPointerUp}
        onPointerCancel={onFieldPointerUp}
        onDragOver={(e) => isSelf && e.preventDefault()}
        onDrop={onFieldDrop}
        style={{ touchAction: isSelf ? "none" : undefined }}
      >
        {isSelf && selectedHere.length > 1 && (
          <div
            style={{
              position: "absolute", top: 4, left: 4, zIndex: 5, display: "flex", gap: 4,
              flexWrap: "wrap", background: "var(--panel)", border: "1px solid var(--accent)",
              borderRadius: "var(--radius)", padding: 4,
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <span className="pill accent">{selectedHere.length} selected</span>
            <button onClick={() => groupAction((id) => updateBattlefieldCard(code, viewerUid, id, { tapped: true }))} style={{ fontSize: 11 }}>Tap</button>
            <button onClick={() => groupAction((id) => updateBattlefieldCard(code, viewerUid, id, { tapped: false }))} style={{ fontSize: 11 }}>Untap</button>
            <button onClick={() => { groupAction((id) => moveCard(code, viewerUid, id, "battlefield", "graveyard")); clearSelection(); }} style={{ fontSize: 11 }}>→ GY</button>
            <button onClick={() => { groupAction((id) => moveCard(code, viewerUid, id, "battlefield", "exile")); clearSelection(); }} style={{ fontSize: 11 }}>→ Exile</button>
            <button onClick={() => { groupAction((id) => moveCard(code, viewerUid, id, "battlefield", "hand")); clearSelection(); }} style={{ fontSize: 11 }}>→ Hand</button>
            <button onClick={() => clearSelection()} style={{ fontSize: 11 }}>clear</button>
          </div>
        )}

        {Object.entries(bf).map(([id, card]) => {
          const reg = cards[id];
          return (
            <div
              key={id}
              id={"bf-" + id}
              className={"bf-card" + (card.tapped ? " tapped" : "") + (selectedCards.includes(id) ? " selected" : "")}
              style={{ left: card.x, top: card.y }}
              onPointerDown={(e) => onCardPointerDown(e, id, card)}
              onContextMenu={(e) => {
                if (!isSelf) return;
                e.preventDefault();
                showCardMenu(e.clientX, e.clientY, id, card);
              }}
            >
              <CardView scryfallId={reg?.scryfallId} name={reg?.name} back={card.flipped} faceDown={card.faceDown} />
              {card.counters && Object.values(card.counters).some(Boolean) && (
                <div className="counter-stack">
                  {Object.entries(card.counters).map(([k, v]) =>
                    v ? (
                      <span key={k} className="counter-badge" title={k}>
                        {k === "+1/+1" ? `+${v}` : `${k.slice(0, 3)} ${v}`}
                      </span>
                    ) : null,
                  )}
                </div>
              )}
            </div>
          );
        })}

        {marquee && (
          <div
            style={{
              position: "absolute",
              left: Math.min(marquee.x0, marquee.x1),
              top: Math.min(marquee.y0, marquee.y1),
              width: Math.abs(marquee.x1 - marquee.x0),
              height: Math.abs(marquee.y1 - marquee.y0),
              border: "1px solid var(--accent)",
              background: "rgba(110,168,254,0.15)",
              zIndex: 4,
              pointerEvents: "none",
            }}
          />
        )}

        {isSelf && (
          <div className="muted" style={{ position: "absolute", bottom: 4, left: 6, fontSize: 11 }}>
            drag empty space to box-select · shift-click to add · right-click (or long-press) for actions
          </div>
        )}
      </div>

      {menu && <Menu {...menu} onClose={() => setMenu(null)} />}
      {viewer && (
        <ZoneViewer
          title={viewer.title}
          cards={viewer.cards}
          actions={viewer.actions}
          fromZone={viewer.fromZone}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}
