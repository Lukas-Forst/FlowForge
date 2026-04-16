import { useEffect } from "react";
import type { ReactElement } from "react";
import { useGameState } from "./game/useGameState";
import type { MovementKey } from "./game/types";
import { GameScene } from "./scene/GameScene";
import { GameOverScreen } from "./ui/GameOverScreen";
import { Hud } from "./ui/Hud";
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
  const { snapshot, startRun, restartRun, setMovementKey, triggerCannon, chooseUpgrade, tick } = useGameState();

  useEffect(() => {
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

      // v1 reserves additional ability keys without behavior.
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
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [restartRun, setMovementKey, snapshot.phase, startRun, triggerCannon]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const frame = (now: number): void => {
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      tick(delta);
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [tick]);

  return (
    <div className="app-shell">
      <GameScene snapshot={snapshot} />
      {(snapshot.phase === "playing" || snapshot.phase === "upgrade") && <Hud snapshot={snapshot} />}
      {snapshot.phase === "start" && <StartScreen onStart={startRun} />}
      {snapshot.phase === "upgrade" && (
        <UpgradeModal options={snapshot.pendingUpgradeOptions} onPick={chooseUpgrade} />
      )}
      {snapshot.phase === "gameover" && <GameOverScreen snapshot={snapshot} onRestart={restartRun} />}
    </div>
  );
}
