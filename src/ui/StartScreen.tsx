import type { ReactElement } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { PlayerShip } from "../scene/entities/PlayerShip";

interface StartScreenProps {
  onStart: () => void;
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

export function StartScreen({ onStart }: StartScreenProps): ReactElement {
  const bestScore = Number(localStorage.getItem("flowforge.best") || 0);

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
        <button type="button" onClick={onStart} style={{ marginTop: 8, padding: "12px 32px", fontSize: "1.2rem" }}>
          Start Run
        </button>
      </div>
    </div>
  );
}
