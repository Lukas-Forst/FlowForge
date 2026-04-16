import type { Vec2 } from "./types";

export function vecLength(vector: Vec2): number {
  return Math.hypot(vector.x, vector.y);
}

export function normalize(vector: Vec2): Vec2 {
  const len = vecLength(vector);
  if (len === 0) {
    return { x: 0, y: 0 };
  }
  return { x: vector.x / len, y: vector.y / len };
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clampToRadius(point: Vec2, radius: number): Vec2 {
  const len = vecLength(point);
  if (len <= radius || len === 0) {
    return point;
  }
  const scale = radius / len;
  return { x: point.x * scale, y: point.y * scale };
}

export function clampToBounds(point: Vec2, halfSize: number): Vec2 {
  return {
    x: Math.max(-halfSize, Math.min(halfSize, point.x)),
    y: Math.max(-halfSize, Math.min(halfSize, point.y)),
  };
}

export function perpRight(vector: Vec2): Vec2 {
  // 2D right-hand perpendicular: (x, y) -> (y, -x)
  return { x: vector.y, y: -vector.x };
}

export function directionFromAngle(angle: number): Vec2 {
  return { x: Math.sin(angle), y: Math.cos(angle) };
}

export function angleFromDirection(vector: Vec2): number {
  return Math.atan2(vector.x, vector.y);
}

export function randomPointOnRing(radius: number): Vec2 {
  const angle = Math.random() * Math.PI * 2;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}
