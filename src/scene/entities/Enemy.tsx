import type { ReactElement } from "react";
import type { ThreeElements } from "@react-three/fiber";
import type { EnemyType } from "../../game/types";

type EnemyShipProps = ThreeElements["group"] & {
  type: EnemyType;
};

function CorsairMesh(): ReactElement {
  return (
    <>
      <mesh castShadow position={[0, 0.25, 0]}>
        <boxGeometry args={[1.1, 0.38, 2.1]} />
        <meshStandardMaterial color="#4d251e" roughness={0.82} />
      </mesh>
      <mesh castShadow position={[0, 0.65, -0.1]}>
        <boxGeometry args={[0.85, 0.42, 1]} />
        <meshStandardMaterial color="#6b3620" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 0.88, 0]}>
        <cylinderGeometry args={[0.14, 0.18, 0.22, 8]} />
        <meshStandardMaterial color="#1e1716" />
      </mesh>
      <mesh castShadow position={[0, 1.55, 0]}>
        <cylinderGeometry args={[0.1, 0.13, 1.1, 8]} />
        <meshStandardMaterial color="#1e1716" />
      </mesh>
      <mesh castShadow position={[-0.72, 0.28, 0]}>
        <boxGeometry args={[0.22, 0.42, 0.85]} />
        <meshStandardMaterial color="#3d1c14" roughness={0.82} />
      </mesh>
      <mesh castShadow position={[0.72, 0.28, 0]}>
        <boxGeometry args={[0.22, 0.42, 0.85]} />
        <meshStandardMaterial color="#3d1c14" roughness={0.82} />
      </mesh>
    </>
  );
}

function BomberMesh(): ReactElement {
  return (
    <>
      <mesh castShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[1.6, 0.52, 2.3]} />
        <meshStandardMaterial color="#4a1f1a" roughness={0.82} />
      </mesh>
      <mesh castShadow position={[0, 0.82, -0.1]}>
        <boxGeometry args={[1.2, 0.5, 1.4]} />
        <meshStandardMaterial color="#632a24" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[-0.32, 1.1, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 0.28, 8]} />
        <meshStandardMaterial color="#1e1716" />
      </mesh>
      <mesh castShadow position={[-0.32, 1.85, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 1.3, 8]} />
        <meshStandardMaterial color="#1e1716" />
      </mesh>
      <mesh castShadow position={[0.32, 1.1, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 0.28, 8]} />
        <meshStandardMaterial color="#1e1716" />
      </mesh>
      <mesh castShadow position={[0.32, 1.85, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 1.3, 8]} />
        <meshStandardMaterial color="#1e1716" />
      </mesh>
      <mesh castShadow position={[-1, 0.32, 0.05]}>
        <boxGeometry args={[0.35, 0.55, 1.2]} />
        <meshStandardMaterial color="#3a1810" roughness={0.82} />
      </mesh>
      <mesh castShadow position={[1, 0.32, 0.05]}>
        <boxGeometry args={[0.35, 0.55, 1.2]} />
        <meshStandardMaterial color="#3a1810" roughness={0.82} />
      </mesh>
      <mesh castShadow position={[-0.28, 0.32, 0.9]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
        <meshStandardMaterial color="#221f1f" />
      </mesh>
      <mesh castShadow position={[0.28, 0.32, 0.9]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
        <meshStandardMaterial color="#221f1f" />
      </mesh>
    </>
  );
}

function BruteMesh(): ReactElement {
  return (
    <>
      <mesh castShadow position={[0, 0.35, 0]}>
        <boxGeometry args={[1.75, 0.6, 2.5]} />
        <meshStandardMaterial color="#2f1412" roughness={0.84} />
      </mesh>
      <mesh castShadow position={[0, 0.68, 0]}>
        <boxGeometry args={[1.6, 0.14, 2.2]} />
        <meshStandardMaterial color="#3d2018" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 0.9, 0]}>
        <boxGeometry args={[1.3, 0.55, 1.5]} />
        <meshStandardMaterial color="#4a2218" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 1.18, 0]}>
        <cylinderGeometry args={[0.3, 0.36, 0.35, 8]} />
        <meshStandardMaterial color="#1e1716" />
      </mesh>
      <mesh castShadow position={[0, 2.05, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 1.6, 8]} />
        <meshStandardMaterial color="#1e1716" />
      </mesh>
      <mesh castShadow position={[-1.12, 0.38, 0.05]}>
        <boxGeometry args={[0.42, 0.62, 1.35]} />
        <meshStandardMaterial color="#281010" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[1.12, 0.38, 0.05]}>
        <boxGeometry args={[0.42, 0.62, 1.35]} />
        <meshStandardMaterial color="#281010" roughness={0.85} />
      </mesh>
    </>
  );
}

export function EnemyShip({ type, ...props }: EnemyShipProps): ReactElement {
  let variant: ReactElement = <CorsairMesh />;
  if (type === "bomber") {
    variant = <BomberMesh />;
  }
  if (type === "brute") {
    variant = <BruteMesh />;
  }

  return (
    <group {...props}>
      {variant}
    </group>
  );
}
