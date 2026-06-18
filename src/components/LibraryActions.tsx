import { useState } from "react";
import {
  drawCards,
  millCards,
  peekTop,
  applyScry,
  shuffleLibrary,
  mulligan,
} from "../lib/actions";
import { resolveNames } from "../lib/scryfall";
import { useUI } from "../store";
import ScryModal from "./ScryModal";
import CountButton from "./CountButton";

export default function LibraryActions({
  code,
  uid,
  allowMulligan,
}: {
  code: string;
  uid: string;
  allowMulligan: boolean;
}) {
  const putCards = useUI((s) => s.putCards);
  const [scry, setScry] = useState<{
    title: string;
    cards: { id: string; name: string }[];
    allowGrave: boolean;
    n: number;
  } | null>(null);

  async function startPeek(kind: "Scry" | "Surveil", n: number) {
    if (!n || n < 1) return;
    const top = await peekTop(code, uid, n);
    const resolved = await resolveNames(top.map((t) => t.name));
    putCards([...resolved.values()]);
    setScry({ title: `${kind} ${n}`, cards: top, allowGrave: kind === "Surveil", n });
  }

  return (
    <div className="row" style={{ flexWrap: "wrap", gap: 4 }}>
      {allowMulligan && (
        <button className="primary" onClick={() => mulligan(code, uid, 7)}>
          Opening hand / Mulligan
        </button>
      )}
      <CountButton label="Draw" onApply={(n) => drawCards(code, uid, n)} />
      <CountButton label="Mill" onApply={(n) => millCards(code, uid, n)} />
      <CountButton label="Scry" onApply={(n) => startPeek("Scry", n)} />
      <CountButton label="Surveil" onApply={(n) => startPeek("Surveil", n)} />
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
