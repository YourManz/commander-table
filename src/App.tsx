import { useEffect, useState } from "react";
import { useUI } from "./store";
import { useRoom } from "./hooks/useRoom";
import { uidReady, firebaseConfigured } from "./lib/firebase";
import Home from "./screens/Home";
import Lobby from "./screens/Lobby";
import Table from "./screens/Table";

export default function App() {
  const code = useUI((s) => s.code);
  const [uid, setUid] = useState<string | null>(null);
  const room = useRoom(code);

  useEffect(() => {
    uidReady.then(setUid);
  }, []);

  if (!firebaseConfigured) {
    return (
      <div className="center-screen">
        <div className="center-box card-panel">
          <h1 className="title">Commander Table</h1>
          <p className="muted">
            Firebase is not configured. Copy <code>.env.example</code> to{" "}
            <code>.env.local</code>, paste your Firebase web config, and restart{" "}
            <code>npm run dev</code>.
          </p>
        </div>
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="center-screen">
        <div className="muted">Connecting…</div>
      </div>
    );
  }

  if (!code) return <Home />;
  if (!room.meta) {
    return (
      <div className="center-screen">
        <div className="muted">Loading room {code}…</div>
      </div>
    );
  }
  if (room.meta.status === "lobby")
    return <Lobby code={code} uid={uid} room={room} />;
  return <Table code={code} uid={uid} room={room} />;
}
