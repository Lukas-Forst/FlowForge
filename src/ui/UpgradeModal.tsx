import type { ReactElement } from "react";
import { useState } from "react";
import type { UpgradeOption } from "../game/types";

interface UpgradeModalProps {
  options: UpgradeOption[];
  onPick: (type: UpgradeOption["type"]) => void;
}

export function UpgradeModal({ options, onPick }: UpgradeModalProps): ReactElement {
  const [picked, setPicked] = useState<UpgradeOption["type"] | null>(null);

  const handlePick = (type: UpgradeOption["type"]) => {
    if (picked) return;
    setPicked(type);
    setTimeout(() => onPick(type), 100);
  };

  return (
    <div className="upgrade-modal">
      <div className="upgrade-modal-panel">
        <h2 style={{ fontFamily: "'Luckiest Guy', system-ui, sans-serif", letterSpacing: 2, margin: 0 }}>CHOOSE UPGRADE</h2>
        <div className="upgrade-grid-v2">
          {options.map((option) => (
            <button
              className={`upgrade-card ${picked === option.type ? "picked" : ""}`}
              key={option.type}
              type="button"
              onClick={() => handlePick(option.type)}
              disabled={!!picked}
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
