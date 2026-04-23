import { useEffect, useRef, useState } from "react";

export interface StepTweenInput {
  current: number;
  target: number;
  elapsed: number;
  duration: number;
}

export interface StepTweenResult {
  value: number;
  done: boolean;
}

function easeOut(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - c, 3);
}

export function stepTween({ current, target, elapsed, duration }: StepTweenInput): StepTweenResult {
  if (duration <= 0 || elapsed >= duration) return { value: target, done: true };
  if (elapsed < 0) return { value: current, done: false };
  const t = easeOut(elapsed / duration);
  return { value: current + (target - current) * t, done: false };
}

export function useTweenedValue(target: number, durationMs = 150): number {
  const [value, setValue] = useState(target);
  const startRef = useRef({ from: target, target, startedAt: performance.now() });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = { from: value, target, startedAt: performance.now() };
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const frame = (now: number) => {
      const elapsed = (now - startRef.current.startedAt) / 1000;
      const res = stepTween({
        current: startRef.current.from,
        target: startRef.current.target,
        elapsed,
        duration: durationMs / 1000,
      });
      setValue(res.value);
      if (!res.done) rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}
