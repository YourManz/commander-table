import { useMemo, useState } from "react";
import type { RoomSnapshot } from "../lib/types";
import { useUI } from "../store";
import { usePrivate } from "../hooks/useRoom";
import { useHotkeys } from "../hooks/useHotkeys";
import {
  drawCards,
  millCards,
  peekTop,
  applyScry,
  rollDie,
  passTurn,
  updateBattlefieldCard,
} from "../lib/actions";
import { resolveNames } from "../lib/scryfall";
import Seat from "../components/Seat";
import Hand from "../components/Hand";
import LifePanel from "../components/LifePanel";
import LibraryActions from "../components/LibraryActions";
import TokenTray from "../components/TokenTray";
import DiceWidget from "../components/DiceWidget";
import TurnBar from "../components/TurnBar";
import LogChat from "../components/LogChat";
import ResetDialog from "../components/ResetDialog";
import HotkeyHelp from "../components/HotkeyHelp";
import ScryModal from "../components/ScryModal";

export default function Table({
  code,
  uid,
  room,
}: {
  code: string;
  uid: string;
  room: RoomSnapshot;
}) {
  const setCode = useUI((s) => s.setCode);
  const name = useUI((s) => s.name);
  const focusedSeat = useUI((s) => s.focusedSeat);
  const setFocusedSeat = useUI((s) => s.setFocusedSeat);
  const selectedCard = useUI((s) => s.selectedCard);
  const putCards = useUI((s) => s.putCards);
  const priv = usePrivate(code, uid);

  const [showReset, setShowReset] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [scry, setScry] = useState<{
    title: string;
    cards: { id: string; name: string }[];
    allowGrave: boolean;
    n: number;
  } | null>(null);

  const meta = room.meta!;
  const players = useMemo(
    () => Object.values(room.players).sort((a, b) => a.seat - b.seat),
    [room.players],
  );
  const mySeat = room.players[uid]?.seat ?? 0;

  // Order seats so the local player is first (bottom-left in the grid).
  const ordered = useMemo(() => {
    const others = players.filter((p) => p.uid !== uid);
    const me = players.find((p) => p.uid === uid);
    return me ? [me, ...others] : players;
  }, [players, uid]);

  const visibleSeats =
    focusedSeat === null
      ? ordered
      : ordered.filter((p) => p.seat === focusedSeat);

  async function startPeek(kind: "Scry" | "Surveil") {
    const n = Number(prompt(`${kind} how many?`, "1"));
    if (!n || n < 1) return;
    const top = await peekTop(code, uid, n);
    const resolved = await resolveNames(top.map((t) => t.name));
    putCards([...resolved.values()]);
    setScry({ title: `${kind} ${n}`, cards: top, allowGrave: kind === "Surveil", n });
  }

  function toggleZoom() {
    setFocusedSeat(focusedSeat === null ? mySeat : null);
  }

  function tapSelected() {
    if (!selectedCard) return;
    const card = room.zones[uid]?.battlefield?.[selectedCard];
    if (card) updateBattlefieldCard(code, uid, selectedCard, { tapped: !card.tapped });
  }

  function untapAll() {
    const bf = room.zones[uid]?.battlefield ?? {};
    for (const [id, c] of Object.entries(bf))
      if (c.tapped) updateBattlefieldCard(code, uid, id, { tapped: false });
  }

  useHotkeys(
    {
      u: untapAll,
      d: () => drawCards(code, uid, 1),
      t: tapSelected,
      " ": () => passTurn(code),
      m: () => {
        const n = Number(prompt("Mill how many?", "1"));
        if (n > 0) millCards(code, uid, n);
      },
      s: () => startPeek("Scry"),
      v: () => startPeek("Surveil"),
      f: toggleZoom,
      r: () => rollDie(code, uid, 20),
      "?": () => setShowHelp(true),
    },
    !showReset && !showHelp && !scry,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="topbar">
        <strong>Commander Table</strong>
        <span className="pill accent" style={{ letterSpacing: 2 }}>
          {code}
        </span>
        <TurnBar code={code} room={room} />
        <div className="spacer" />
        <button onClick={toggleZoom}>
          {focusedSeat === null ? "Focus my board" : "Fit all"}
        </button>
        <TokenTray code={code} uid={uid} tray={priv.tray} />
        <DiceWidget code={code} uid={uid} />
        <button onClick={() => setShowHelp(true)}>?</button>
        <button className="danger" onClick={() => setShowReset(true)}>
          Reset
        </button>
        <button onClick={() => setCode(null)}>Leave</button>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div
          className={"field" + (focusedSeat === null ? " fit-all" : "")}
          style={
            focusedSeat === null
              ? {
                  gridTemplateColumns:
                    visibleSeats.length > 1 ? "1fr 1fr" : "1fr",
                }
              : undefined
          }
        >
          {visibleSeats.map((p) => (
            <Seat
              key={p.uid}
              code={code}
              viewerUid={uid}
              room={room}
              seatUid={p.uid}
              active={p.seat === meta.turnSeat}
            />
          ))}
        </div>

        <div className="sidepanel">
          <LogChat code={code} uid={uid} name={name} room={room} />
        </div>
      </div>

      <div
        className="row"
        style={{
          gap: 12,
          padding: "8px 10px",
          borderTop: "1px solid var(--line)",
          background: "var(--panel)",
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <LifePanel code={code} uid={uid} room={room} />
        <div className="col" style={{ gap: 6 }}>
          <span className="muted">Library</span>
          <LibraryActions code={code} uid={uid} />
        </div>
      </div>

      <Hand code={code} uid={uid} hand={priv.hand} cardmap={priv.cardmap} />

      {showReset && <ResetDialog code={code} onClose={() => setShowReset(false)} />}
      {showHelp && <HotkeyHelp onClose={() => setShowHelp(false)} />}
      {scry && (
        <ScryModal
          title={scry.title}
          cards={scry.cards}
          allowGrave={scry.allowGrave}
          onApply={(keepTop, toBottom, toGrave) =>
            applyScry(code, uid, scry.n, keepTop, toBottom, toGrave)
          }
          onClose={() => setScry(null)}
        />
      )}
    </div>
  );
}
