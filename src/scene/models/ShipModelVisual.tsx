import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type ForwardAxis = "positiveZ" | "negativeZ" | "positiveX" | "negativeX";
type ShipMaterialPreset = "playerSteamboat";
type SteamboatMaterialRole = "hull" | "cabin" | "stack" | "cannon" | "accent" | "window" | "metal";

export interface ShipModelConfig {
  path?: string;
  candidatePaths?: string[];
  targetLength: number;
  forwardAxis?: ForwardAxis;
  rotationOffsetY?: number;
  positionOffset?: [number, number, number];
  materialPreset?: ShipMaterialPreset;
}

interface ShipModelVisualProps {
  config: ShipModelConfig;
  fallback: ReactNode;
}

type ShipAssetState = {
  status: "loading" | "ready" | "error";
  scene: THREE.Group | null;
  resolvedPath: string | null;
};

const loadedScenes = new Map<string, THREE.Group>();
const failedPaths = new Set<string>();

const FORWARD_AXIS_ROTATION_Y: Record<ForwardAxis, number> = {
  positiveZ: 0,
  negativeZ: Math.PI,
  positiveX: Math.PI / 2,
  negativeX: -Math.PI / 2,
};

export const PLAYER_SHIP_MODEL_CONFIG: ShipModelConfig = {
  candidatePaths: [
    "/assets/models/ships/Main_ship.glb",
    "/assets/models/ships/player-steamboat.glb",
    "/assets/models/ships/Meshy_AI_Steamboat_0417102926_generate.glb",
  ],
  targetLength: 3.2,
  forwardAxis: "positiveZ",
  // Align mesh forward with gameplay facing (90-degree correction).
  rotationOffsetY: Math.PI / 2,
  positionOffset: [0, 0.02, 0],
  materialPreset: "playerSteamboat",
};

const STEAMBOAT_MATERIAL_SETTINGS: Record<SteamboatMaterialRole, THREE.MeshStandardMaterialParameters> = {
  hull: { color: "#202d42", roughness: 0.7, metalness: 0.12 },
  cabin: { color: "#efe4cc", roughness: 0.58, metalness: 0.04 },
  stack: { color: "#b13f37", roughness: 0.55, metalness: 0.1 },
  cannon: { color: "#232629", roughness: 0.42, metalness: 0.72 },
  accent: { color: "#9f8350", roughness: 0.38, metalness: 0.64 },
  window: { color: "#8ea8bf", roughness: 0.24, metalness: 0.08 },
  metal: { color: "#4d5258", roughness: 0.45, metalness: 0.58 },
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
  if (/window|porthole|glass/.test(meshName)) {
    return "window";
  }
  if (/stack|smoke|chimney|funnel/.test(meshName)) {
    return "stack";
  }
  if (/cannon|gun|barrel/.test(meshName)) {
    return "cannon";
  }
  if (/trim|rail|ring|anchor|gold|brass|ornament/.test(meshName)) {
    return "accent";
  }
  if (/metal|pipe|chain|prop|wheel/.test(meshName)) {
    return "metal";
  }
  if (/hull|keel|base|bottom/.test(meshName)) {
    return "hull";
  }
  if (/cabin|deck|house|roof|bridge|top/.test(meshName)) {
    return "cabin";
  }

  // Fallback heuristic if mesh names are ambiguous. Blender-side mesh naming would improve this.
  return relativeHeight < 0.38 ? "hull" : "cabin";
}

function applySteamboatMaterials(root: THREE.Group): void {
  const sceneBox = new THREE.Box3().setFromObject(root);
  const sceneHeight = Math.max(0.001, sceneBox.max.y - sceneBox.min.y);
  const palette = createSteamboatMaterialPalette();
  let matchedByName = 0;

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const meshBox = new THREE.Box3().setFromObject(mesh);
    const meshCenter = meshBox.getCenter(new THREE.Vector3());
    const relativeHeight = (meshCenter.y - sceneBox.min.y) / sceneHeight;
    const meshName = `${mesh.name} ${(mesh.parent as THREE.Object3D | null)?.name ?? ""}`.toLowerCase();
    if (/window|porthole|glass|stack|smoke|chimney|funnel|cannon|gun|barrel|trim|rail|ring|anchor|gold|brass|ornament|metal|pipe|chain|prop|wheel|hull|keel|base|bottom|cabin|deck|house|roof|bridge|top/.test(meshName)) {
      matchedByName += 1;
    }
    const role = chooseSteamboatMaterialRole(meshName, relativeHeight);
    const styledMaterial = palette[role];
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map(() => styledMaterial);
      return;
    }
    mesh.material = styledMaterial;
  });

  if (import.meta.env.DEV && matchedByName === 0) {
    console.warn(
      "[ShipModelVisual] Applied fallback steamboat material styling without useful mesh names. Rename mesh parts in Blender for cleaner per-part material control.",
    );
  }
}

function normalizeShipScene(
  inputScene: THREE.Group,
  targetLength: number,
  materialPreset?: ShipMaterialPreset,
): THREE.Group {
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
      if (!mesh.isMesh) {
        return;
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((material) => {
          material.needsUpdate = true;
        });
        return;
      }
      mesh.material.needsUpdate = true;
    });
  }

  return root;
}

function resolveCandidatePaths(config: ShipModelConfig): string[] {
  const paths = [...(config.candidatePaths ?? []), ...(config.path ? [config.path] : [])];
  return Array.from(new Set(paths.filter((path) => path.length > 0)));
}

function useShipAsset(paths: string[]): ShipAssetState {
  const [state, setState] = useState<ShipAssetState>(() => {
    const loadedPath = paths.find((path) => loadedScenes.has(path));
    if (loadedPath) {
      return { status: "ready", scene: loadedScenes.get(loadedPath) ?? null, resolvedPath: loadedPath };
    }
    if (paths.length === 0 || paths.every((path) => failedPaths.has(path))) {
      return { status: "error", scene: null, resolvedPath: null };
    }
    return { status: "loading", scene: null, resolvedPath: null };
  });

  useEffect(() => {
    const loadedPath = paths.find((path) => loadedScenes.has(path));
    if (loadedPath) {
      setState({ status: "ready", scene: loadedScenes.get(loadedPath) ?? null, resolvedPath: loadedPath });
      return;
    }

    if (paths.length === 0 || paths.every((path) => failedPaths.has(path))) {
      setState({ status: "error", scene: null, resolvedPath: null });
      return;
    }

    let disposed = false;
    const loader = new GLTFLoader();
    const attemptLoad = (index: number): void => {
      if (disposed) {
        return;
      }

      if (index >= paths.length) {
        setState({ status: "error", scene: null, resolvedPath: null });
        return;
      }

      const path = paths[index];
      if (failedPaths.has(path)) {
        attemptLoad(index + 1);
        return;
      }

      if (loadedScenes.has(path)) {
        setState({ status: "ready", scene: loadedScenes.get(path) ?? null, resolvedPath: path });
        return;
      }

      loader.load(
        path,
        (gltf) => {
          if (disposed) {
            return;
          }
          loadedScenes.set(path, gltf.scene);
          setState({ status: "ready", scene: gltf.scene, resolvedPath: path });
        },
        undefined,
        () => {
          if (disposed) {
            return;
          }
          failedPaths.add(path);
          attemptLoad(index + 1);
        },
      );
    };

    attemptLoad(0);

    return () => {
      disposed = true;
    };
  }, [paths]);

  return state;
}

export function ShipModelVisual({ config, fallback }: ShipModelVisualProps): ReactElement {
  const candidatePaths = useMemo(() => resolveCandidatePaths(config), [config]);
  const { status, scene, resolvedPath } = useShipAsset(candidatePaths);
  const hasWarnedRef = useRef(false);

  useEffect(() => {
    if (status !== "error" || hasWarnedRef.current || !import.meta.env.DEV) {
      return;
    }
    hasWarnedRef.current = true;
    console.warn(
      `[ShipModelVisual] Failed to load ship model from candidates [${candidatePaths.join(", ")}]. Falling back to primitive mesh.`,
    );
  }, [candidatePaths, status]);

  useEffect(() => {
    if (!import.meta.env.DEV || !resolvedPath) {
      return;
    }
    if (candidatePaths.length > 1 && resolvedPath !== candidatePaths[0]) {
      console.warn(
        `[ShipModelVisual] Primary model "${candidatePaths[0]}" was unavailable; using "${resolvedPath}" instead.`,
      );
    }
  }, [candidatePaths, resolvedPath]);

  const normalized = useMemo(() => {
    if (!scene) {
      return null;
    }
    return normalizeShipScene(scene, config.targetLength, config.materialPreset);
  }, [config.materialPreset, config.targetLength, scene]);

  if (status !== "ready" || !normalized) {
    return <>{fallback}</>;
  }

  const forwardAxis = config.forwardAxis ?? "positiveZ";
  const rotationY = FORWARD_AXIS_ROTATION_Y[forwardAxis] + (config.rotationOffsetY ?? 0);
  const offset = config.positionOffset ?? [0, 0, 0];

  return (
    <group position={offset} rotation={[0, rotationY, 0]}>
      <primitive object={normalized} />
    </group>
  );
}
