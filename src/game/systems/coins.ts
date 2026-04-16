import { COIN_PICKUP_RADIUS } from "../constants";
import { distance } from "../utils";
import type { CoinState, PlayerState } from "../types";

export function collectNearbyCoins(coins: CoinState[], player: PlayerState): number {
  let collected = 0;
  for (let idx = coins.length - 1; idx >= 0; idx -= 1) {
    const coin = coins[idx];
    if (distance(coin.position, player.position) <= COIN_PICKUP_RADIUS) {
      collected += coin.value;
      coins.splice(idx, 1);
    }
  }
  return collected;
}
