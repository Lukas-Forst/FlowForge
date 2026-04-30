import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { EVOLUTION_UPGRADE_TYPES, UPGRADE_OPTIONS } from "../game/constants";
import type { UiSnapshot, UpgradeType } from "../game/types";
import { formatBiomeName } from "./BiomeBadge";
import {
  addXp,
  calculateRunXp,
  loadBestRun,
  loadCaptainProgress,
  loadRunHistory,
  pushRunHistory,
  saveBestRun,
  saveCaptainProgress,
  type BestRun,
  type CaptainProgress,
  type RunRecord,
} from "../game/captainProgress";

interface GameOverScreenProps {
  snapshot: UiSnapshot;
  onRestart: () => void;
}

function getTopUpgrades(snapshot: UiSnapshot, limit: number): string[] {
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

function getEvolutions(snapshot: UiSnapshot): string[] {
  return EVOLUTION_UPGRADE_TYPES.filter((type) => (snapshot.upgrades.stacks[type] ?? 0) > 0).map((type) => UPGRADE_OPTIONS[type].label);
}

function buildRunSummaryText(snapshot: UiSnapshot, topUpgrades: string[], evolutions: string[]): string {
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

function createRunReportImage(
  snapshot: UiSnapshot,
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

  ctx.fillStyle = "#b4dcf6";
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
  const [copyHint, setCopyHint] = useState<string | null>(null);

  // ── Captain progress ──────────────────────────────────────────────
  const [captainProgress, setCaptainProgress] = useState<CaptainProgress>(() => loadCaptainProgress());
  const [bestRun, setBestRun] = useState<BestRun | null>(() => loadBestRun());
  const [runHistory, setRunHistory] = useState<RunRecord[]>(() => loadRunHistory());
  const [levelUpFlash, setLevelUpFlash] = useState<number>(0); // count of levels gained this run
  const [xpGainedThisRun, setXpGainedThisRun] = useState<number>(0);

  // Compute XP and apply progression once on mount
  useMemo(() => {
    const xp = calculateRunXp({
      score: snapshot.stats.score,
      enemiesKilled: snapshot.stats.enemiesKilled,
      timeSurvived: snapshot.stats.timeSurvived,
    });
    const prevProgress = loadCaptainProgress();
    const { progress: updated, levelsGained } = addXp(prevProgress, xp);

    saveCaptainProgress(updated);
    saveBestRun(
      {
        score: snapshot.stats.score,
        timeSurvived: snapshot.stats.timeSurvived,
        enemiesKilled: snapshot.stats.enemiesKilled,
        collectedCoins: snapshot.stats.collectedCoins,
        evolutionsUnlocked: snapshot.stats.evolutionsUnlocked,
      },
      xp,
      updated.captainLevel,
    );
    pushRunHistory(
      {
        score: snapshot.stats.score,
        timeSurvived: snapshot.stats.timeSurvived,
        enemiesKilled: snapshot.stats.enemiesKilled,
        collectedCoins: snapshot.stats.collectedCoins,
        evolutionsUnlocked: snapshot.stats.evolutionsUnlocked,
      },
      xp,
      updated.captainLevel,
    );

    setCaptainProgress(updated);
    setBestRun(loadBestRun());
    setRunHistory(loadRunHistory());
    setXpGainedThisRun(xp);
    if (levelsGained > 0) {
      setLevelUpFlash(levelsGained);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const topUpgrades = useMemo(() => getTopUpgrades(snapshot, 3), [snapshot]);
  const evolutions = useMemo(() => getEvolutions(snapshot), [snapshot]);
  const summaryText = useMemo(() => buildRunSummaryText(snapshot, topUpgrades, evolutions), [snapshot, topUpgrades, evolutions]);
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

  // XP progress within current level
  const xpForNextLevel = captainProgress.captainLevel < 50
    ? captainProgress.captainLevel * captainProgress.captainLevel * 100
    : 1;
  const xpProgress = captainProgress.captainLevel < 50
    ? Math.min(1, captainProgress.captainXp / xpForNextLevel)
    : 1;

  return (
    <div className="overlay center">
      {/* Level-up flash */}
      {levelUpFlash > 0 ? (
        <div className="levelup-flash-overlay">
          <div className="levelup-flash-text">
            ⬆️ LEVEL UP! {captainProgress.title} — Level {captainProgress.captainLevel}
          </div>
        </div>
      ) : null}

      <div className="panel" style={{ textAlign: "center", minWidth: "360px" }}>
        <h2>{isNewRecord ? "🎉 NEW RECORD! 🎉" : "Ship Sunk"}</h2>

        {/* Captain meta-progression panel */}
        <div className="captain-meta-panel">
          <div className="captain-level-row">
            <span className="captain-title-label">{captainProgress.title}</span>
            <span className="captain-level-badge">Lv. {captainProgress.captainLevel}</span>
          </div>
          <div className="captain-xp-bar">
            <div
              className="captain-xp-bar-fill"
              style={{ width: `${Math.round(xpProgress * 100)}%` }}
            />
          </div>
          <div className="captain-xp-label">
            {captainProgress.captainXp} / {xpForNextLevel} XP
            {captainProgress.captainLevel >= 50 ? " — MAX LEVEL!" : ""}
          </div>
        </div>

        {/* Run summary */}
        <div className="run-summary-panel">
          <div className="run-summary-title">📋 Run Summary</div>
          <div className="run-summary-stats">
            <div className="run-stat-row">
              <span>⏱️ Time</span>
              <span>{snapshot.stats.timeSurvived.toFixed(1)}s</span>
            </div>
            <div className="run-stat-row">
              <span>☠️ Kills</span>
              <span>{snapshot.stats.enemiesKilled}</span>
            </div>
            <div className="run-stat-row">
              <span>💎 Score</span>
              <span>{snapshot.stats.score.toLocaleString()}</span>
            </div>
            <div className="run-stat-row xp-earned">
              <span>⭐ XP Earned</span>
              <span>+{xpGainedThisRun}</span>
            </div>
          </div>
        </div>

        {/* vs Best run */}
        {bestRun ? (
          <div className="best-run-panel">
            <div className="best-run-title">🏆 Best Run</div>
            <div className="run-summary-stats">
              <div className="run-stat-row">
                <span>Score</span>
                <span>{bestRun.score.toLocaleString()}</span>
              </div>
              <div className="run-stat-row">
                <span>Time</span>
                <span>{bestRun.timeSurvived.toFixed(1)}s</span>
              </div>
              <div className="run-stat-row">
                <span>Kills</span>
                <span>{bestRun.enemiesKilled}</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Run history — last 5 runs */}
        {runHistory.length > 1 ? (
          <div className="run-history-panel">
            <div className="run-history-title">📜 Past Runs</div>
            <div className="run-history-list">
              {runHistory.slice(1, 6).map((run, i) => {
                const date = new Date(run.date);
                const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                return (
                  <div key={i} className="run-history-row">
                    <span className="run-history-label">{label}</span>
                    <span className="run-history-score">{run.score.toLocaleString()}</span>
                    <span className="run-history-time">{run.timeSurvived.toFixed(0)}s</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="gameover-actions">
          <button type="button" className="legendary-share-btn" onClick={openReport}>
            Share Your Legendary Run
          </button>
          <button type="button" onClick={() => void copySummary()}>
            Copy run summary
          </button>
          {copyHint ? <p className="hint" style={{ margin: 0 }}>{copyHint}</p> : null}
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
