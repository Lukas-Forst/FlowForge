import type { AudioEvent } from "../game/types";
import { playSynth, computePan } from "./devSynth";
import { createMusicSystem, type MusicSystem } from "./MusicSystem";

export interface AudioManager {
  drain(queue: AudioEvent[], listenerX?: number): void;
  setMasterVolume(v: number): void;
  getMasterVolume(): number;
  ambient(id: "sea_bed" | "boss_bed", fadeMs?: number): void;
  stopAmbient(fadeMs?: number): void;
  /** Start procedural music (called when run begins). */
  startMusic(): void;
  /** Stop procedural music (called on game over / quit). */
  stopMusic(): void;
  /** Update music layers from game state. Call every tick. */
  updateMusic(state: { enemies: unknown[]; megaBoss: { spawned: boolean } | null; phase: string }): void;
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

  // Procedural layered music system
  const music: MusicSystem = createMusicSystem(ctx, musicBus);

  return {
    drain(queue, listenerX?: number) {
      for (let i = 0; i < queue.length; i += 1) {
        const ev = queue[i];
        let pan = 0;
        if (ev.position !== undefined && listenerX !== undefined) {
          pan = computePan(ev.position.x, listenerX);
        }
        playSynth(ctx, sfxBus, ev.sfx, ev.volume ?? 1, ev.pitch ?? 1, pan);
      }
      queue.length = 0;
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
    startMusic() {
      music.start();
    },
    stopMusic() {
      music.stop();
    },
    updateMusic(state) {
      music.update(state);
    },
  };
}
