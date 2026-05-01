import { describe, expect, it } from "vitest";
import { shouldAdvanceSimThisTick } from "./useGameState";

describe("shouldAdvanceSimThisTick", () => {
  it("advances during playing", () => {
    expect(shouldAdvanceSimThisTick("playing")).toBe(true);
  });

  it("pauses during upgrade selection", () => {
    expect(shouldAdvanceSimThisTick("upgrade")).toBe(false);
  });

  it("does not advance on non-sim phases", () => {
    expect(shouldAdvanceSimThisTick("paused")).toBe(false);
    expect(shouldAdvanceSimThisTick("loading")).toBe(false);
    expect(shouldAdvanceSimThisTick("start")).toBe(false);
    expect(shouldAdvanceSimThisTick("gameover")).toBe(false);
  });
});
