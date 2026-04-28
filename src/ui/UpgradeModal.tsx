import type { ReactElement } from "react";
import { useState } from "react";
import { getUpgradePrerequisiteDescription } from "../game/systems/upgrades";
<<<<<<< HEAD
import type { UpgradeOption, UpgradeType } from "../game/types";
=======
import type { UpgradeOption } from "../game/types";
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo

interface UpgradeModalProps {
  options: UpgradeOption[];
  onPick: (type: UpgradeOption["type"]) => void;
<<<<<<< HEAD
  title?: string;
  /** Current stacks per upgrade (for "owned" counts on cards). */
  stacks?: Partial<Record<UpgradeType, number>>;
  variant?: "default" | "elite";
}

export function UpgradeModal({ options, onPick, title = "CHOOSE UPGRADE", stacks, variant = "default" }: UpgradeModalProps): ReactElement {
=======
}

export function UpgradeModal({ options, onPick }: UpgradeModalProps): ReactElement {
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
  const [picked, setPicked] = useState<UpgradeOption["type"] | null>(null);

  const handlePick = (type: UpgradeOption["type"]) => {
    if (picked) return;
    setPicked(type);
    setTimeout(() => onPick(type), 100);
  };

  return (
    <div className="upgrade-modal">
<<<<<<< HEAD
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
=======
      <div className="upgrade-modal-panel">
        <h2 style={{ fontFamily: "'Luckiest Guy', system-ui, sans-serif", letterSpacing: 2, margin: 0 }}>CHOOSE UPGRADE</h2>
        <div className="upgrade-grid-v2">
          {options.map((option) => {
            const prereq = getUpgradePrerequisiteDescription(option.type);
            return (
            <button
              className={`upgrade-card ${picked === option.type ? "picked" : ""}`}
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
              key={option.type}
              type="button"
              onClick={() => handlePick(option.type)}
              disabled={!!picked}
            >
<<<<<<< HEAD
              <span className="upgrade-rarity-pill">{option.rarity}</span>
              <strong>{option.label}</strong>
              <span>{option.description}</span>
              {ownedLine}
              {prereq ? <span className="upgrade-prereq">Prereq: {prereq}</span> : null}
=======
              <strong>{option.label}</strong>
              <span>{option.description}</span>
              {prereq ? <span style={{ marginTop: 6, opacity: 0.9, color: "#9edfff" }}>Prereq: {prereq}</span> : null}
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
            </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
