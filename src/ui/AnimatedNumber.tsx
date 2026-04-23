import type { ReactElement } from "react";
import { useTweenedValue } from "./useTweenedValue";

interface AnimatedNumberProps {
  value: number;
  durationMs?: number;
  format?: (n: number) => string;
}

export function AnimatedNumber({ value, durationMs = 150, format }: AnimatedNumberProps): ReactElement {
  const shown = useTweenedValue(value, durationMs);
  const display = format ? format(shown) : Math.floor(shown).toLocaleString();
  return <>{display}</>;
}
