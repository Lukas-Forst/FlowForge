import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioEvent } from "../game/types";
import { createAudioManager } from "./AudioManager";

function makeFakeAudioContext() {
  const gainNode = {
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn().mockReturnThis(),
  };
  const osc = {
    type: "sine",
    frequency: { value: 0, exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn().mockReturnValue(gainNode),
    start: vi.fn(),
    stop: vi.fn(),
  };
  return {
    currentTime: 0,
    createGain: () => ({ ...gainNode, connect: vi.fn().mockReturnThis() }),
    createOscillator: () => ({ ...osc, connect: vi.fn().mockReturnValue(gainNode) }),
    destination: { connect: vi.fn() },
  };
}

describe("AudioManager", () => {
  let fakeCtx: ReturnType<typeof makeFakeAudioContext>;
  beforeEach(() => {
    fakeCtx = makeFakeAudioContext();
  });

  it("drain empties the queue", () => {
    const mgr = createAudioManager(fakeCtx as unknown as AudioContext);
    const queue: AudioEvent[] = [{ id: 1, sfx: "pickup" }, { id: 2, sfx: "hit" }];
    mgr.drain(queue);
    expect(queue.length).toBe(0);
  });

  it("drain ignores empty queue safely", () => {
    const mgr = createAudioManager(fakeCtx as unknown as AudioContext);
    expect(() => mgr.drain([])).not.toThrow();
  });

  it("setMasterVolume clamps to [0, 1]", () => {
    const mgr = createAudioManager(fakeCtx as unknown as AudioContext);
    mgr.setMasterVolume(2);
    expect(mgr.getMasterVolume()).toBe(1);
    mgr.setMasterVolume(-0.5);
    expect(mgr.getMasterVolume()).toBe(0);
  });
});
