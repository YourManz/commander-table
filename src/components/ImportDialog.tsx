import { useRef, useState } from "react";
import { importDeck, type ParsedDeck } from "../lib/decklist";
import { loadDeck } from "../lib/actions";
import {
  getDecks,
  saveDeck,
  deleteDeck,
  exportDecks,
  importDecks,
  type SavedDeck,
} from "../lib/decks";

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
  const [decks, setDecks] = useState<SavedDeck[]>(getDecks());
  const [saveName, setSaveName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleParse(text = input) {
    setBusy(true);
    setError("");
    try {
      const deck = await importDeck(text);
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

  function loadSaved(d: SavedDeck) {
    setInput(d.text);
    setSaveName(d.name);
    handleParse(d.text);
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

  function handleSave() {
    const name = saveName.trim();
    if (!name || !input.trim()) return;
    setDecks(saveDeck(name, input.trim()));
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

  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((t) => {
      try {
        setDecks(importDecks(t));
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function downloadExport() {
    const blob = new Blob([exportDecks()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "commander-table-decks.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  const total = parsed?.cards.reduce((s, c) => s + c.qty, 0) ?? 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <strong>Import deck</strong>

        {!parsed ? (
          <>
            {decks.length > 0 && (
              <div className="col" style={{ gap: 4 }}>
                <span className="muted">Saved decks</span>
                {decks.map((d) => (
                  <div key={d.id} className="row">
                    <button style={{ flex: 1, textAlign: "left" }} onClick={() => loadSaved(d)}>
                      {d.name}
                    </button>
                    <button
                      className="danger"
                      title="Delete saved deck"
                      onClick={() => setDecks(deleteDeck(d.id))}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <span className="muted">Paste a decklist, or a Moxfield / Archidekt URL.</span>
            <textarea
              rows={8}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={"1 Sol Ring\n1 Atraxa, Praetors' Voice *CMDR*\n…\n\nor https://moxfield.com/decks/…"}
            />
            <div className="row" style={{ flexWrap: "wrap" }}>
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Save as… (name)"
                style={{ flex: 1, minWidth: 120 }}
              />
              <button onClick={handleSave} disabled={!saveName.trim() || !input.trim()}>
                Save
              </button>
            </div>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <button className="primary" onClick={() => handleParse()} disabled={busy || !input.trim()}>
                {busy ? "Loading…" : "Parse"}
              </button>
              <button onClick={onClose}>Cancel</button>
              <div className="spacer" />
              <button onClick={downloadExport} style={{ fontSize: 12 }} title="Export saved decks to a file">
                Export
              </button>
              <button onClick={() => fileRef.current?.click()} style={{ fontSize: 12 }} title="Import a deck export file">
                Import file
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={onImportFile}
              />
            </div>
          </>
        ) : (
          <>
            <span className="muted">
              {total} cards. Tap a card to toggle it as a commander (goes to the command zone).
            </span>
            <div
              style={{ maxHeight: 300, overflow: "auto", display: "flex", flexDirection: "column", gap: 2 }}
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
            <div className="row" style={{ flexWrap: "wrap" }}>
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Save as… (name)"
                style={{ flex: 1, minWidth: 120 }}
              />
              <button onClick={handleSave} disabled={!saveName.trim()}>
                Save
              </button>
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
