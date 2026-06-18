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

// Modal listing every card in a zone (in order). Optional per-card actions are
// shown when the viewer owns the zone (e.g. tutoring from library).
export default function ZoneViewer({
  title,
  cards,
  actions = [],
  onClose,
}: {
  title: string;
  cards: ViewerCard[];
  actions?: ViewerAction[];
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <strong style={{ flex: 1 }}>
            {title} ({cards.length})
          </strong>
          <button onClick={onClose}>Close</button>
        </div>
        {cards.length === 0 ? (
          <p className="muted">Empty.</p>
        ) : (
          <div className="grid-cards">
            {cards.map((c, i) => (
              <div key={c.instanceId + i} className="col" style={{ gap: 4 }}>
                <CardView scryfallId={c.scryfallId} name={c.name} />
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
