import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";

interface TutorialOverlayProps {
  onFinish: () => void;
}

interface TutorialStep {
  title: string;
  subtitle?: string;
  visual: "ship" | "movement" | "autoFire" | "abilities" | "upgrade" | "final";
}

const TOTAL_TUTORIAL_SECONDS = 30;
const STEP_SECONDS = 5;

const STEPS: readonly TutorialStep[] = [
  {
    title: "Welcome to FlowForge — Survive the endless ocean!",
    visual: "ship",
  },
  {
    title: "Sail with WASD / drag on mobile",
    visual: "movement",
  },
  {
    title: "Cannons auto-fire at enemies",
    visual: "autoFire",
  },
  {
    title: "Space / tap to fire cannon salvo",
    subtitle: "Shift / button to boost",
    visual: "abilities",
  },
  {
    title: "Collect coins → choose upgrades",
    visual: "upgrade",
  },
  {
    title: "Survive as long as you can. Good luck, captain!",
    visual: "final",
  },
];

function TutorialVisual({ kind }: { kind: TutorialStep["visual"] }): ReactElement {
  if (kind === "movement") {
    return (
      <div className="tutorial-visual movement">
        <div className="tutorial-arrows">
          <span className="arrow up">W</span>
          <span className="arrow left">A</span>
          <span className="arrow down">S</span>
          <span className="arrow right">D</span>
        </div>
      </div>
    );
  }

  if (kind === "autoFire") {
    return (
      <div className="tutorial-visual auto-fire">
        <div className="tutorial-ship-icon small" />
        <div className="tutorial-tracer t1" />
        <div className="tutorial-tracer t2" />
        <div className="tutorial-tracer t3" />
        <div className="tutorial-enemy-dot" />
      </div>
    );
  }

  if (kind === "abilities") {
    return (
      <div className="tutorial-visual abilities">
        <div className="tutorial-key">SPACE</div>
        <div className="tutorial-key">SHIFT</div>
      </div>
    );
  }

  if (kind === "upgrade") {
    return (
      <div className="tutorial-visual upgrade">
        <div className="tutorial-coin-row">
          <span className="coin c1" />
          <span className="coin c2" />
          <span className="coin c3" />
        </div>
        <div className="tutorial-upgrade-card">
          <strong>Powder Frenzy</strong>
          <span>Increase base auto-fire rate by 22%</span>
        </div>
      </div>
    );
  }

  if (kind === "final") {
    return (
      <div className="tutorial-visual final">
        <div className="tutorial-ribbon">CAPTAIN READY</div>
      </div>
    );
  }

  return (
    <div className="tutorial-visual ship">
      <div className="tutorial-ship-icon" />
      <div className="tutorial-floating-number">+100</div>
    </div>
  );
}

export function TutorialOverlay({ onFinish }: TutorialOverlayProps): ReactElement {
  const [elapsed, setElapsed] = useState(0);
  const [holdUntilClick, setHoldUntilClick] = useState(false);

  useEffect(() => {
    if (holdUntilClick) {
      return;
    }
    const timer = window.setInterval(() => {
      setElapsed((current) => {
        const next = current + 0.1;
        if (next >= TOTAL_TUTORIAL_SECONDS) {
          setHoldUntilClick(true);
          return TOTAL_TUTORIAL_SECONDS;
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [holdUntilClick]);

  const stepIndex = Math.min(STEPS.length - 1, Math.floor(elapsed / STEP_SECONDS));
  const step = STEPS[stepIndex] ?? STEPS[0];
  const progress = Math.min(1, elapsed / TOTAL_TUTORIAL_SECONDS);

  const instruction = useMemo(() => {
    if (holdUntilClick || step.visual === "final") {
      return "Tap/click anywhere to skip";
    }
    return "Tap/click to skip tutorial";
  }, [holdUntilClick, step.visual]);

  const finish = (): void => {
    onFinish();
  };

  return (
    <div className="tutorial-overlay" onClick={finish} role="button" tabIndex={0} onKeyDown={finish}>
      <div className="tutorial-panel" onClick={(event) => event.stopPropagation()}>
        <div className="tutorial-progress">
          <div className="tutorial-progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <h2>{step.title}</h2>
        {step.subtitle ? <p>{step.subtitle}</p> : null}
        <TutorialVisual kind={step.visual} />
        {step.visual === "final" || holdUntilClick ? (
          <button className="tutorial-start-run" onClick={finish}>
            Start Run
          </button>
        ) : null}
        <div className="tutorial-hint">{instruction}</div>
      </div>
    </div>
  );
}
