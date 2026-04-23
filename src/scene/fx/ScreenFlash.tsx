import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";

interface ScreenFlashProps {
  signal: number;
}

export function ScreenFlash({ signal }: ScreenFlashProps): ReactElement {
  const last = useRef(signal);
  const [firing, setFiring] = useState(false);
  useEffect(() => {
    if (signal !== last.current) {
      last.current = signal;
      setFiring(true);
      const t = setTimeout(() => setFiring(false), 140);
      return () => clearTimeout(t);
    }
  }, [signal]);
  return <div className={`screen-flash ${firing ? "fire" : ""}`} />;
}
