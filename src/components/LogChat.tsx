import { useEffect, useRef, useState } from "react";
import type { RoomSnapshot } from "../lib/types";
import { sendChat } from "../lib/actions";

export default function LogChat({
  code,
  uid,
  name,
  room,
}: {
  code: string;
  uid: string;
  name: string;
  room: RoomSnapshot;
}) {
  const [msg, setMsg] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // merge log + chat into one stream
  const stream = [
    ...room.log.map((l) => ({ ...l, kind: "log" as const })),
    ...room.chat.map((c) => ({ ...c, kind: "chat" as const })),
  ].sort((a, b) => a.ts - b.ts);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [stream.length]);

  function nameFor(playerUid: string) {
    return room.players[playerUid]?.name ?? "?";
  }

  return (
    <>
      <div className="log">
        {stream.map((e, i) =>
          e.kind === "chat" ? (
            <div key={i}>
              <strong>{(e as { name: string }).name}:</strong> {e.text}
            </div>
          ) : (
            <div key={i} className="muted">
              {nameFor(e.uid)} {e.text}
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>
      <div className="chatbar">
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && msg.trim()) {
              sendChat(code, uid, name, msg.trim());
              setMsg("");
            }
          }}
          placeholder="Chat…"
        />
      </div>
    </>
  );
}
