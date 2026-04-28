import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { EVOLUTION_UPGRADE_TYPES, UPGRADE_OPTIONS } from "../game/constants";
import type { GameSnapshot, UpgradeType } from "../game/types";
<<<<<<< HEAD
import { formatBiomeName } from "./BiomeBadge";
=======
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo

interface GameOverScreenProps {
  snapshot: GameSnapshot;
  onRestart: () => void;
}

function getTopUpgrades(snapshot: GameSnapshot, limit: number): string[] {
  return (Object.keys(snapshot.upgrades.stacks) as UpgradeType[])
    .filter((type) => (snapshot.upgrades.stacks[type] ?? 0) > 0)
    .sort((a, b) => {
      const stackDiff = (snapshot.upgrades.stacks[b] ?? 0) - (snapshot.upgrades.stacks[a] ?? 0);
      if (stackDiff !== 0) return stackDiff;
      return UPGRADE_OPTIONS[a].label.localeCompare(UPGRADE_OPTIONS[b].label);
    })
    .slice(0, limit)
    .map((type) => `${UPGRADE_OPTIONS[type].label} x${snapshot.upgrades.stacks[type] ?? 0}`);
}

function getEvolutions(snapshot: GameSnapshot): string[] {
  return EVOLUTION_UPGRADE_TYPES.filter((type) => (snapshot.upgrades.stacks[type] ?? 0) > 0).map((type) => UPGRADE_OPTIONS[type].label);
}

<<<<<<< HEAD
function buildRunSummaryText(snapshot: GameSnapshot, topUpgrades: string[], evolutions: string[]): string {
  const lines = [
    `FlowForge run`,
    `Score: ${snapshot.stats.score}`,
    `Time: ${snapshot.stats.timeSurvived.toFixed(1)}s`,
    `Kills: ${snapshot.stats.enemiesKilled}`,
    `Coins: ${snapshot.stats.collectedCoins}`,
    `Evolutions: ${snapshot.stats.evolutionsUnlocked}`,
    `Region: ${formatBiomeName(snapshot.runBiome)}`,
    `Unscathed streak (best): ${snapshot.stats.longestUnscathedStreak.toFixed(1)}s`,
    `Biggest hit: ${snapshot.stats.biggestHit.toFixed(0)}`,
    `Top upgrades: ${topUpgrades.length ? topUpgrades.join("; ") : "—"}`,
    `Evolution path: ${evolutions.length ? evolutions.join(", ") : "—"}`,
  ];
  return lines.join("\n");
}

=======
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
function createRunReportImage(
  snapshot: GameSnapshot,
  topEvolution: string,
  topUpgrades: string[],
  evolutions: string[],
): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, "#0c3b5d");
  bg.addColorStop(0.58, "#0a2942");
  bg.addColorStop(1, "#041522");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalAlpha = 0.24;
  for (let i = 0; i < 36; i += 1) {
    const x = (i * 91) % canvas.width;
    const y = (i * 57) % canvas.height;
    const r = 28 + (i % 6) * 10;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? "#6fd1ff" : "#89ffca";
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#e8f6ff";
  ctx.font = "700 50px Inter, sans-serif";
  ctx.fillText("FlowForge - Legendary Run", 56, 88);

  ctx.fillStyle = "#b4ddf6";
  ctx.font = "500 28px Inter, sans-serif";
  ctx.fillText("Vibe Report", 56, 126);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 70px Inter, sans-serif";
  ctx.fillText(`Score: ${snapshot.stats.score}`, 56, 220);

  ctx.font = "600 30px Inter, sans-serif";
  ctx.fillText(`Time Survived: ${snapshot.stats.timeSurvived.toFixed(1)}s`, 56, 282);
  ctx.fillText(`Enemies Sunk: ${snapshot.stats.enemiesKilled}`, 56, 324);
  ctx.fillText(`Loot Collected: ${snapshot.stats.collectedCoins}`, 56, 366);
  ctx.fillText(`Evolutions: ${snapshot.stats.evolutionsUnlocked}`, 56, 408);

  ctx.fillStyle = "#8ff3ff";
  ctx.font = "600 28px Inter, sans-serif";
  ctx.fillText(`Top Evolution: ${topEvolution}`, 56, 458);

  ctx.fillStyle = "#ffe7a7";
  ctx.font = "700 30px Inter, sans-serif";
  ctx.fillText("Top Upgrades", 760, 172);
  ctx.fillStyle = "#fffaf0";
  ctx.font = "500 26px Inter, sans-serif";
  topUpgrades.forEach((item, index) => {
    ctx.fillText(`${index + 1}. ${item}`, 760, 218 + index * 42);
  });

  ctx.fillStyle = "#9be8ff";
  ctx.font = "600 24px Inter, sans-serif";
  ctx.fillText(`Evolution Path: ${evolutions.length > 0 ? evolutions.join(", ") : "None this run"}`, 56, 522);

  ctx.fillStyle = "#9dffcd";
  ctx.font = "700 26px Inter, sans-serif";
  ctx.fillText("Ocean Reaver Badge", 760, 466);
  ctx.strokeStyle = "#84ffd4";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(845, 534, 54, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#84ffd4";
  ctx.font = "700 46px Inter, sans-serif";
  ctx.fillText("🌊", 820, 548);

  return canvas.toDataURL("image/png");
}

export function GameOverScreen({ snapshot, onRestart }: GameOverScreenProps): ReactElement {
  const best = Number(localStorage.getItem("flowforge.best") || 0);
  const isNewRecord = snapshot.stats.score >= best && snapshot.stats.score > 0;
  const [showReport, setShowReport] = useState(false);
  const [reportImageUrl, setReportImageUrl] = useState<string>("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
<<<<<<< HEAD
  const [copyHint, setCopyHint] = useState<string | null>(null);

  const topUpgrades = useMemo(() => getTopUpgrades(snapshot, 3), [snapshot]);
  const evolutions = useMemo(() => getEvolutions(snapshot), [snapshot]);
  const summaryText = useMemo(() => buildRunSummaryText(snapshot, topUpgrades, evolutions), [snapshot, topUpgrades, evolutions]);
=======

  const topUpgrades = useMemo(() => getTopUpgrades(snapshot, 3), [snapshot]);
  const evolutions = useMemo(() => getEvolutions(snapshot), [snapshot]);
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
  const topEvolution = evolutions[0] ?? "No Evolution";

  const tweetText = useMemo(
    () =>
      `I survived ${snapshot.stats.timeSurvived.toFixed(1)}s in FlowForge with ${topEvolution}! Score: ${snapshot.stats.score} 🌊 #vibejam ${window.location.origin}`,
    [snapshot.stats.score, snapshot.stats.timeSurvived, topEvolution],
  );

  const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  const openReport = (): void => {
    setShowReport(true);
    if (reportImageUrl || isGeneratingImage) return;
    setIsGeneratingImage(true);
    const image = createRunReportImage(snapshot, topEvolution, topUpgrades, evolutions);
    setReportImageUrl(image);
    setIsGeneratingImage(false);
  };

<<<<<<< HEAD
  const copySummary = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyHint("Copied to clipboard");
      window.setTimeout(() => setCopyHint(null), 2000);
    } catch {
      setCopyHint("Copy blocked — select text in the share modal instead");
      window.setTimeout(() => setCopyHint(null), 3200);
    }
  };

=======
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
  return (
    <div className="overlay center">
      <div className="panel" style={{ textAlign: "center", minWidth: "360px" }}>
        <h2>{isNewRecord ? "🎉 NEW RECORD! 🎉" : "Ship Sunk"}</h2>
        <div style={{ background: "rgba(0,0,0,0.1)", padding: "12px", borderRadius: "8px", margin: "12px 0" }}>
          <p style={{ margin: "4px 0" }}>Final Score: <strong style={{ fontSize: "1.2em" }}>{snapshot.stats.score}</strong></p>
<<<<<<< HEAD
          <p style={{ margin: "4px 0", fontSize: "0.85em", color: "#ddd" }}>
            floor(time×100 + kills×25 + coins×2 + evolutions×500)
          </p>
=======
          <p style={{ margin: "4px 0", fontSize: "0.9em", color: "#ddd" }}>(Floor Time) + (10 × Kills) + (2 × Coins)</p>
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
        </div>

        <div style={{ textAlign: "left", fontSize: "0.95em", margin: "16px 0", lineHeight: "1.6" }}>
          <p style={{ margin: "4px 0" }}>⏱️ Time Survived: <strong>{snapshot.stats.timeSurvived.toFixed(1)}s</strong></p>
          <p style={{ margin: "4px 0" }}>☠️ Enemies Sunk: <strong>{snapshot.stats.enemiesKilled}</strong></p>
          <p style={{ margin: "4px 0" }}>💎 Loot Collected: <strong>{snapshot.stats.collectedCoins}</strong></p>
<<<<<<< HEAD
          <p style={{ margin: "4px 0" }}>🧭 Last region: <strong>{formatBiomeName(snapshot.runBiome)}</strong></p>
          <p style={{ margin: "4px 0" }}>🧬 Evolutions this run: <strong>{snapshot.stats.evolutionsUnlocked}</strong></p>
=======
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
          <p style={{ margin: "4px 0", color: "#fbbf24" }}>🛡️ Unscathed Streak: <strong>{snapshot.stats.longestUnscathedStreak.toFixed(1)}s</strong></p>
          <p style={{ margin: "4px 0", color: "#ef4444" }}>💥 Biggest Hit Dealt: <strong>{snapshot.stats.biggestHit.toFixed(0)}</strong></p>
        </div>
        <div className="gameover-actions">
          <button type="button" className="legendary-share-btn" onClick={openReport}>
            Share Your Legendary Run
          </button>
<<<<<<< HEAD
          <button type="button" onClick={() => void copySummary()}>
            Copy run summary
          </button>
          {copyHint ? <p className="hint" style={{ margin: 0 }}>{copyHint}</p> : null}
=======
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
          <button type="button" onClick={onRestart}>
            Restart Run
          </button>
        </div>
      </div>
      {showReport ? (
        <div className="vibe-report-modal-backdrop" onClick={() => setShowReport(false)}>
          <div className="vibe-report-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Vibe Report</h3>
            <div className="vibe-report-grid">
              <p>⏱️ Time Survived: <strong>{snapshot.stats.timeSurvived.toFixed(1)}s</strong></p>
              <p>☠️ Enemies Sunk: <strong>{snapshot.stats.enemiesKilled}</strong></p>
              <p>💎 Loot Collected: <strong>{snapshot.stats.collectedCoins}</strong></p>
              <p>🧬 Evolutions Unlocked: <strong>{snapshot.stats.evolutionsUnlocked}</strong></p>
            </div>
            <p className="vibe-report-section-title">Top 3 Upgrades</p>
            <ul className="vibe-report-list">
              {topUpgrades.length > 0 ? topUpgrades.map((upgrade) => <li key={upgrade}>{upgrade}</li>) : <li>No upgrades recorded</li>}
            </ul>
            <p className="vibe-report-section-title">Evolution(s)</p>
            <p>{evolutions.length > 0 ? evolutions.join(", ") : "None this run"}</p>
            <div className="ocean-badge">🌊 Ocean Reaver 🌊</div>
            {isGeneratingImage ? (
              <p>Generating report image...</p>
            ) : reportImageUrl ? (
              <img className="vibe-report-image" src={reportImageUrl} alt="FlowForge run report" />
            ) : null}
            <div className="vibe-report-actions">
              <button type="button" onClick={() => window.open(tweetUrl, "_blank", "noopener,noreferrer")}>
                Post to X
              </button>
              <button type="button" onClick={() => setShowReport(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
