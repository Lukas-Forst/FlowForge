import { useFrame } from "@react-three/fiber";
import type { ReactElement } from "react";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type Vec3Tuple = [number, number, number];

interface ShipSmokeProps {
  stackPositions: Vec3Tuple[];
  intensity?: number;
}

interface PuffState {
  progress: number;
  speed: number;
  driftX: number;
  driftZ: number;
  sway: number;
  phase: number;
  size: number;
}

const PUFFS_PER_STACK = 6;
const BASE_RISE_HEIGHT = 1.5;

function makePuffState(seed: number): PuffState {
  const random = (offset: number): number => {
    const value = Math.sin(seed * 73.11 + offset * 37.7) * 43758.5453;
    return value - Math.floor(value);
  };

  return {
    progress: random(1),
    speed: 0.38 + random(2) * 0.45,
    driftX: (random(3) - 0.5) * 0.22,
    driftZ: (random(4) - 0.5) * 0.22,
    sway: 0.08 + random(5) * 0.12,
    phase: random(6) * Math.PI * 2,
    size: 0.12 + random(7) * 0.13,
  };
}

export function ShipSmoke({ stackPositions, intensity = 1 }: ShipSmokeProps): ReactElement | null {
  const puffRefs = useRef<Array<THREE.Mesh | null>>([]);
  const puffStates = useMemo(() => {
    const states: PuffState[] = [];
    const puffCount = stackPositions.length * PUFFS_PER_STACK;
    for (let index = 0; index < puffCount; index += 1) {
      states.push(makePuffState(index + 1));
    }
    return states;
  }, [stackPositions.length]);

  const clampedIntensity = Math.max(0.35, Math.min(2.4, intensity));
  const riseHeight = BASE_RISE_HEIGHT * (0.85 + clampedIntensity * 0.35);
  const puffCount = stackPositions.length * PUFFS_PER_STACK;

  useFrame((state, delta) => {
    for (let index = 0; index < puffCount; index += 1) {
      const puff = puffRefs.current[index];
      if (!puff) {
        continue;
      }

      const stackIndex = Math.floor(index / PUFFS_PER_STACK);
      const stack = stackPositions[stackIndex];
      if (!stack) {
        continue;
      }

      const puffState = puffStates[index];
      puffState.progress = (puffState.progress + delta * puffState.speed * (0.8 + clampedIntensity * 0.3)) % 1;

      const age = puffState.progress;
      const y = stack[1] + age * riseHeight;
      const sway = Math.sin(state.clock.elapsedTime * 1.25 + puffState.phase) * puffState.sway * age;

      puff.position.set(
        stack[0] + puffState.driftX * age + sway,
        y,
        stack[2] + puffState.driftZ * age + Math.cos(puffState.phase + age * 5) * 0.03,
      );

      const scale = puffState.size * (0.7 + age * 2.2);
      puff.scale.setScalar(scale);

      const material = puff.material as THREE.MeshBasicMaterial;
      material.opacity = Math.max(0, 0.34 * (1 - age) * (0.85 + clampedIntensity * 0.1));
    }
  });

  if (stackPositions.length === 0) {
    return null;
  }

  return (
    <group>
      {Array.from({ length: puffCount }, (_, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            puffRefs.current[index] = mesh;
          }}
          frustumCulled={false}
        >
          <sphereGeometry args={[0.2, 6, 6]} />
          <meshBasicMaterial color="#d2d8df" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
