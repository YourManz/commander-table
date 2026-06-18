// Deterministic per-seat colors so each player has a consistent identity.
const SEAT_COLORS = [
  "#6ea8fe", // blue
  "#f0a35e", // orange
  "#6ee7a8", // green
  "#d98fe0", // purple
];

export function seatColor(seat: number): string {
  return SEAT_COLORS[seat % SEAT_COLORS.length];
}
