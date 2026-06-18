import type { RoomSnapshot } from "../lib/types";
import { COLORS } from "../lib/types";
import {
  setLife,
  setPoison,
  setMana,
  clearMana,
  setCmdDmg,
  setMonarch,
} from "../lib/actions";

export default function LifePanel({
  code,
  uid,
  room,
}: {
  code: string;
  uid: string;
  room: RoomSnapshot;
}) {
  const life = room.life[uid];
  if (!life) return null;
  const opponents = Object.values(room.players)
    .filter((p) => p.uid !== uid)
    .sort((a, b) => a.seat - b.seat);
  const commander = room.meta?.commander;

  return (
    <div className="col" style={{ gap: 8, minWidth: 200 }}>
      <div className="row">
        <strong style={{ flex: 1 }}>Life</strong>
        <button onClick={() => setLife(code, uid, life.total - 5)}>-5</button>
        <button onClick={() => setLife(code, uid, life.total - 1)}>-1</button>
        <strong style={{ fontSize: 20, minWidth: 32, textAlign: "center" }}>
          {life.total}
        </strong>
        <button onClick={() => setLife(code, uid, life.total + 1)}>+1</button>
      </div>

      <div className="row" style={{ gap: 4 }}>
        <span className="muted">Poison</span>
        <button onClick={() => setPoison(code, uid, life.poison - 1)}>-</button>
        <span>{life.poison}</span>
        <button onClick={() => setPoison(code, uid, life.poison + 1)}>+</button>
        {commander && (
          <button
            style={{ marginLeft: "auto" }}
            onClick={() =>
              setMonarch(code, room.meta?.monarchUid === uid ? null : uid)
            }
          >
            {room.meta?.monarchUid === uid ? "Drop crown 👑" : "Claim monarch 👑"}
          </button>
        )}
      </div>

      <div className="row" style={{ gap: 3, flexWrap: "wrap" }}>
        <span className="muted">Mana</span>
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setMana(code, uid, c, (life.mana?.[c] ?? 0) + 1)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMana(code, uid, c, (life.mana?.[c] ?? 0) - 1);
            }}
            title="click +1, right-click -1"
            className={life.mana?.[c] ? "primary" : ""}
            style={{ padding: "3px 7px" }}
          >
            {c}
            {life.mana?.[c] ? " " + life.mana[c] : ""}
          </button>
        ))}
        <button onClick={() => clearMana(code, uid)} style={{ fontSize: 11 }}>
          clear
        </button>
      </div>

      {commander && opponents.length > 0 && (
        <div className="col" style={{ gap: 3 }}>
          <span className="muted">Commander damage taken</span>
          {opponents.map((o) => {
            const dmg = life.cmdDmg?.[o.uid] ?? 0;
            return (
              <div key={o.uid} className="row" style={{ gap: 4 }}>
                <span style={{ flex: 1 }}>
                  from {o.name}
                  {dmg >= 21 && (
                    <span style={{ color: "var(--danger)" }}> · lethal</span>
                  )}
                </span>
                <button onClick={() => setCmdDmg(code, uid, o.uid, dmg - 1)}>-</button>
                <span style={{ minWidth: 16, textAlign: "center" }}>{dmg}</span>
                <button onClick={() => setCmdDmg(code, uid, o.uid, dmg + 1)}>+</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
