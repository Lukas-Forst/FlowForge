import type { ReactElement } from "react";
import { useState } from "react";
import { getUpgradeDeltaLabel, getUpgradePrerequisiteDescription } from "../game/systems/upgrades";
import type { UpgradeOption, UpgradeStats, UpgradeType } from "../game/types";

interface UpgradeModalProps {
  options: UpgradeOption[];
  onPick: (type: UpgradeOption["type"]) => void;
  title?: string;
  /** Current stacks per upgrade (for "owned" counts on cards). */
  stacks?: Partial<Record<UpgradeType, number>>;
  /** Full upgrade stats for delta calculation. */
  upgrades?: UpgradeStats;
  variant?: "default" | "elite";
}

/** Emoji type-indicators shown above the card title */
const TYPE_EMOJI: Partial<Record<UpgradeType, string>> = {
  fireRate: "🔥",
  speed: "⚡",
  armor: "🛡️",
  maxHp: "💚",
  cooldown: "⏱️",
  pierce: "🎯",
  projectileCount: "🎯",
  sideGuns: "💥",
  coinMagnet: "🧲",
  boostRepeat: "🌬️",
  ringBarrage: "💍",
  cannonSpread: "💫",
  fullSteam: "🚂",
  grapeshot: "🍇",
  sternChaser: "↩️",
  explosiveRounds: "💣",
  ramProw: "⚡",
  ghostHull: "👻",
  afterburner: "🔥",
  bilgePump: "🩸",
  scavenger: "🦜",
  sacrificeRig: "⚰️",
  deepDredge: "⚓",
  crowsNest: "🐦",
  pressGang: "🏴",
  deathBlossom: "🌹",
  ghostTide: "🌊",
  ironclad: "🔩",
  tidalSweep: "🌀",
  hellfireWake: "😈",
  krakenCall: "🐙",
  phantomFleet: "🚢",
  cannonDrones: "🤖",
  cannonFlare: "✨",
  cannonChainShot: "⛓️",
  boostMines: "💥",
  boostRingBarrage: "💍",
  boostAnchorDrop: "⚓",
  extraTorpedo: "🚀",
  extraDepthCharge: "💣",
  extraOilSlick: "🛢️",
};

export function UpgradeModal({ options, onPick, title = "CHOOSE UPGRADE", stacks, upgrades, variant = "default" }: UpgradeModalProps): ReactElement {
  const [picked, setPicked] = useState<UpgradeOption["type"] | null>(null);
  const [hovered, setHovered] = useState<UpgradeOption["type"] | null>(null);

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

            const deltaLabel = upgrades ? getUpgradeDeltaLabel(option.type, owned, upgrades) : null;
            const showTooltip = hovered === option.type && deltaLabel;

            return (
              <button
                className={`upgrade-card upgrade-card--${option.rarity} ${picked === option.type ? "picked" : ""}`}
                key={option.type}
                type="button"
                onClick={() => handlePick(option.type)}
                onMouseEnter={() => setHovered(option.type)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(option.type)}
                onBlur={() => setHovered(null)}
                disabled={!!picked}
              >
                {option.icon ? <span className="upgrade-icon">{option.icon}</span> : null}
                <span className="upgrade-rarity-pill">{option.rarity}</span>
                {TYPE_EMOJI[option.type] ? <span className="upgrade-type-emoji">{TYPE_EMOJI[option.type]}</span> : null}
                <strong>{option.label}</strong>
                <span>{option.description}</span>
                {ownedLine}
                {prereq ? <span className="upgrade-prereq">Prereq: {prereq}</span> : null}
                {showTooltip && (
                  <span className="upgrade-tooltip-delta">{deltaLabel}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}