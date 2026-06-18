import { useState } from "react";
import type { RoomSnapshot } from "../lib/types";
import { getFormat } from "../lib/formats";
import { startGame } from "../lib/room";
import { useUI } from "../store";
import ImportDialog from "../components/ImportDialog";

export default function Lobby({
  code,
  uid,
  room,
}: {
  code: string;
  uid: string;
  room: RoomSnapshot;
}) {
  const [showImport, setShowImport] = useState(false);
  const setCode = useUI((s) => s.setCode);
  const meta = room.meta!;
  const fmt = getFormat(meta.formatId);
  const players = Object.values(room.players).sort((a, b) => a.seat - b.seat);
  const isHost = meta.hostUid === uid;
  const me = room.players[uid];
  const seats = Array.from({ length: meta.seats }, (_, i) => i);

  return (
    <div className="center-screen">
      <div className="center-box">
        <div className="row">
          <h1 className="title" style={{ flex: 1 }}>
            Lobby
          </h1>
          <span className="pill accent" style={{ fontSize: 16, letterSpacing: 3 }}>
            {code}
          </span>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {fmt.name} · {meta.life} life · up to {meta.seats} players ·{" "}
          {meta.commander ? "commander rules on" : "no commander rules"}
        </p>
        <p className="muted" style={{ margin: 0 }}>
          Share the code <strong>{code}</strong> with friends to join.
        </p>

        <div className="card-panel col">
          <strong>Seats</strong>
          {seats.map((seat) => {
            const p = players.find((pl) => pl.seat === seat);
            return (
              <div key={seat} className="row">
                <span className="muted" style={{ width: 50 }}>
                  Seat {seat + 1}
                </span>
                <span style={{ flex: 1 }}>
                  {p ? p.name : <span className="muted">— open —</span>}
                  {p?.uid === uid && " (you)"}
                  {p?.uid === meta.hostUid && (
                    <span className="pill" style={{ marginLeft: 6 }}>
                      host
                    </span>
                  )}
                </span>
                {p?.deckLoaded ? (
                  <span className="pill" style={{ borderColor: "var(--ok)", color: "var(--ok)" }}>
                    deck ready
                  </span>
                ) : (
                  p && <span className="muted">no deck</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="row">
          <button className="primary" onClick={() => setShowImport(true)}>
            {me?.deckLoaded ? "Re-import deck" : "Import deck"}
          </button>
          <div className="spacer" />
          <button onClick={() => setCode(null)}>Leave</button>
          {isHost && (
            <button
              className="primary"
              onClick={() => startGame(code)}
              disabled={!players.every((p) => p.deckLoaded)}
              title={
                players.every((p) => p.deckLoaded)
                  ? ""
                  : "All seated players need a deck loaded"
              }
            >
              Start game
            </button>
          )}
        </div>

        {showImport && (
          <ImportDialog code={code} uid={uid} onClose={() => setShowImport(false)} />
        )}
      </div>
    </div>
  );
}
