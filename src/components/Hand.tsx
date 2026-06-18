import { useState } from "react";
import CardView from "./CardView";
import Menu, { type MenuItem } from "./Menu";
import { moveCard, moveToLibrary } from "../lib/actions";

export default function Hand({
  code,
  uid,
  hand,
  cardmap,
}: {
  code: string;
  uid: string;
  hand: string[];
  cardmap: Record<string, { scryfallId: string; name: string }>;
}) {
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(
    null,
  );

  function openMenu(e: React.MouseEvent, id: string) {
    e.preventDefault();
    const items: MenuItem[] = [
      { label: "Play to battlefield", fn: () => moveCard(code, uid, id, "hand", "battlefield") },
      { label: "→ Graveyard (discard)", fn: () => moveCard(code, uid, id, "hand", "graveyard") },
      { label: "→ Exile", fn: () => moveCard(code, uid, id, "hand", "exile") },
      { label: "→ Command", fn: () => moveCard(code, uid, id, "hand", "command") },
      { label: "→ Library top", fn: () => moveToLibrary(code, uid, id, "hand", true) },
      { label: "→ Library bottom", fn: () => moveToLibrary(code, uid, id, "hand", false) },
    ];
    setMenu({ x: e.clientX, y: e.clientY, items });
  }

  return (
    <div className="hand">
      <span className="muted" style={{ whiteSpace: "nowrap", padding: "0 4px" }}>
        Hand {hand.length}
      </span>
      {hand.map((id) => {
        const c = cardmap[id];
        return (
          <div
            key={id}
            className="mtg-card"
            title="Drag to battlefield, or click for actions"
            draggable
            onDragStart={(e) =>
              e.dataTransfer.setData(
                "text/plain",
                JSON.stringify({ id, from: "hand" }),
              )
            }
            onClick={(e) => openMenu(e, id)}
            onContextMenu={(e) => openMenu(e, id)}
            style={{ cursor: "grab" }}
          >
            <CardView scryfallId={c?.scryfallId} name={c?.name} />
          </div>
        );
      })}
      {hand.length === 0 && <span className="muted">empty</span>}
      {menu && <Menu {...menu} onClose={() => setMenu(null)} />}
    </div>
  );
}
