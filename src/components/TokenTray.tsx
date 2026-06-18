import { useState } from "react";
import { createToken } from "../lib/actions";
import { searchTokens } from "../lib/scryfall";
import type { ScryCard } from "../lib/types";

export default function TokenTray({
  code,
  uid,
  tray,
}: {
  code: string;
  uid: string;
  tray: { scryfallId: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ScryCard[]>([]);
  const [searching, setSearching] = useState(false);

  async function doSearch() {
    setSearching(true);
    setResults(await searchTokens(query));
    setSearching(false);
  }

  return (
    <>
      <button onClick={() => setOpen(true)}>Tokens ({tray.length})</button>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="row">
              <strong style={{ flex: 1 }}>Tokens</strong>
              <button onClick={() => setOpen(false)}>Close</button>
            </div>

            <span className="muted">From your deck</span>
            {tray.length === 0 ? (
              <p className="muted">No related tokens detected.</p>
            ) : (
              <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                {tray.map((t) => (
                  <button
                    key={t.scryfallId}
                    onClick={() => createToken(code, uid, t.scryfallId, t.name)}
                  >
                    + {t.name}
                  </button>
                ))}
              </div>
            )}

            <span className="muted">Search any token</span>
            <div className="row">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                placeholder="e.g. Goblin, Treasure, 2/2 zombie"
                style={{ flex: 1 }}
              />
              <button onClick={doSearch} disabled={searching}>
                {searching ? "…" : "Search"}
              </button>
            </div>
            {results.length > 0 && (
              <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                {results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => createToken(code, uid, r.id, r.name)}
                  >
                    + {r.name} <span className="muted">{r.typeLine}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
