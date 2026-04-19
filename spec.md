# High-Speed Harvester Mechanics — Specification

> **Context:** The core combat is currently standard ocean survival. To increase the satisfying, fast-paced feeling of resource collection (inspired by 'Wanderbug'-style sweeping mechanics), we're adding dynamic physical harvestables scattered across the ocean that the nimble speedboat can plow through to harvest resources rapidly.

## Overview

This feature enriches the arcade combat loop by introducing destructible/harvestable environmental objects (e.g., scrap rafts, small abandoned fishing boats) that populate the ocean. Rather than just collecting loose coins dropped by enemies, the player can burst through these floating scrap fields at high speeds to aggressively gather the core upgrade resource, amplifying the chaotic and visceral arcade feel. The player's nimble speedboat serves as the harvesting tool for now, with room for future specialized models.

---

## Goals

- Increase visceral satisfaction of resource collection during high-speed traversal.
- Provide alternative non-combat sources of income (salvage/scrap fields) scattered in the world.
- Maintain the single, unified resource economy to keep cognitive load low.
- Lay the technical groundwork for future boat variations/upgrades.

---

## Core Features

### 1. Harvestable World Objects
Different types of floating neutral objects will spawn dynamically around the player, populating the ocean alongside enemies.
- **Scrap Rafts:** Small floating clusters of crates or debris. Destroyed instantly upon player collision or a single bullet hit. Yields a small to moderate resource burst.
- **Abandoned Boats/Barges:** Slightly larger neutral objects. Require multiple bullets or a direct high-speed ram to destroy. Yields a massive resource burst.
- **Behavior:** These objects bob and drift slightly with the water but do not move actively or attack.

### 2. Visceral "Eating" Mechanics (Ramming)
The player's speedboat can aggressively harvest these objects.
- Colliding with a harvestable destroys it (or deals massive damage to it).
- Instead of quietly popping out UI numbers, the destruction spawns physics debris and a satisfying localized "burst" of resource pickups that are immediately magnetized to the player.
- Ramming neutral harvestables does *not* damage the player's HP, effectively distinguishing them from enemy ships and encouraging aggressive steering.

### 3. Unified Resource Economy
The current generic "coins" will be reframed logically (and potentially visually) as "Scrap" or "Resources" (though functionally identical).
- Enemies still drop resources upon death.
- Harvestable objects act as dense piñatas of resources.
- The player collects resources through normal magnetism.

---

## Technical Considerations

- **Game State:** Introduce a `harvestables: HarvestableState[]` array to `GameSnapshot`.
- **Spawning System:** Create a new spawner logic (e.g., `harvestableSpawner.ts`) that peppers the surrounding ocean with clusters of these items.
- **Collision Detection:** Update `collision.ts` to evaluate player-vs-harvestable intersections and projectile-vs-harvestable intersections.
