import type { ReactElement } from "react";
import type { UpgradeOption } from "../game/types";

interface UpgradeModalProps {
  options: UpgradeOption[];
  onPick: (type: UpgradeOption["type"]) => void;
}

export function UpgradeModal({ options, onPick }: UpgradeModalProps): ReactElement {
  return (
    <div className="overlay center">
      <div className="panel">
        <h2>Choose Upgrade</h2>
        <p className="hint">The battle pauses until you pick one.</p>
        <div className="upgrade-grid">
          {options.map((option) => (
            <button
              className="upgrade-choice"
              key={option.type}
              type="button"
              onClick={() => onPick(option.type)}
            >
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
