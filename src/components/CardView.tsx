import { useUI } from "../store";
import { useCards } from "../hooks/useCards";

// Render a single card face by scryfallId. Falls back to a name placeholder
// until the Scryfall image resolves. `back` shows the reverse face of a DFC.
export default function CardView({
  scryfallId,
  name,
  back = false,
  faceDown = false,
}: {
  scryfallId?: string;
  name?: string;
  back?: boolean;
  faceDown?: boolean;
}) {
  useCards(scryfallId ? [scryfallId] : []);
  const card = useUI((s) => (scryfallId ? s.cardCache[scryfallId] : undefined));
  const setPreview = useUI((s) => s.setPreview);

  if (faceDown) {
    return (
      <div className="mtg-card" style={{ width: "100%", height: "100%" }}>
        <div
          className="ph"
          style={{ alignItems: "center", justifyContent: "center" }}
        >
          🂠
        </div>
      </div>
    );
  }

  const img = back ? card?.backImage ?? card?.image : card?.image;
  const hover = scryfallId
    ? {
        onMouseEnter: () => setPreview({ scryfallId, back }),
        onMouseLeave: () => setPreview(null),
      }
    : {};
  return (
    <div className="mtg-card" style={{ width: "100%", height: "100%" }} {...hover}>
      {img ? (
        <img src={img} alt={card?.name ?? name ?? ""} loading="lazy" />
      ) : (
        <div className="ph">{card?.name ?? name ?? "…"}</div>
      )}
    </div>
  );
}
