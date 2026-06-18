import { useState } from "react";
import CardView from "./CardView";

export interface ViewerCard {
  instanceId: string;
  scryfallId?: string;
  name?: string;
}

export interface ViewerAction {
  label: string;
  fn: (instanceId: string) => void;
}

// Modal listing every card in a zone (in order). When `fromZone` is set, cards
// are draggable onto the battlefield: on drag start the backdrop becomes
// click-through so the board behind receives the drop, and the modal closes when
// the drag ends.
export default function ZoneViewer({
  title,
  cards,
  actions = [],
  fromZone,
  onClose,
}: {
  title: string;
  cards: ViewerCard[];
  actions?: ViewerAction[];
  fromZone?: string;
  onClose: () => void;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className="modal-backdrop"
      style={{ pointerEvents: dragging ? "none" : "auto", opacity: dragging ? 0.25 : 1 }}
      onClick={onClose}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <strong style={{ flex: 1 }}>
            {title} ({cards.length})
          </strong>
          {fromZone && (
            <span className="muted" style={{ fontSize: 11 }}>
              drag a card to the battlefield
            </span>
          )}
          <button onClick={onClose}>Close</button>
        </div>
        {cards.length === 0 ? (
          <p className="muted">Empty.</p>
        ) : (
          <div className="grid-cards">
            {cards.map((c, i) => (
              <div key={c.instanceId + i} className="col" style={{ gap: 4 }}>
                <div
                  draggable={!!fromZone}
                  onDragStart={(e) => {
                    if (!fromZone) return;
                    e.dataTransfer.setData(
                      "text/plain",
                      JSON.stringify({ id: c.instanceId, from: fromZone }),
                    );
                    setDragging(true);
                  }}
                  onDragEnd={() => {
                    setDragging(false);
                    onClose();
                  }}
                  style={{ cursor: fromZone ? "grab" : "default" }}
                >
                  <CardView scryfallId={c.scryfallId} name={c.name} />
                </div>
                {actions.map((a) => (
                  <button
                    key={a.label}
                    onClick={() => {
                      a.fn(c.instanceId);
                      onClose();
                    }}
                    style={{ fontSize: 11, padding: "3px 4px" }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
