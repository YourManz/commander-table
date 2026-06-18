import { useEffect } from "react";
import { resolveIds } from "../lib/scryfall";
import { useUI } from "../store";

// Ensure the given scryfallIds are resolved into the in-memory card cache.
export function useCards(scryfallIds: string[]) {
  const cardCache = useUI((s) => s.cardCache);
  const putCards = useUI((s) => s.putCards);

  useEffect(() => {
    const missing = scryfallIds.filter((id) => id && !cardCache[id]);
    if (!missing.length) return;
    let cancelled = false;
    resolveIds(missing).then((map) => {
      if (cancelled) return;
      const cards = [...map.values()];
      if (cards.length) putCards(cards);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scryfallIds.join(",")]);

  return cardCache;
}
