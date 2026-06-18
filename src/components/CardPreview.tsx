import { useUI } from "../store";

// Large floating preview of the currently hovered card, pinned to the right.
export default function CardPreview() {
  const preview = useUI((s) => s.preview);
  const card = useUI((s) =>
    preview ? s.cardCache[preview.scryfallId] : undefined,
  );
  if (!preview || !card) return null;
  const img = preview.back ? card.backImage ?? card.image : card.image;
  if (!img) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        top: "50%",
        transform: "translateY(-50%)",
        width: 280,
        zIndex: 200,
        pointerEvents: "none",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
      }}
    >
      <img src={img} alt={card.name} style={{ width: "100%", display: "block" }} />
    </div>
  );
}
