import { useState } from "react";
import {
  drawCards,
  millCards,
  peekTop,
  applyScry,
  shuffleLibrary,
} from "../lib/actions";
import { resolveNames } from "../lib/scryfall";
import { useUI } from "../store";
import ScryModal from "./ScryModal";

export default function LibraryActions({
  code,
  uid,
}: {
  code: string;
  uid: string;
}) {
  const putCards = useUI((s) => s.putCards);
  const [scry, setScry] = useState<{
    title: string;
    cards: { id: string; name: string }[];
    allowGrave: boolean;
    n: number;
  } | null>(null);

  async function startPeek(kind: "Scry" | "Surveil") {
    const n = Number(prompt(`${kind} how many?`, "1"));
    if (!n || n < 1) return;
    const top = await peekTop(code, uid, n);
    // warm the image cache for these names
    const resolved = await resolveNames(top.map((t) => t.name));
    putCards([...resolved.values()]);
    setScry({ title: `${kind} ${n}`, cards: top, allowGrave: kind === "Surveil", n });
  }

  return (
    <div className="row" style={{ flexWrap: "wrap", gap: 4 }}>
      <button onClick={() => drawCards(code, uid, 1)}>Draw</button>
      <button
        onClick={() => {
          const n = Number(prompt("Mill how many?", "1"));
          if (n > 0) millCards(code, uid, n);
        }}
      >
        Mill
      </button>
      <button onClick={() => startPeek("Scry")}>Scry</button>
      <button onClick={() => startPeek("Surveil")}>Surveil</button>
      <button onClick={() => shuffleLibrary(code, uid)}>Shuffle</button>

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
