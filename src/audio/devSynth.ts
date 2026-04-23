import type { SfxId } from "../game/types";

const RECIPES: Record<SfxId, { freq: number; wave: OscillatorType; durationMs: number; sweepTo?: number }> = {
  cannon_fire: { freq: 120, wave: "sawtooth", durationMs: 200, sweepTo: 60 },
  hit: { freq: 220, wave: "square", durationMs: 150 },
  pickup: { freq: 660, wave: "sine", durationMs: 100, sweepTo: 1320 },
  upgrade_sting: { freq: 440, wave: "sine", durationMs: 500, sweepTo: 880 },
  boss_cue: { freq: 80, wave: "sawtooth", durationMs: 1000 },
  damage_taken: { freq: 180, wave: "square", durationMs: 150, sweepTo: 90 },
  ship_destroyed: { freq: 100, wave: "sawtooth", durationMs: 400, sweepTo: 40 },
  harvestable_destroyed: { freq: 300, wave: "triangle", durationMs: 300, sweepTo: 450 },
};

export function playSynth(ctx: AudioContext, dest: AudioNode, sfx: SfxId, volume = 1, pitch = 1): void {
  const recipe = RECIPES[sfx];
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = recipe.wave;
  osc.frequency.value = recipe.freq * pitch;
  if (recipe.sweepTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, recipe.sweepTo * pitch), ctx.currentTime + recipe.durationMs / 1000);
  }
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3 * volume, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + recipe.durationMs / 1000);
  osc.connect(gain).connect(dest);
  osc.start();
  osc.stop(ctx.currentTime + recipe.durationMs / 1000 + 0.05);
}
