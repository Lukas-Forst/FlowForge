import type { AudioEvent } from "../game/types";
import { playSynth } from "./devSynth";

export interface AudioManager {
  drain(queue: AudioEvent[]): void;
  setMasterVolume(v: number): void;
  getMasterVolume(): number;
  ambient(id: "sea_bed" | "boss_bed", fadeMs?: number): void;
  stopAmbient(fadeMs?: number): void;
}

export function createAudioManager(ctx: AudioContext): AudioManager {
  const master = ctx.createGain();
  master.gain.value = 0.7;
  master.connect(ctx.destination);

  const sfxBus = ctx.createGain();
  sfxBus.gain.value = 1;
  sfxBus.connect(master);

  const musicBus = ctx.createGain();
  musicBus.gain.value = 0.5;
  musicBus.connect(master);

  let currentAmbient: AudioBufferSourceNode | null = null;

  return {
    drain(queue) {
      while (queue.length > 0) {
        const ev = queue.shift();
        if (!ev) break;
        playSynth(ctx, sfxBus, ev.sfx, ev.volume ?? 1, ev.pitch ?? 1);
      }
    },
    setMasterVolume(v) {
      master.gain.value = Math.max(0, Math.min(1, v));
    },
    getMasterVolume() {
      return master.gain.value;
    },
    ambient(_id, _fadeMs) {
      if (musicBus.gain.value < 0) {
        musicBus.gain.value = 0;
      }
    },
    stopAmbient(_fadeMs) {
      if (currentAmbient) {
        try {
          currentAmbient.stop();
        } catch {
          // no-op
        }
        currentAmbient = null;
      }
    },
  };
}
