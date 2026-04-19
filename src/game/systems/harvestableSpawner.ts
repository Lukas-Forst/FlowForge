import { CAMERA_VIEW_HALF, SPAWN_OUTSIDE_VIEW_MIN_DIST } from "../constants";
import { distance } from "../utils";
import type { HarvestableState, HarvestableType } from "../types";

export function getHarvestableCap(_elapsedTimeSec: number): number {
  return 8; // Keep a constant cap around the player
}

export function updateHarvestableSpawning(
  harvestables: HarvestableState[],
  harvestableIdRef: { value: number },
  playerPosition: { x: number; y: number },
  elapsedTime: number,
  _delta: number
): void {
  const cap = getHarvestableCap(elapsedTime);
  
  // Despawn harvestables that fall too far behind (e.g. out of bounds)
  const maxDist = CAMERA_VIEW_HALF * 3.5;
  for (let i = harvestables.length - 1; i >= 0; i -= 1) {
    if (distance(harvestables[i].position, playerPosition) > maxDist) {
      harvestables.splice(i, 1);
    }
  }

  // Cap reached
  if (harvestables.length >= cap) return;

  // We only spawn 1 per frame to spread it out
  const minDistFromPlayer = Math.max(SPAWN_OUTSIDE_VIEW_MIN_DIST, CAMERA_VIEW_HALF + 10);
  const spawnRadiusMin = minDistFromPlayer;
  const spawnRadiusMax = CAMERA_VIEW_HALF * 2.5;

  const angle = Math.random() * Math.PI * 2;
  const radius = spawnRadiusMin + Math.random() * (spawnRadiusMax - spawnRadiusMin);
  const x = playerPosition.x + Math.cos(angle) * radius;
  const y = playerPosition.y + Math.sin(angle) * radius;

  // Ensure it's not spawning right on top of another harvestable
  let tooClose = false;
  for (const h of harvestables) {
    if (distance({ x, y }, h.position) < 15) {
      tooClose = true;
      break;
    }
  }
  if (tooClose) return;

  const isBoat = Math.random() < 0.2;
  const type: HarvestableType = isBoat ? "abandoned_boat" : "scrap_raft";
  const hp = isBoat ? 12 : 1;
  const radiusSize = isBoat ? 2.2 : 1.4;

  harvestables.push({
    id: harvestableIdRef.value++,
    type,
    position: { x, y },
    hp,
    maxHp: hp,
    radius: radiusSize,
    rotation: Math.random() * Math.PI * 2,
  });
}
