import { useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useAsset } from "../../assets/registry";

type ForwardAxis = "positiveZ" | "negativeZ" | "positiveX" | "negativeX";
type ShipMaterialPreset = "playerSteamboat";
type SteamboatMaterialRole = "hull" | "cabin" | "stack" | "cannon" | "accent" | "window" | "metal";

export interface ShipModelConfig {
  assetId: string;
  targetLength: number;
  forwardAxis?: ForwardAxis;
  rotationOffsetY?: number;
  positionOffset?: [number, number, number];
  materialPreset?: ShipMaterialPreset;
}

interface ShipModelVisualProps {
  config: ShipModelConfig;
  fallback: ReactNode;
  eliteTint?: boolean;
}

const FORWARD_AXIS_ROTATION_Y: Record<ForwardAxis, number> = {
  positiveZ: 0,
  negativeZ: Math.PI,
  positiveX: Math.PI / 2,
  negativeX: -Math.PI / 2,
};

export const PLAYER_SHIP_MODEL_CONFIG: ShipModelConfig = {
  assetId: "playerShip",
  targetLength: 3.2,
  forwardAxis: "positiveZ",
  rotationOffsetY: Math.PI / 2,
  positionOffset: [0, 0.02, 0],
  materialPreset: "playerSteamboat",
};

const STEAMBOAT_MATERIAL_SETTINGS: Record<SteamboatMaterialRole, THREE.MeshStandardMaterialParameters> = {
  hull: { color: "#3f5d76", roughness: 0.62, metalness: 0.1 },
  cabin: { color: "#efe4cc", roughness: 0.58, metalness: 0.04 },
  stack: { color: "#b13f37", roughness: 0.55, metalness: 0.1 },
  cannon: { color: "#3d4854", roughness: 0.4, metalness: 0.62 },
  accent: { color: "#9f8350", roughness: 0.38, metalness: 0.64 },
  window: { color: "#8ea8bf", roughness: 0.24, metalness: 0.08 },
  metal: { color: "#697889", roughness: 0.42, metalness: 0.52 },
};

function createSteamboatMaterialPalette(): Record<SteamboatMaterialRole, THREE.MeshStandardMaterial> {
  return {
    hull: new THREE.MeshStandardMaterial(STEAMBOAT_MATERIAL_SETTINGS.hull),
    cabin: new THREE.MeshStandardMaterial(STEAMBOAT_MATERIAL_SETTINGS.cabin),
    stack: new THREE.MeshStandardMaterial(STEAMBOAT_MATERIAL_SETTINGS.stack),
    cannon: new THREE.MeshStandardMaterial(STEAMBOAT_MATERIAL_SETTINGS.cannon),
    accent: new THREE.MeshStandardMaterial(STEAMBOAT_MATERIAL_SETTINGS.accent),
    window: new THREE.MeshStandardMaterial(STEAMBOAT_MATERIAL_SETTINGS.window),
    metal: new THREE.MeshStandardMaterial(STEAMBOAT_MATERIAL_SETTINGS.metal),
  };
}

function chooseSteamboatMaterialRole(meshName: string, relativeHeight: number): SteamboatMaterialRole {
  if (/window|porthole|glass/.test(meshName)) return "window";
  if (/stack|smoke|chimney|funnel/.test(meshName)) return "stack";
  if (/cannon|gun|barrel/.test(meshName)) return "cannon";
  if (/trim|rail|ring|anchor|gold|brass|ornament/.test(meshName)) return "accent";
  if (/metal|pipe|chain|prop|wheel/.test(meshName)) return "metal";
  if (/hull|keel|base|bottom/.test(meshName)) return "hull";
  if (/cabin|deck|house|roof|bridge|top/.test(meshName)) return "cabin";
  return relativeHeight < 0.38 ? "hull" : "cabin";
}

function hasUsableTexture(material: THREE.Material): boolean {
  return material instanceof THREE.MeshStandardMaterial && material.map !== null;
}

function keepImportedMaterial(material: THREE.Material): void {
  if (material instanceof THREE.MeshStandardMaterial) {
    material.roughness = Math.max(0.18, Math.min(0.92, material.roughness * 0.94));
    material.metalness = Math.max(0, Math.min(0.72, material.metalness));
  }
  material.needsUpdate = true;
}

function applySteamboatMaterials(root: THREE.Group): void {
  const sceneBox = new THREE.Box3().setFromObject(root);
  const sceneHeight = Math.max(0.001, sceneBox.max.y - sceneBox.min.y);
  const palette = createSteamboatMaterialPalette();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const meshBox = new THREE.Box3().setFromObject(mesh);
    const meshCenter = meshBox.getCenter(new THREE.Vector3());
    const relativeHeight = (meshCenter.y - sceneBox.min.y) / sceneHeight;
    const meshName = `${mesh.name} ${(mesh.parent as THREE.Object3D | null)?.name ?? ""}`.toLowerCase();
    const role = chooseSteamboatMaterialRole(meshName, relativeHeight);
    const styledMaterial = palette[role];
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((material) => {
        if (hasUsableTexture(material)) {
          keepImportedMaterial(material);
          return material;
        }
        return styledMaterial;
      });
      return;
    }
    if (hasUsableTexture(mesh.material)) {
      keepImportedMaterial(mesh.material);
      return;
    }
    mesh.material = styledMaterial;
  });
}

function normalizeShipScene(inputScene: THREE.Group, targetLength: number, materialPreset?: ShipMaterialPreset): THREE.Group {
  const root = clone(inputScene) as THREE.Group;
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const safeLength = Math.max(0.0001, Math.max(size.x, size.z));
  const scalar = targetLength / safeLength;
  root.position.set(-center.x, -center.y, -center.z);
  root.scale.setScalar(scalar);
  const floorBox = new THREE.Box3().setFromObject(root);
  const floorCenter = floorBox.getCenter(new THREE.Vector3());
  root.position.x -= floorCenter.x;
  root.position.z -= floorCenter.z;
  root.position.y -= floorBox.min.y;

  if (materialPreset === "playerSteamboat") {
    applySteamboatMaterials(root);
  } else {
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => (m.needsUpdate = true));
      } else {
        mesh.material.needsUpdate = true;
      }
    });
  }
  return root;
}

function applyEliteShipTint(root: THREE.Group): void {
  const emissive = new THREE.Color(0.82, 0.65, 0.12);
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (Array.isArray(mesh.material)) {
      for (const mat of mesh.material) {
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.emissive = emissive;
          mat.emissiveIntensity = 0.42;
        }
      }
    } else if (mesh.material instanceof THREE.MeshStandardMaterial) {
      mesh.material.emissive = emissive;
      mesh.material.emissiveIntensity = 0.42;
    }
  });
}

export function ShipModelVisual({ config, fallback, eliteTint = false }: ShipModelVisualProps): ReactElement {
  const scene = useAsset(config.assetId);

  const normalized = useMemo(() => {
    if (!scene) return null;
    return normalizeShipScene(scene, config.targetLength, config.materialPreset);
  }, [config.materialPreset, config.targetLength, scene]);

  const withElite = useMemo(() => {
    if (!normalized) return null;
    if (!eliteTint) return normalized;
    const root = clone(normalized) as THREE.Group;
    applyEliteShipTint(root);
    return root;
  }, [eliteTint, normalized]);

  if (!withElite) return <>{fallback}</>;

  const forwardAxis = config.forwardAxis ?? "positiveZ";
  const rotationY = FORWARD_AXIS_ROTATION_Y[forwardAxis] + (config.rotationOffsetY ?? 0);
  const offset = config.positionOffset ?? [0, 0, 0];

  return (
    <group position={offset} rotation={[0, rotationY, 0]}>
      <primitive object={withElite} />
    </group>
  );
}
