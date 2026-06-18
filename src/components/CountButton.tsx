import { useState } from "react";

// A button that applies an action with a count. Hovering reveals a small number
// field; type a value and press Enter (or click the button) to apply that many.
export default function CountButton({
  label,
  onApply,
  def = 1,
  primary = false,
}: {
  label: string;
  onApply: (n: number) => void;
  def?: number;
  primary?: boolean;
}) {
  const [n, setN] = useState(def);
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button className={primary ? "primary" : ""} onClick={() => onApply(n)}>
        {label}
        {n > 1 ? ` ${n}` : ""}
      </button>
      {hover && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 4px)",
            left: 0,
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            padding: 6,
            zIndex: 120,
            display: "flex",
            gap: 4,
            alignItems: "center",
            boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
          }}
        >
          <span className="muted" style={{ whiteSpace: "nowrap", fontSize: 11 }}>
            how many
          </span>
          <input
            type="number"
            min={1}
            value={n}
            onChange={(e) => setN(Math.max(1, Number(e.target.value) || 1))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onApply(n);
                setHover(false);
              }
            }}
            style={{ width: 56, padding: "4px 6px" }}
          />
        </div>
      )}
    </div>
  );
}
