import { COIN_PICKUP_RADIUS } from "../constants";
import { distance } from "../utils";
import type { PickupState, PlayerState, GameSnapshot } from "../types";

export interface PickupCollectionResult {
  coinsGained: number;
  triggerUpgrade: boolean;
}

export function processPickups(
  pickups: PickupState[],
  player: PlayerState,
  cooldowns: GameSnapshot["cooldowns"],
): PickupCollectionResult {
  let coinsGained = 0;
  let triggerUpgrade = false;

  for (let i = pickups.length - 1; i >= 0; i -= 1) {
    const pickup = pickups[i];
    const dist = distance(player.position, pickup.position);
    
    // Different pickups could theoretically have different radii, 
    // but we'll use COIN_PICKUP_RADIUS for all for now.
    if (dist < COIN_PICKUP_RADIUS) {
      if (pickup.kind === "coin" || pickup.kind === "gem") {
        coinsGained += pickup.value;
      } else if (pickup.kind === "hp") {
        player.hp = Math.min(player.maxHp, player.hp + pickup.value);
      } else if (pickup.kind === "chest") {
        if (Math.random() < 0.5) {
          triggerUpgrade = true;
        } else {
          coinsGained += 25; // Good chunk of coins
        }
      } else if (pickup.kind === "supply_heal") {
        player.hp = player.maxHp;
      } else if (pickup.kind === "supply_frenzy") {
        cooldowns.frenzyRemaining = 10.0;
      } else if (pickup.kind === "supply_invuln") {
        cooldowns.invulnRemaining = 4.0; // 3-4s
      }
      
      pickups.splice(i, 1);
    }
  }

  return { coinsGained, triggerUpgrade };
}
