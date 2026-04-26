import type { ReactElement } from "react";
import { useState } from "react";
import { getUpgradePrerequisiteDescription } from "../game/systems/upgrades";
import type { UpgradeOption, UpgradeType } from "../game/types";

interface UpgradeModalProps {
  options: UpgradeOption[];
  onPick: (type: UpgradeOption["type"]) => void;
  title?: string;
  /** Current stacks per upgrade (for "owned" counts on cards). */
  stacks?: Partial<Record<UpgradeType, number>>;
  variant?: "default" | "elite";
}

export function UpgradeModal({ options, onPick, title = "CHOOSE UPGRADE", stacks, variant = "default" }: UpgradeModalProps): ReactElement {
  const [picked, setPicked] = useState<UpgradeOption["type"] | null>(null);

  const handlePick = (type: UpgradeOption["type"]) => {
    if (picked) return;
    setPicked(type);
    setTimeout(() => onPick(type), 100);
  };

  return (
    <div className="upgrade-modal">
      <div className={`upgrade-modal-panel ${variant === "elite" ? "upgrade-modal-panel--elite" : ""}`}>
        <h2 style={{ fontFamily: "'Luckiest Guy', system-ui, sans-serif", letterSpacing: 2, margin: 0 }}>{title}</h2>
        <div className="upgrade-grid-v2">
          {options.map((option) => {
            const prereq = getUpgradePrerequisiteDescription(option.type);
            const owned = stacks?.[option.type] ?? 0;
            const ownedLine =
              owned > 0 ? (
                <span className="upgrade-owned">
                  Owned {owned}/{option.maxStacks}
                </span>
              ) : null;
            return (
            <button
              className={`upgrade-card upgrade-card--${option.rarity} ${picked === option.type ? "picked" : ""}`}
              key={option.type}
              type="button"
              onClick={() => handlePick(option.type)}
              disabled={!!picked}
            >
              <span className="upgrade-rarity-pill">{option.rarity}</span>
              <strong>{option.label}</strong>
              <span>{option.description}</span>
              {ownedLine}
              {prereq ? <span className="upgrade-prereq">Prereq: {prereq}</span> : null}
            </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
