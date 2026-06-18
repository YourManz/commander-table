import { useState } from "react";
import { useUI } from "../store";
import { createRoom, joinRoom } from "../lib/room";
import { FORMATS } from "../lib/formats";

export default function Home() {
  const { name, setName, setCode } = useUI();
  const [formatId, setFormatId] = useState("commander");
  const [customLife, setCustomLife] = useState(40);
  const [customSeats, setCustomSeats] = useState(4);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const fmt = FORMATS.find((f) => f.id === formatId)!;

  async function handleCreate() {
    if (!name.trim()) return setError("Enter a name first.");
    setBusy(true);
    setError("");
    try {
      const code = await createRoom(
        formatId,
        name.trim(),
        customLife,
        customSeats,
      );
      setCode(code);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!name.trim()) return setError("Enter a name first.");
    if (!joinCode.trim()) return setError("Enter a game code.");
    setBusy(true);
    setError("");
    try {
      const code = joinCode.trim().toUpperCase();
      await joinRoom(code, name.trim());
      setCode(code);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="center-box">
        <h1 className="title">Commander Table</h1>
        <p className="muted">
          Play Magic with friends — share a game code, import decklists.
        </p>

        <div className="card-panel col">
          <label className="col">
            <span className="muted">Your name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kobe"
            />
          </label>
        </div>

        <div className="card-panel col">
          <strong>Create a game</strong>
          <label className="col">
            <span className="muted">Format</span>
            <select
              value={formatId}
              onChange={(e) => setFormatId(e.target.value)}
            >
              {FORMATS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                  {f.custom ? "" : ` — ${f.life} life, ${f.seats}p`}
                </option>
              ))}
            </select>
          </label>
          {fmt.custom && (
            <div className="row">
              <label className="col" style={{ flex: 1 }}>
                <span className="muted">Life</span>
                <input
                  type="number"
                  value={customLife}
                  onChange={(e) => setCustomLife(Number(e.target.value))}
                />
              </label>
              <label className="col" style={{ flex: 1 }}>
                <span className="muted">Seats</span>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={customSeats}
                  onChange={(e) => setCustomSeats(Number(e.target.value))}
                />
              </label>
            </div>
          )}
          <button className="primary" onClick={handleCreate} disabled={busy}>
            Create game
          </button>
        </div>

        <div className="card-panel col">
          <strong>Join a game</strong>
          <div className="row">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="CODE"
              maxLength={4}
              style={{ flex: 1, textTransform: "uppercase", letterSpacing: 2 }}
            />
            <button onClick={handleJoin} disabled={busy}>
              Join
            </button>
          </div>
        </div>

        {error && <div style={{ color: "var(--danger)" }}>{error}</div>}
      </div>
    </div>
  );
}
