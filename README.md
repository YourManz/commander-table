# Commander Table

A multiplayer Magic: The Gathering virtual tabletop. Share a 4-character game
code, import decklists (paste / Moxfield / Archidekt), and play 1–4 player games
with a command zone. Partial automation (auto untap/draw, life, commander
damage, monarch, mana, mill/scry/surveil, tokens, dice) — no rules enforcement.

Static React + Vite app, Firebase Realtime Database for sync, Scryfall for card
data. Designed to deploy on GitHub Pages.

## Connect it to your Firebase project

You already created the Firebase project. Wire it up:

### 1. Enable the two services (Firebase console)

- **Build → Realtime Database → Create database** (any region; start in *locked
  mode* — we install rules below).
- **Build → Authentication → Get started → Sign-in method → Anonymous → Enable.**

### 2. Install the security rules

In **Realtime Database → Rules**, paste the contents of
[`database.rules.json`](./database.rules.json) and **Publish**. These make the
public room readable by any signed-in player while keeping each player's hand and
library readable only by their own account.

### 3. Add your web app config

In **Project settings → General → Your apps**, add a **Web app** (`</>`) if you
haven't, then copy the config values.

```bash
cd ~/Work/commander-table
cp .env.example .env.local
```

Edit `.env.local` and fill in (values are NOT secret — they're protected by the
rules):

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_APP_ID=1:1234567890:web:abc123
```

### 4. Run it

```bash
npm install
npm run dev
```

Open the printed URL, **Create game**, share the 4-letter code, and have a friend
**Join** from another browser/tab/device.

## Deploy to GitHub Pages

1. Create the repo `commander-table` under your GitHub account and push.
2. In **Settings → Pages**, set **Source: GitHub Actions**.
3. In **Settings → Secrets and variables → Actions → Variables**, add the same
   five `VITE_FIREBASE_*` keys as **repository variables** (so the build can read
   them).
4. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and
   publishes to Pages at `https://<you>.github.io/commander-table/`.
5. In Firebase **Authentication → Settings → Authorized domains**, add
   `<you>.github.io`.

> If the repo name isn't `commander-table`, set `VITE_BASE=/<repo>/` for the
> build (edit `vite.config.ts` or pass the env var).

## How hidden information works

`rooms/{code}` is public to everyone signed in (battlefield, graveyard, exile,
command zone, life, counts, log). Each player's hand and library live under
`private/{code}/{uid}` and the security rules only let that `uid` read them —
opponents see card backs and counts, enforced by the database, not the honor
system.
