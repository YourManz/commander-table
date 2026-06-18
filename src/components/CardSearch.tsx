import { useState } from "react";
import { searchCards } from "../lib/scryfall";
import { putCardInPlay } from "../lib/actions";
import { useUI } from "../store";
import type { ScryCard, ZoneName } from "../lib/types";
import CardView from "./CardView";

// Search any Magic card and drop a copy into one of your zones.
export default function CardSearch({
  code,
  uid,
  onClose,
}: {
  code: string;
  uid: string;
  onClose: () => void;
}) {
  const putCards = useUI((s) => s.putCards);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ScryCard[]>([]);
  const [busy, setBusy] = useState(false);
  const [zone, setZone] = useState<ZoneName>("battlefield");

  async function run() {
    if (!query.trim()) return;
    setBusy(true);
    const r = await searchCards(query.trim());
    putCards(r);
    setResults(r);
    setBusy(false);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <strong style={{ flex: 1 }}>Search a card</strong>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="row">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="e.g. Sol Ring, t:dragon, o:draw"
            style={{ flex: 1 }}
          />
          <select value={zone} onChange={(e) => setZone(e.target.value as ZoneName)}>
            <option value="battlefield">to battlefield</option>
            <option value="hand">to hand</option>
            <option value="command">to command</option>
            <option value="graveyard">to graveyard</option>
            <option value="exile">to exile</option>
          </select>
          <button onClick={run} disabled={busy}>
            {busy ? "…" : "Search"}
          </button>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>
          Click a result to add it to your {zone}. Supports Scryfall syntax.
        </p>
        {results.length > 0 && (
          <div className="grid-cards">
            {results.map((r) => (
              <div
                key={r.id}
                className="col"
                style={{ gap: 4, cursor: "pointer" }}
                onClick={() => {
                  putCardInPlay(code, uid, r.id, r.name, zone);
                  onClose();
                }}
              >
                <CardView scryfallId={r.id} name={r.name} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
