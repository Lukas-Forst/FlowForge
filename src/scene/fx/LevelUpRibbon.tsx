import type { ReactElement } from "react";
import { LevelUpRibbon as UiLevelUpRibbon } from "../../ui/LevelUpRibbon";

interface LevelUpRibbonProps {
  signal: number;
}

export function LevelUpRibbon({ signal }: LevelUpRibbonProps): ReactElement {
  return <UiLevelUpRibbon signal={signal} />;
}
