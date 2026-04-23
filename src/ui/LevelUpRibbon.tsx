import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";

interface LevelUpRibbonProps {
  signal: number;
}

export function LevelUpRibbon({ signal }: LevelUpRibbonProps): ReactElement {
  const last = useRef(signal);
  const [firing, setFiring] = useState(false);
  useEffect(() => {
    if (signal !== last.current) {
      last.current = signal;
      setFiring(true);
      const t = setTimeout(() => setFiring(false), 500);
      return () => clearTimeout(t);
    }
  }, [signal]);
  return <div className={`levelup-ribbon ${firing ? "fire" : ""}`}>LEVEL UP!</div>;
}
