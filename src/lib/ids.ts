const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

export function genRoomCode(): string {
  let s = "";
  for (let i = 0; i < 4; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

let counter = 0;
export function genInstanceId(): string {
  counter += 1;
  return `c${Date.now().toString(36)}${counter.toString(36)}${Math.floor(
    Math.random() * 1296,
  ).toString(36)}`;
}
