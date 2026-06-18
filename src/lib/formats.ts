import type { FormatPreset } from "./types";

// Basic format selector presets. Adding a format here is a data change only.
export const FORMATS: FormatPreset[] = [
  {
    id: "commander",
    name: "Commander",
    life: 40,
    seats: 4,
    commander: true,
  },
  {
    id: "commander-1v1",
    name: "Commander 1v1",
    life: 30,
    seats: 2,
    commander: true,
  },
  {
    id: "constructed",
    name: "Constructed (60-card)",
    life: 20,
    seats: 2,
    commander: false,
  },
  {
    id: "ffa",
    name: "Multiplayer free-for-all",
    life: 20,
    seats: 4,
    commander: false,
  },
  {
    id: "custom",
    name: "Custom",
    life: 40,
    seats: 4,
    commander: true,
    custom: true,
  },
];

export function getFormat(id: string): FormatPreset {
  return FORMATS.find((f) => f.id === id) ?? FORMATS[0];
}
