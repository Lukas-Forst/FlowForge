import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { createAudioManager } from "./audio/AudioManager";
import { AssetPreloader } from "./assets/AssetPreloader";
import { useGameState } from "./game/useGameState";
import type { MovementKey } from "./game/types";
import { ScreenFlash } from "./scene/fx/ScreenFlash";
import { GameScene } from "./scene/GameScene";
import { GameOverScreen } from "./ui/GameOverScreen";
import { Hud } from "./ui/Hud";
import { PauseScreen } from "./ui/PauseScreen";
import { LevelUpRibbon } from "./ui/LevelUpRibbon";
import { SplashScreen } from "./ui/SplashScreen";
import { StartScreen } from "./ui/StartScreen";
import { UpgradeModal } from "./ui/UpgradeModal";

const MOVEMENT_KEYS: Record<string, MovementKey> = {
  w: "w",
  a: "a",
  s: "s",
  d: "d",
};

function isRecognizedAbilityKey(code: string): boolean {
  return code === "KeyQ" || code === "KeyE" || code === "KeyR" || code === "Space";
}

export default function App(): ReactElement {
  const {
    snapshot,
    startRun,
    restartRun,
    setMovementKey,
    triggerCannon,
    triggerBoost,
    chooseUpgrade,
    togglePause,
    quitRun,
    tick,
    finishLoading,
    setLoadingProgress,
    consumeAudioEvents,
  } = useGameState();

  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioMgrRef = useRef<ReturnType<typeof createAudioManager> | null>(null);
  const levelRef = useRef(0);
  const [flashSignal, setFlashSignal] = useState(0);

  useEffect(() => {
    if (snapshot.upgrades.level !== levelRef.current) {
      levelRef.current = snapshot.upgrades.level;
      setFlashSignal((n) => n + 1);
    }
  }, [snapshot.upgrades.level]);

  useEffect(() => {
    const clearMovement = (): void => {
      setMovementKey("w", false);
      setMovementKey("a", false);
      setMovementKey("s", false);
      setMovementKey("d", false);
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      const movement = MOVEMENT_KEYS[event.key.toLowerCase()];
      if (movement) {
        setMovementKey(movement, true);
        return;
      }

      if (event.code === "KeyQ" && !event.repeat) {
        triggerCannon();
        return;
      }

      if (event.code === "Space" && !event.repeat) {
        event.preventDefault();
        triggerBoost();
        return;
      }

      if (event.code === "Escape" || event.code === "KeyP") {
        if (!event.repeat) {
          togglePause();
        }
        return;
      }

      if (isRecognizedAbilityKey(event.code)) {
        return;
      }

      if (snapshot.phase === "start" && event.code === "Enter") {
        startRun();
      }
      if (snapshot.phase === "gameover" && event.code === "Enter") {
        restartRun();
      }
    };

    const onKeyUp = (event: KeyboardEvent): void => {
      const movement = MOVEMENT_KEYS[event.key.toLowerCase()];
      if (movement) {
        setMovementKey(movement, false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearMovement);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearMovement);
    };
  }, [restartRun, setMovementKey, snapshot.phase, startRun, togglePause, triggerBoost, triggerCannon]);

  useEffect(() => {
    const kick = () => {
      if (!audioCtxRef.current) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctor();
        audioCtxRef.current = ctx;
        audioMgrRef.current = createAudioManager(ctx);
      } else if (audioCtxRef.current.state === "suspended") {
        void audioCtxRef.current.resume();
      }
    };
    window.addEventListener("keydown", kick);
    window.addEventListener("pointerdown", kick);
    return () => {
      window.removeEventListener("keydown", kick);
      window.removeEventListener("pointerdown", kick);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const frame = (now: number): void => {
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      tick(delta);
      const mgr = audioMgrRef.current;
      if (mgr) {
        mgr.drain(consumeAudioEvents());
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [consumeAudioEvents, tick]);

  return (
    <div className="app-shell">
      {snapshot.phase === "loading" ? (
        <>
          <AssetPreloader tier="critical" onProgress={setLoadingProgress} onComplete={finishLoading} />
          <SplashScreen loading={snapshot.loading} />
        </>
      ) : (
        <>
          <GameScene snapshot={snapshot} />
          <ScreenFlash signal={flashSignal} />
          <LevelUpRibbon signal={flashSignal} />
          {(snapshot.phase === "playing" || snapshot.phase === "upgrade" || snapshot.phase === "paused") && <Hud snapshot={snapshot} />}
          {snapshot.phase === "start" && (
            <>
              <AssetPreloader tier="biome" />
              <StartScreen onStart={startRun} />
            </>
          )}
          {snapshot.phase === "playing" && <AssetPreloader tier="deferred" />}
          {snapshot.phase === "paused" && <PauseScreen snapshot={snapshot} onResume={togglePause} onQuit={quitRun} />}
          {snapshot.phase === "upgrade" && <UpgradeModal options={snapshot.pendingUpgradeOptions} onPick={chooseUpgrade} />}
          {snapshot.phase === "gameover" && <GameOverScreen snapshot={snapshot} onRestart={restartRun} />}
        </>
      )}
    </div>
  );
}
