import { useState } from "react";
import CardView from "./CardView";
import { useUI } from "../store";

type Bucket = "top" | "bottom" | "grave";

// Resolve a scry/surveil: assign each peeked card to top, bottom, or graveyard.
export default function ScryModal({
  title,
  cards,
  allowGrave,
  onApply,
  onClose,
}: {
  title: string;
  cards: { id: string; name: string }[];
  allowGrave: boolean;
  onApply: (keepTop: string[], toBottom: string[], toGrave: string[]) => void;
  onClose: () => void;
}) {
  const cardCache = useUI((s) => s.cardCache);
  const [buckets, setBuckets] = useState<Record<string, Bucket>>(
    Object.fromEntries(cards.map((c) => [c.id, "top"])),
  );

  // resolve names -> scryfallId via cache (best effort)
  function scryId(name: string) {
    return Object.values(cardCache).find(
      (c) => c.name.toLowerCase() === name.toLowerCase(),
    )?.id;
  }

  function apply() {
    const keepTop = cards.filter((c) => buckets[c.id] === "top").map((c) => c.id);
    const toBottom = cards.filter((c) => buckets[c.id] === "bottom").map((c) => c.id);
    const toGrave = cards.filter((c) => buckets[c.id] === "grave").map((c) => c.id);
    onApply(keepTop, toBottom, toGrave);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <strong>{title}</strong>
        <p className="muted" style={{ margin: 0 }}>
          Top card is leftmost. Choose where each goes.
        </p>
        <div className="grid-cards">
          {cards.map((c) => (
            <div key={c.id} className="col" style={{ gap: 4 }}>
              <CardView scryfallId={scryId(c.name)} name={c.name} />
              <div className="row" style={{ gap: 3 }}>
                {(["top", "bottom", ...(allowGrave ? ["grave"] : [])] as Bucket[]).map(
                  (b) => (
                    <button
                      key={b}
                      onClick={() => setBuckets((s) => ({ ...s, [c.id]: b }))}
                      className={buckets[c.id] === b ? "primary" : ""}
                      style={{ fontSize: 10, padding: "3px 5px", flex: 1 }}
                    >
                      {b === "grave" ? "GY" : b}
                    </button>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="row">
          <button className="primary" onClick={apply}>
            Apply
          </button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
