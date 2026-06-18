import { rollDie, flipCoin } from "../lib/actions";

export default function DiceWidget({ code, uid }: { code: string; uid: string }) {
  return (
    <div className="row" style={{ gap: 4 }}>
      <button onClick={() => rollDie(code, uid, 6)}>d6</button>
      <button onClick={() => rollDie(code, uid, 20)}>d20</button>
      <button onClick={() => flipCoin(code, uid)}>coin</button>
    </div>
  );
}
