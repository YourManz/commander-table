import { useEffect, useRef } from "react";

export interface MenuItem {
  label: string;
  fn: () => void;
  disabled?: boolean;
}

// A small popover menu anchored at a screen position.
export default function Menu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: Math.min(x, window.innerWidth - 180),
        top: Math.min(y, window.innerHeight - items.length * 30 - 10),
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        zIndex: 100,
        minWidth: 160,
        padding: 4,
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
      }}
    >
      {items.map((it, i) => (
        <button
          key={i}
          disabled={it.disabled}
          onClick={() => {
            it.fn();
            onClose();
          }}
          style={{
            border: "none",
            background: "transparent",
            textAlign: "left",
            padding: "6px 8px",
          }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
