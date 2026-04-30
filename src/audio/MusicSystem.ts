/**
 * Procedural layered music system for FlowForge.
 *
 * Layers:
 *  - BASE:  Low ocean-drone swell (sine, ~60 Hz). Always present at low volume.
 *  - COMBAT: Rhythmic low-pulse (triangle, ~90 Hz). Volume scales with enemy density.
 *  - BOSS:   Dramatic swells (sawtooth, ~55 Hz). Fades in when megaBoss is active.
 *
 * Crossfades use 0.5 s ramps on the Web Audio gain nodes.
 */

export interface MusicState {
  baseVolume: number;   // 0-1, BASE layer
  combatVolume: number; // 0-1, COMBAT layer
  bossVolume: number;   // 0-1, BOSS layer
}

interface LayerNodes {
  gain: GainNode;
  osc: OscillatorNode;
  lfo: OscillatorNode | null; // for swell modulation
}

const FADE_SECS = 0.5;

export interface MusicSystem {
  /** Update layer volumes based on current game snapshot. Call every tick. */
  update(state: { enemies: unknown[]; megaBoss: { spawned: boolean } | null; phase: string }): void;
  start(): void;
  stop(): void;
  /** Returns current normalised layer volumes. */
  getState(): MusicState;
}

export function createMusicSystem(ctx: AudioContext, dest: AudioNode): MusicSystem {
  // ── Master music gain (already applied by AudioManager musicBus) ──
  const masterGain = ctx.createGain();
  masterGain.gain.value = 1.0;
  masterGain.connect(dest);

  // ── BASE layer: slow sine swell ──────────────────────────────────────
  const baseGain = ctx.createGain();
  baseGain.gain.value = 0.18;
  baseGain.connect(masterGain);

  const baseOsc = ctx.createOscillator();
  baseOsc.type = "sine";
  baseOsc.frequency.value = 60;
  baseOsc.connect(baseGain);
  baseOsc.start();

  // LFO to modulate base swell
  const baseLfo = ctx.createOscillator();
  baseLfo.type = "sine";
  baseLfo.frequency.value = 0.12; // ~8 s period swell
  const baseLfoGain = ctx.createGain();
  baseLfoGain.gain.value = 0.06;
  baseLfo.connect(baseLfoGain);
  baseLfoGain.connect(baseGain.gain);
  baseLfo.start();

  // ── COMBAT layer: rhythmic triangle pulse ───────────────────────────
  const combatGain = ctx.createGain();
  combatGain.gain.value = 0.0; // starts silent
  combatGain.connect(masterGain);

  const combatOsc = ctx.createOscillator();
  combatOsc.type = "triangle";
  combatOsc.frequency.value = 90;
  combatOsc.connect(combatGain);
  combatOsc.start();

  // Pulse LFO — tempo speeds up with more enemies (handled in update)
  const combatLfo = ctx.createOscillator();
  combatLfo.type = "square";
  combatLfo.frequency.value = 1.5;
  const combatLfoGain = ctx.createGain();
  combatLfoGain.gain.value = 0.22;
  combatLfo.connect(combatLfoGain);
  combatLfoGain.connect(combatGain.gain);
  combatLfo.start();

  // ── BOSS layer: dramatic sawtooth swells ───────────────────────────
  const bossGain = ctx.createGain();
  bossGain.gain.value = 0.0; // starts silent
  bossGain.connect(masterGain);

  const bossOsc = ctx.createOscillator();
  bossOsc.type = "sawtooth";
  bossOsc.frequency.value = 55;
  bossOsc.connect(bossGain);
  bossOsc.start();

  // Slow swell LFO for boss layer
  const bossLfo = ctx.createOscillator();
  bossLfo.type = "sine";
  bossLfo.frequency.value = 0.35;
  const bossLfoGain = ctx.createGain();
  bossLfoGain.gain.value = 0.25;
  bossLfo.connect(bossLfoGain);
  bossLfoGain.connect(bossGain.gain);
  bossLfo.start();

  // Current target volumes (for smooth crossfade tracking)
  let targetBase = 0.18;
  let targetCombat = 0.0;
  let targetBoss = 0.0;
  const now = () => ctx.currentTime;

  function ramp(gainNode: GainNode, target: number) {
    gainNode.gain.cancelScheduledValues(now());
    gainNode.gain.setValueAtTime(gainNode.gain.value, now());
    gainNode.gain.linearRampToValueAtTime(target, now() + FADE_SECS);
  }

  return {
    update(state) {
      const enemyCount = state.enemies.length;
      const hasBoss = state.megaBoss !== null && state.megaBoss.spawned;
      const isPlaying = state.phase === "playing";

      // Base layer: drops slightly during boss for drama
      targetBase = isPlaying ? (hasBoss ? 0.12 : 0.18) : 0.0;

      // Combat layer: scales with enemy count (0→10+ enemies maps to 0→0.55 volume)
      if (isPlaying) {
        const combatTarget = Math.min(0.55, (enemyCount / 10) * 0.55);
        targetCombat = combatTarget;

        // Pulse tempo: 1.2 Hz base + up to 2.4 Hz extra = max 3.6 Hz
        const tempo = 1.2 + Math.min(2.4, enemyCount * 0.25);
        combatLfo.frequency.setTargetAtTime(tempo, now(), 0.3);
      } else {
        targetCombat = 0.0;
      }

      // Boss layer: swells in when mega boss is active
      targetBoss = isPlaying && hasBoss ? 0.45 : 0.0;

      ramp(baseGain, targetBase);
      ramp(combatGain, targetCombat);
      ramp(bossGain, targetBoss);
    },

    start() {
      const t = now();
      baseGain.gain.setTargetAtTime(targetBase, t, 0.3);
      combatGain.gain.setTargetAtTime(targetCombat, t, 0.3);
      bossGain.gain.setTargetAtTime(targetBoss, t, 0.3);
    },

    stop() {
      const t = now();
      baseGain.gain.setTargetAtTime(0, t, 0.3);
      combatGain.gain.setTargetAtTime(0, t, 0.3);
      bossGain.gain.setTargetAtTime(0, t, 0.3);
    },

    getState() {
      return {
        baseVolume: baseGain.gain.value,
        combatVolume: combatGain.gain.value,
        bossVolume: bossGain.gain.value,
      };
    },
  };
}
