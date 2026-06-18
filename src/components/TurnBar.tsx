import type { RoomSnapshot } from "../lib/types";
import { PHASES, passTurn, setPhase, toggleSkipDraw } from "../lib/actions";

export default function TurnBar({
  code,
  room,
}: {
  code: string;
  room: RoomSnapshot;
}) {
  const meta = room.meta!;
  const active = Object.values(room.players).find((p) => p.seat === meta.turnSeat);

  return (
    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
      <span className="pill accent">Turn: {active?.name ?? "—"}</span>
      <div className="row" style={{ gap: 2 }}>
        {PHASES.map((ph) => (
          <button
            key={ph}
            onClick={() => setPhase(code, ph)}
            className={meta.phase === ph ? "primary" : ""}
            style={{ fontSize: 11, padding: "3px 6px" }}
          >
            {ph}
          </button>
        ))}
      </div>
      <label className="row" style={{ gap: 4, fontSize: 12 }}>
        <input
          type="checkbox"
          checked={meta.skipDraw}
          onChange={(e) => toggleSkipDraw(code, e.target.checked)}
        />
        skip next draw
      </label>
      <button className="primary" onClick={() => passTurn(code)}>
        Pass turn
      </button>
    </div>
  );
}
