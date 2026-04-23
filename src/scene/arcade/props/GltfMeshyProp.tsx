import type { ReactElement, ReactNode } from "react";
import { useMemo } from "react";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useAsset } from "../../../assets/registry";

function normalizeProp(scene: THREE.Group, scale: number): THREE.Group {
  const root = clone(scene) as THREE.Group;
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const targetSize = 2.0 * scale;
  const scalar = targetSize / maxDim;
  root.scale.setScalar(scalar);
  root.position.set(-center.x * scalar, -box.min.y * scalar, -center.z * scalar);
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
  return root;
}

export function GltfMeshyProp({
  assetId,
  scale = 1,
  yOff = 0,
  children,
}: {
  assetId: string;
  scale?: number;
  yOff?: number;
  children: ReactNode;
}): ReactElement {
  const scene = useAsset(assetId);
  const normalized = useMemo(() => (scene ? normalizeProp(scene, scale) : null), [scene, scale]);
  if (!normalized) return <>{children}</>;
  return (
    <group position={[0, yOff, 0]}>
      <primitive object={normalized} />
    </group>
  );
}
