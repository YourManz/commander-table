import { HOTKEY_HELP } from "../hooks/useHotkeys";

export default function HotkeyHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 360 }} onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <strong style={{ flex: 1 }}>Hotkeys</strong>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="col" style={{ gap: 4 }}>
          {HOTKEY_HELP.map(([k, desc]) => (
            <div key={k} className="row">
              <span className="pill" style={{ minWidth: 48, justifyContent: "center" }}>
                {k}
              </span>
              <span style={{ flex: 1 }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
