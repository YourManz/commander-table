export interface ParsedEntry {
  qty: number;
  name: string;
  commander: boolean;
}

export interface ParsedDeck {
  cards: ParsedEntry[];
  commanders: string[]; // names flagged as commander
}

// Parse a plain-text decklist. Supports:
//   "1 Sol Ring", "1x Sol Ring", "Sol Ring"
//   "// comment" and "# comment" lines, blank lines
//   "Commander:" header line, "*CMDR*" / "*Commander*" inline markers
//   set/collector suffixes like "(C21) 263" are stripped
//   "Sideboard"/"Maybeboard" section headers stop commander tagging but keep cards
const SET_SUFFIX = /\s+\([A-Za-z0-9]{2,6}\)(\s+[A-Za-z0-9-]+)?\s*$/;
const QTY = /^(\d+)\s*x?\s+(.*)$/i;

export function parseDecklist(text: string): ParsedDeck {
  const cards: ParsedEntry[] = [];
  const commanders: string[] = [];
  let commanderSection = false;

  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line) {
      commanderSection = false;
      continue;
    }
    if (line.startsWith("//") || line.startsWith("#")) continue;

    const lower = line.toLowerCase();
    if (lower.startsWith("commander")) {
      // "Commander:" header, or "Commander: Atraxa"
      const after = line.replace(/^commander\s*:?\s*/i, "");
      commanderSection = true;
      if (!after) continue;
      line = after;
    } else if (
      lower === "deck" ||
      lower === "mainboard" ||
      lower.startsWith("sideboard") ||
      lower.startsWith("maybeboard") ||
      lower.startsWith("companion")
    ) {
      commanderSection = false;
      continue;
    }

    let isCmd = commanderSection;
    if (/\*\s*(cmdr|commander)\s*\*/i.test(line)) {
      isCmd = true;
      line = line.replace(/\*\s*(cmdr|commander)\s*\*/i, "").trim();
    }

    line = line.replace(SET_SUFFIX, "").trim();
    const m = line.match(QTY);
    const qty = m ? parseInt(m[1], 10) : 1;
    const name = (m ? m[2] : line).trim();
    if (!name) continue;

    cards.push({ qty, name, commander: isCmd });
    if (isCmd) commanders.push(name);
  }

  return { cards, commanders };
}
