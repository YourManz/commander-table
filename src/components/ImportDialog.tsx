import { useState } from "react";
import { importDeck, type ParsedDeck } from "../lib/decklist";
import { loadDeck } from "../lib/actions";

export default function ImportDialog({
  code,
  uid,
  onClose,
}: {
  code: string;
  uid: string;
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<ParsedDeck | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleParse() {
    setBusy(true);
    setError("");
    try {
      const deck = await importDeck(input);
      if (!deck.cards.length) throw new Error("No cards found in that input.");
      setParsed(deck);
    } catch (e) {
      setError(
        (e as Error).message +
          " — if this was a URL, the deck site may have blocked the request; try pasting the decklist text instead.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleLoad() {
    if (!parsed) return;
    setBusy(true);
    setError("");
    try {
      await loadDeck(code, uid, parsed);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function toggleCommander(name: string) {
    if (!parsed) return;
    const cards = parsed.cards.map((c) =>
      c.name === name ? { ...c, commander: !c.commander } : c,
    );
    setParsed({
      ...parsed,
      cards,
      commanders: cards.filter((c) => c.commander).map((c) => c.name),
    });
  }

  const total = parsed?.cards.reduce((s, c) => s + c.qty, 0) ?? 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <strong>Import deck</strong>
        {!parsed ? (
          <>
            <p className="muted" style={{ margin: 0 }}>
              Paste a decklist, or a Moxfield / Archidekt deck URL.
            </p>
            <textarea
              rows={10}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={"1 Sol Ring\n1 Atraxa, Praetors' Voice *CMDR*\n…\n\nor https://moxfield.com/decks/…"}
            />
            <div className="row">
              <button
                className="primary"
                onClick={handleParse}
                disabled={busy || !input.trim()}
              >
                {busy ? "Loading…" : "Parse"}
              </button>
              <button onClick={onClose}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <p className="muted" style={{ margin: 0 }}>
              {total} cards. Tap a card to toggle it as a commander (goes to the
              command zone).
            </p>
            <div
              style={{
                maxHeight: 320,
                overflow: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {parsed.cards.map((c) => (
                <div
                  key={c.name}
                  className="row"
                  style={{ cursor: "pointer", padding: "2px 4px" }}
                  onClick={() => toggleCommander(c.name)}
                >
                  <span style={{ width: 24 }} className="muted">
                    {c.qty}
                  </span>
                  <span style={{ flex: 1 }}>{c.name}</span>
                  {c.commander && <span className="pill accent">commander</span>}
                </div>
              ))}
            </div>
            <div className="row">
              <button className="primary" onClick={handleLoad} disabled={busy}>
                {busy ? "Loading…" : "Load deck"}
              </button>
              <button onClick={() => setParsed(null)}>Back</button>
            </div>
          </>
        )}
        {error && <div style={{ color: "var(--danger)" }}>{error}</div>}
      </div>
    </div>
  );
}
