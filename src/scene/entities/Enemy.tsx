import type { ReactElement } from "react";
import type { ThreeElements } from "@react-three/fiber";
import type { EnemyType } from "../../game/types";

type EnemyShipProps = ThreeElements["group"] & {
  type: EnemyType;
};

export function EnemyShip({ type, ...props }: EnemyShipProps): ReactElement {
  const palette =
    type === "corsair"
      ? { hull: "#4d251e", sail: "#8b5a2b", detail: "#f1d6a6" }
      : type === "bomber"
        ? { hull: "#4a1f1a", sail: "#b44b2c", detail: "#ffe4c8" }
        : { hull: "#2f1412", sail: "#7a3a2a", detail: "#d8b07a" };

  const bodySize: [number, number, number] =
    type === "brute" ? [1.6, 0.55, 2.25] : type === "bomber" ? [1.25, 0.45, 2.1] : [1.35, 0.42, 2.0];
  const sailSize: [number, number, number] = type === "bomber" ? [0.95, 0.32, 0.95] : [0.75, 0.35, 0.9];
  const towerHeight = type === "bomber" ? 1.35 : type === "brute" ? 1.05 : 1.1;

  return (
    <group {...props}>
      {/* Hull */}
      <mesh castShadow position={[0, 0.3, 0]}>
        <boxGeometry args={bodySize} />
        <meshStandardMaterial color={palette.hull} roughness={0.85} />
      </mesh>

      {/* Superstructure / sail */}
      <mesh castShadow position={[0, 0.82, type === "corsair" ? -0.05 : -0.02]}>
        <boxGeometry args={sailSize} />
        <meshStandardMaterial color={palette.sail} roughness={0.75} />
      </mesh>

      {/* Main tower */}
      <mesh castShadow position={[0, towerHeight + 0.05, 0]}>
        <cylinderGeometry args={[0.06, 0.09, towerHeight, 10]} />
        <meshStandardMaterial color="#1e1716" />
      </mesh>

      {/* Distinct features per type */}
      {type === "bomber" ? (
        <group position={[0, towerHeight + 0.35, 0]}>
          <mesh castShadow position={[0, 0, 0.08]}>
            <boxGeometry args={[0.36, 0.16, 0.6]} />
            <meshStandardMaterial color={palette.detail} roughness={0.4} />
          </mesh>
          <mesh castShadow position={[-0.25, 0, 0.12]}>
            <cylinderGeometry args={[0.05, 0.06, 0.33, 10]} />
            <meshStandardMaterial color="#2b1f1a" />
          </mesh>
          <mesh castShadow position={[0.25, 0, 0.12]}>
            <cylinderGeometry args={[0.05, 0.06, 0.33, 10]} />
            <meshStandardMaterial color="#2b1f1a" />
          </mesh>
        </group>
      ) : type === "brute" ? (
        <mesh castShadow position={[0, towerHeight + 0.25, 0.1]}>
          <boxGeometry args={[0.14, 0.85, 0.85]} />
          <meshStandardMaterial color={palette.detail} roughness={0.6} />
        </mesh>
      ) : (
        <>
          <mesh castShadow position={[0, towerHeight + 0.2, 0.1]}>
            <boxGeometry args={[0.05, 0.75, 0.7]} />
            <meshStandardMaterial color={palette.detail} />
          </mesh>
          <mesh castShadow position={[0.25, 0.72, 0.2]}>
            <boxGeometry args={[0.12, 1.02, 0.2]} />
            <meshStandardMaterial color={palette.detail} roughness={0.4} />
          </mesh>
        </>
      )}
    </group>
  );
}
