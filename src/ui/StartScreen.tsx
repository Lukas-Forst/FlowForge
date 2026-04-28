import type { ReactElement } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { PlayerShip } from "../scene/entities/PlayerShip";

interface StartScreenProps {
  onPlaySolo: () => void;
  onCreateLobby: (name: string) => void;
  onJoinLobby: (roomCode: string, name: string) => void;
  connectionStatus?: string | null;
}

function Spinner(): ReactElement {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.4;
  });
  return (
    <group ref={ref}>
      <PlayerShip rotation={[0, 0, 0]} position={[0, -0.5, 0]} upgradeLevel={3} />
    </group>
  );
}

function randomCaptainName(): string {
  const names = ["Captain Rust", "Captain Tide", "Captain Ember", "Captain Wave", "Captain Finch", "Captain Bloom"];
  return names[Math.floor(Math.random() * names.length)] ?? "Captain";
}

export function StartScreen({ onPlaySolo, onCreateLobby, onJoinLobby, connectionStatus }: StartScreenProps): ReactElement {
  const bestScore = Number(localStorage.getItem("flowforge.best") || 0);
  const [name, setName] = useState(randomCaptainName());
  const [roomCode, setRoomCode] = useState("");

  return (
    <div className="overlay center">
      <div className="panel" style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 400 }}>
        <h1>FlowForge</h1>
        <p>Sail the storm. Sink raiders. Upgrade your ship.</p>

        <div style={{ width: 300, height: 260, cursor: "grab" }}>
          <Canvas camera={{ position: [0, 2, 4], fov: 45 }}>
            <ambientLight intensity={1.2} />
            <directionalLight position={[5, 10, 5]} intensity={1.5} />
            <Spinner />
          </Canvas>
        </div>

        <div style={{ margin: "16px 0", background: "rgba(0,0,0,0.15)", padding: "8px 24px", borderRadius: "16px" }}>
          <p style={{ margin: 0, fontWeight: "bold" }}>Best Score: {bestScore}</p>
        </div>

        <p className="hint">Move with WASD. Fire cannon salvo with Q. Boost forward with Space.</p>
<<<<<<< HEAD
        <p className="hint" style={{ marginTop: 4 }}>
          Press ? or F1 anytime for the full control list and tips.
        </p>
=======
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
        <div style={{ width: "100%", marginTop: 10, display: "grid", gap: 8 }}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Captain name"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(160, 209, 236, 0.35)",
              background: "rgba(10, 30, 48, 0.8)",
              color: "#e9f5ff",
            }}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={onPlaySolo} style={{ padding: "11px 20px" }}>
              Play Solo
            </button>
            <button type="button" onClick={() => onCreateLobby(name.trim() || "Captain")} style={{ padding: "11px 20px" }}>
              Create Lobby
            </button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
              placeholder="Lobby code"
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(160, 209, 236, 0.35)",
                background: "rgba(10, 30, 48, 0.8)",
                color: "#e9f5ff",
                textTransform: "uppercase",
              }}
            />
            <button type="button" onClick={() => onJoinLobby(roomCode.trim(), name.trim() || "Captain")}>
              Join Lobby
            </button>
          </div>
          {connectionStatus ? <p className="hint" style={{ margin: 0 }}>{connectionStatus}</p> : null}
        </div>
      </div>
    </div>
  );
}
