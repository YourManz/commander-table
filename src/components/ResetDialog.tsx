import { resetGame } from "../lib/actions";

export default function ResetDialog({
  code,
  onClose,
}: {
  code: string;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 380 }} onClick={(e) => e.stopPropagation()}>
        <strong>Reset game?</strong>
        <p className="muted" style={{ margin: 0 }}>
          This resets the table for <em>all players</em>: clears every board,
          graveyard, exile, and hand, returns everyone to the lobby, and requires
          re-importing decks. This cannot be undone.
        </p>
        <div className="row">
          <button
            className="danger"
            onClick={() => {
              resetGame(code);
              onClose();
            }}
          >
            Reset for everyone
          </button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
