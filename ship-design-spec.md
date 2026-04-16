# FlowForge Ship Visual Redesign — Steamship Design Specification

> **Context:** The current ships are functional but read more as generic sailing ships. This spec defines a visual redesign to give both the player ship and all three enemy ship types a simple, readable steamship silhouette — built entirely with Three.js box and cylinder primitives inside React Three Fiber.

---

## Overview

All ships in FlowForge should be redesigned to read as simple steamships. The steamship identity is communicated through two primary visual signals: **smokestacks** (replacing masts and sails) and **paddle wheel housings** on the sides of the hull. The aesthetic stays low-poly and stylized — no new geometry types are needed beyond what is already used.

---

## Goals

- Replace sail-and-mast silhouettes with smokestack-and-funnel silhouettes on all ships.
- Add simple paddle wheel housings to reinforce the steamship identity.
- Keep the designs distinct from one another so enemy types remain readable at a glance.
- Stay within the existing Three.js primitive toolkit (box, cylinder, sphere geometries only).
- Maintain the upgrade-driven visual evolution on the player ship.

---

## Design Language

All ships share a common visual vocabulary:

| Element | Shape | Notes |
|---|---|---|
| Hull | Flat box, slightly trapezoidal feel via scaling | Wider amidships, narrower bow/stern suggestion via layering |
| Superstructure | Shorter, wider box atop the hull | The "cabin" or "engine room" block |
| Smokestack | Tall, narrow cylinder, slightly tapered | The defining steamship element — replaces the mast |
| Paddle wheel housing | Two flat rectangular boxes, one per side | Mounted at the widest point of the hull, slightly wider than hull |
| Cannons | Short horizontal cylinders, protruding from sides | Retained; reposition to emerge from hull sides or bow |

---

## Core Features

### 1. Player Ship Redesign

**Hull:** Keep the existing brown wooden hull box. Dimensions unchanged (1.8 × 0.5 × 3.1). This is the base that all other elements sit on.

**Engine room block:** Replace the current cabin box with a wider, lower block positioned amidships. Suggested size: 1.4 × 0.55 × 1.8, positioned at `[0, 0.85, 0]`. Color: `#7a5533` (slightly lighter than hull).

**Smokestack:** Replace the mast cylinder with a taller, slightly fatter smokestack. Use two cylinders — a base flare and a shaft:
- Base: `cylinderGeometry args={[0.22, 0.28, 0.3, 8]}` at `[0, 1.05, 0]`, color `#2e2520`
- Shaft: `cylinderGeometry args={[0.16, 0.20, 1.4, 8]}` at `[0, 1.85, 0]`, same color

**No sail:** Remove the white sail box entirely. The smokestack is the vertical focal point.

**Paddle wheel housings:** Two flat boxes mounted at the mid-sides of the hull:
- Left: `boxGeometry args={[0.28, 0.55, 1.1]}` at `[-1.08, 0.38, 0.05]`, color `#5c3d20`
- Right: mirror at `[1.08, 0.38, 0.05]`, same color

**Cannons:** Retain existing logic. Reposition slightly lower and more flush with the hull sides at `y=0.38` (matching paddle housing height). Keep the upgrade progression logic (1–4 cannons based on upgrade level).

**Upgraded appearance:** Starting at upgrade level 4, add a second, shorter smokestack behind the first:
- Shaft: `cylinderGeometry args={[0.12, 0.15, 0.9, 8]}` at `[0, 1.65, -0.9]`, color `#2e2520`

---

### 2. Corsair Enemy Redesign (fast, light)

A sleek, narrow-hulled steam sloop. Smaller and faster-looking than the player ship.

**Hull:** `boxGeometry args={[1.1, 0.38, 2.1]}` at `[0, 0.25, 0]`, color `#4d251e`

**Engine block:** `boxGeometry args={[0.85, 0.42, 1.0]}` at `[0, 0.65, -0.1]`, color `#6b3620`

**Smokestack (single, slim):**
- Base: `cylinderGeometry args={[0.14, 0.18, 0.22, 8]}` at `[0, 0.88, 0]`, color `#1e1716`
- Shaft: `cylinderGeometry args={[0.10, 0.13, 1.1, 8]}` at `[0, 1.55, 0]`, color `#1e1716`

**Paddle housings (narrow):** `boxGeometry args={[0.22, 0.42, 0.85]}` at `[±0.72, 0.28, 0.0]`, color `#3d1c14`

**No sail/flag elements.**

---

### 3. Bomber Enemy Redesign (heavy, wide)

A squat, wide-beamed steam warship. The defining feature is twin smokestacks side by side, communicating industrial power and danger.

**Hull:** `boxGeometry args={[1.6, 0.52, 2.3]}` at `[0, 0.3, 0]`, color `#4a1f1a`

**Engine block:** `boxGeometry args={[1.2, 0.5, 1.4]}` at `[0, 0.82, -0.1]`, color `#632a24`

**Twin smokestacks:**
- Left base: `cylinderGeometry args={[0.16, 0.20, 0.28, 8]}` at `[-0.32, 1.1, 0]`, color `#1e1716`
- Left shaft: `cylinderGeometry args={[0.12, 0.15, 1.3, 8]}` at `[-0.32, 1.85, 0]`, color `#1e1716`
- Right: mirror at `[0.32, ...]`, same color

**Paddle housings (wide, prominent):** `boxGeometry args={[0.35, 0.55, 1.2]}` at `[±1.0, 0.32, 0.05]`, color `#3a1810`

**Weapon detail:** Retain the two forward-facing cannon cylinders from the existing bomber design, positioned at the bow `[±0.28, 0.32, 0.9]`.

---

### 4. Brute Enemy Redesign (massive, armored)

A large ironclad-style steamship. Single massive smokestack, heavy paddle housings, boxy and imposing.

**Hull:** `boxGeometry args={[1.75, 0.6, 2.5]}` at `[0, 0.35, 0]`, color `#2f1412`

**Armored deck layer:** A second, flatter box on top of the hull to suggest iron plating: `boxGeometry args={[1.6, 0.14, 2.2]}` at `[0, 0.68, 0]`, color `#3d2018`

**Engine block:** `boxGeometry args={[1.3, 0.55, 1.5]}` at `[0, 0.9, 0]`, color `#4a2218`

**Smokestack (single, massive):**
- Base: `cylinderGeometry args={[0.30, 0.36, 0.35, 8]}` at `[0, 1.18, 0]`, color `#1e1716`
- Shaft: `cylinderGeometry args={[0.22, 0.28, 1.6, 8]}` at `[0, 2.05, 0]`, color `#1e1716`

**Paddle housings (heavy, armored-looking):** `boxGeometry args={[0.42, 0.62, 1.35]}` at `[±1.12, 0.38, 0.05]`, color `#281010`

---

## Color Palette Reference

| Ship | Hull | Engine Block | Smokestack | Paddle Housings |
|---|---|---|---|---|
| Player | `#6f4c2a` | `#7a5533` | `#2e2520` | `#5c3d20` |
| Corsair | `#4d251e` | `#6b3620` | `#1e1716` | `#3d1c14` |
| Bomber | `#4a1f1a` | `#632a24` | `#1e1716` | `#3a1810` |
| Brute | `#2f1412` | `#4a2218` | `#1e1716` | `#281010` |

---

## Technical Stack

- **Rendering** — React Three Fiber / Three.js (existing)
- **Geometry** — `boxGeometry`, `cylinderGeometry` (no new primitives required)
- **Files to modify** — `src/scene/entities/PlayerShip.tsx`, `src/scene/entities/Enemy.tsx`
