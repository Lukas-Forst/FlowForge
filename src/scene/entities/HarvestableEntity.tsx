import type { ReactElement } from "react";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { HarvestableState } from "../../game/types";

interface HarvestableEntityProps {
  state: HarvestableState;
}

export function HarvestableEntity({ state }: HarvestableEntityProps): ReactElement {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.x = state.position.x;
      groupRef.current.position.z = state.position.y;
      
      const bounce = Math.sin(clock.elapsedTime * 2.0 + state.id) * 0.1;
      groupRef.current.position.y = bounce;
      
      groupRef.current.rotation.y = state.rotation + Math.sin(clock.elapsedTime * 0.5 + state.id) * 0.1;
      groupRef.current.rotation.z = Math.sin(clock.elapsedTime * 1.5 + state.id) * 0.05;
      groupRef.current.rotation.x = Math.cos(clock.elapsedTime * 1.2 + state.id) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {state.type === "scrap_raft" && (
        <group>
          {/* Wooden base */}
          <mesh position={[0, -0.2, 0]} receiveShadow castShadow>
            <boxGeometry args={[1.8, 0.2, 1.8]} />
            <meshStandardMaterial color="#5c4033" roughness={0.9} />
          </mesh>
          {/* Scrap crates / barrels */}
          <mesh position={[-0.3, 0.1, 0.2]} castShadow>
            <boxGeometry args={[0.6, 0.6, 0.6]} />
            <meshStandardMaterial color="#8b5a2b" roughness={0.8} />
          </mesh>
          <mesh position={[0.4, 0.2, -0.3]} castShadow>
            <cylinderGeometry args={[0.25, 0.25, 0.6]} />
            <meshStandardMaterial color="#708090" roughness={0.6} />
          </mesh>
        </group>
      )}

      {state.type === "abandoned_boat" && (
        <group>
          {/* Hull */}
          <mesh position={[0, -0.1, 0]} receiveShadow castShadow>
            <boxGeometry args={[2.5, 0.8, 4.0]} />
            <meshStandardMaterial color="#3a4a5a" roughness={0.7} />
          </mesh>
          {/* Cabin */}
          <mesh position={[0, 0.6, -0.5]} castShadow>
            <boxGeometry args={[1.5, 0.8, 1.5]} />
            <meshStandardMaterial color="#2c3e50" roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.4, -0.5]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.8]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
        </group>
      )}
      
      {/* Interaction helper (invisible) */}
      <mesh visible={false}>
        <cylinderGeometry args={[state.radius, state.radius, 2]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}
