import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import PartySocket from "partysocket";
import { createAudioManager } from "./audio/AudioManager";
import { AssetPreloader } from "./assets/AssetPreloader";
import { useGameState } from "./game/useGameState";
import type { MovementKey, MultiplayerPeerState, MultiplayerWorldState } from "./game/types";
import { ScreenFlash } from "./scene/fx/ScreenFlash";
import { GameScene } from "./scene/GameScene";
import { GameOverScreen } from "./ui/GameOverScreen";
import { Hud } from "./ui/Hud";
import { PauseScreen } from "./ui/PauseScreen";
import { LevelUpRibbon } from "./ui/LevelUpRibbon";
import { SplashScreen } from "./ui/SplashScreen";
import { StartScreen } from "./ui/StartScreen";
import { ControlsHelpModal } from "./ui/ControlsHelpModal";
import { TutorialOverlay } from "./ui/TutorialOverlay";
import { UpgradeModal } from "./ui/UpgradeModal";

const MOVEMENT_KEYS: Record<string, MovementKey> = {
  w: "w",
  a: "a",
  s: "s",
  d: "d",
};

function isRecognizedAbilityKey(code: string): boolean {
  return code === "Space" || code === "ShiftLeft" || code === "ShiftRight" || code === "KeyE";
}

type NetMode = "solo" | "host" | "client";

type PartyBroadcastState = {
  type: "state";
  hostId: string | null;
  players: MultiplayerPeerState[];
  world: MultiplayerWorldState | null;
};

interface MultiplayerUiState {
  mode: NetMode;
  roomCode: string;
  connected: boolean;
  status: string | null;
  players: MultiplayerPeerState[];
}

const PARTYKIT_HOST = (import.meta.env.VITE_PARTYKIT_HOST as string | undefined) ?? "";
const PARTYKIT_PARTY = (import.meta.env.VITE_PARTYKIT_PARTY as string | undefined) ?? "main";

function makeRoomCode(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

function makeProfile(name: string): Pick<MultiplayerPeerState, "name" | "emoji" | "color"> {
  const emojiPool = ["🚢", "⛵", "🛥️", "🚤", "🦀", "🐬"];
  const hue = Math.floor(Math.random() * 360);
  return {
    name: name.slice(0, 18),
    emoji: emojiPool[Math.floor(Math.random() * emojiPool.length)] ?? "🚢",
    color: `hsl(${hue}deg 86% 62%)`,
  };
}

function parsePartyStateMessage(raw: string): PartyBroadcastState | null {
  try {
    const data = JSON.parse(raw) as PartyBroadcastState;
    if (!data || data.type !== "state" || !Array.isArray(data.players)) return null;
    return data;
  } catch {
    return null;
  }
}

function buildVibePortalUrl(snapshot: ReturnType<typeof useGameState>["snapshot"]): string {
  const url = new URL("https://vibej.am/portal/2026");
  const boostedSpeed = snapshot.cooldowns.boostActiveRemaining > 0 ? 3.1 : 1;
  const speed = snapshot.player.baseSpeed * snapshot.upgrades.speedMult * boostedSpeed;
  const hpPct = snapshot.player.maxHp > 0 ? Math.max(1, Math.round((snapshot.player.hp / snapshot.player.maxHp) * 100)) : 100;
  url.searchParams.set("username", "flowforge-captain");
  url.searchParams.set("color", "green");
  url.searchParams.set("speed", speed.toFixed(2));
  url.searchParams.set("hp", hpPct.toString());
  url.searchParams.set("ref", window.location.hostname);
  return url.toString();
}

export default function App(): ReactElement {
  const {
    snapshot,
    startRun,
    restartRun,
    setMovementKey,
    triggerCannon,
    triggerBoost,
    triggerExtra,
    chooseUpgrade,
    togglePause,
    quitRun,
    tick,
    applyMultiplayerWorld,
    finishLoading,
    setLoadingProgress,
    consumeAudioEvents,
  } = useGameState();

  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioMgrRef = useRef<ReturnType<typeof createAudioManager> | null>(null);
  const levelRef = useRef(0);
  const portalOpenedRef = useRef(false);
  const portalPreloadedRef = useRef(false);
  const portalIframeRef = useRef<HTMLIFrameElement | null>(null);
  const socketRef = useRef<PartySocket | null>(null);
  const clientIdRef = useRef<string>("");
  const localProfileRef = useRef<Pick<MultiplayerPeerState, "name" | "emoji" | "color"> | null>(null);
  const netSendTimerRef = useRef(0);
  const multiplayerRef = useRef<MultiplayerUiState>({
    mode: "solo",
    roomCode: "",
    connected: false,
    status: null,
    players: [],
  });
  const [multiplayer, setMultiplayer] = useState<MultiplayerUiState>({
    mode: "solo",
    roomCode: "",
    connected: false,
    status: null,
    players: [],
  });
  const [showTutorial, setShowTutorial] = useState<boolean>(() => {
    try {
      return localStorage.getItem("hasSeenTutorial") !== "true";
    } catch {
      return true;
    }
  });
  const [showControlsHelp, setShowControlsHelp] = useState(false);
  const [flashSignal, setFlashSignal] = useState(0);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const showTutorialRef = useRef(showTutorial);
  showTutorialRef.current = showTutorial;
  const showControlsHelpRef = useRef(showControlsHelp);
  showControlsHelpRef.current = showControlsHelp;

  useEffect(() => {
    multiplayerRef.current = multiplayer;
  }, [multiplayer]);

  useEffect(() => {
    if (snapshot.upgrades.level !== levelRef.current) {
      levelRef.current = snapshot.upgrades.level;
      setFlashSignal((n) => n + 1);
    }
  }, [snapshot.upgrades.level]);

  useEffect(() => {
    const clearMovement = (): void => {
      setMovementKey("w", false);
      setMovementKey("a", false);
      setMovementKey("s", false);
      setMovementKey("d", false);
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (showControlsHelp) {
        if (!event.repeat && (event.code === "Escape" || event.code === "KeyP")) {
          event.preventDefault();
          setShowControlsHelp(false);
        }
        return;
      }

      const wantsControlsHelp =
        event.code === "F1" || event.key === "?" || (event.shiftKey && event.code === "Slash");
      if (wantsControlsHelp && !event.repeat) {
        const phaseOk =
          snapshot.phase === "start" ||
          snapshot.phase === "playing" ||
          snapshot.phase === "paused" ||
          snapshot.phase === "upgrade" ||
          snapshot.phase === "gameover";
        if (phaseOk) {
          event.preventDefault();
          setShowControlsHelp((open) => !open);
          return;
        }
      }

      const movement = MOVEMENT_KEYS[event.key.toLowerCase()];
      if (movement) {
        setMovementKey(movement, true);
        return;
      }

      if (event.code === "Space" && !event.repeat) {
        event.preventDefault();
        triggerCannon();
        return;
      }

      if ((event.code === "ShiftLeft" || event.code === "ShiftRight") && !event.repeat) {
        triggerBoost();
        return;
      }

      if (event.code === "KeyE" && !event.repeat) {
        triggerExtra();
        return;
      }

      if (event.code === "Escape" || event.code === "KeyP") {
        if (!event.repeat) {
          if (!(showTutorial && snapshot.phase === "playing")) {
            togglePause();
          }
        }
        return;
      }

      if (isRecognizedAbilityKey(event.code)) {
        return;
      }

      if (snapshot.phase === "start" && event.code === "Enter") {
        startRun();
      }
      if (snapshot.phase === "gameover" && event.code === "Enter") {
        restartRun();
      }
    };

    const onKeyUp = (event: KeyboardEvent): void => {
      const movement = MOVEMENT_KEYS[event.key.toLowerCase()];
      if (movement) {
        setMovementKey(movement, false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearMovement);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearMovement);
    };
  }, [
    restartRun,
    setMovementKey,
    showControlsHelp,
    showTutorial,
    snapshot.phase,
    startRun,
    togglePause,
    triggerBoost,
    triggerCannon,
    triggerExtra,
  ]);

  useEffect(() => {
    const kick = () => {
      if (!audioCtxRef.current) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctor();
        audioCtxRef.current = ctx;
        audioMgrRef.current = createAudioManager(ctx);
      } else if (audioCtxRef.current.state === "suspended") {
        void audioCtxRef.current.resume();
      }
    };
    window.addEventListener("keydown", kick);
    window.addEventListener("pointerdown", kick);
    return () => {
      window.removeEventListener("keydown", kick);
      window.removeEventListener("pointerdown", kick);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const frame = (now: number): void => {
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      const snap = snapshotRef.current;
      const simBlockedByUi =
        (showTutorialRef.current && snap.phase === "playing") ||
        (showControlsHelpRef.current && (snap.phase === "playing" || snap.phase === "upgrade"));
      if (!simBlockedByUi) {
        tick(delta);
      }
      const mgr = audioMgrRef.current;
      if (mgr) {
        mgr.drain(consumeAudioEvents(), snap.player.position.x);
        mgr.updateMusic(snap);
      }

      netSendTimerRef.current += delta;
      if (netSendTimerRef.current >= 0.1) {
        netSendTimerRef.current = 0;
        const socket = socketRef.current;
        const net = multiplayerRef.current;
        const profile = localProfileRef.current;
        const isOpen = socket?.readyState === WebSocket.OPEN;
        if (socket && isOpen && profile && net.mode !== "solo") {
          const latest = snapshotRef.current;
          const basePlayer: Omit<MultiplayerPeerState, "id"> = {
            ...profile,
            position: { ...latest.player.position },
            facing: latest.player.facing,
            hp: latest.player.hp,
            upgradeLevel: latest.upgrades.level,
          };
          socket.send(JSON.stringify({ type: "player_update", player: basePlayer }));
          if (net.mode === "host") {
            const world: MultiplayerWorldState = {
              runClock: { ...latest.runClock },
              runBiome: latest.runBiome,
              spawnIntensity: latest.spawnIntensity,
              enemies: latest.enemies.map((enemy) => ({
                ...enemy,
                position: { ...enemy.position },
              })),
              pickups: latest.pickups.map((pickup) => ({
                ...pickup,
                position: { ...pickup.position },
              })),
              sharedCoins: latest.stats.collectedCoins,
            };
            socket.send(JSON.stringify({ type: "world_update", world, hostPlayer: basePlayer }));
          }
        }
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [consumeAudioEvents, tick]);

  useEffect(() => {
    if (snapshot.phase === "start" || snapshot.phase === "loading") {
      portalOpenedRef.current = false;
      portalPreloadedRef.current = false;
      if (portalIframeRef.current) {
        portalIframeRef.current.remove();
        portalIframeRef.current = null;
      }
    }

    if (snapshot.vibePortal.visible && !portalPreloadedRef.current) {
      const iframe = document.createElement("iframe");
      iframe.src = buildVibePortalUrl(snapshot);
      iframe.style.position = "absolute";
      iframe.style.width = "1px";
      iframe.style.height = "1px";
      iframe.style.opacity = "0";
      iframe.style.pointerEvents = "none";
      iframe.style.left = "-9999px";
      iframe.style.top = "-9999px";
      iframe.setAttribute("aria-hidden", "true");
      document.body.appendChild(iframe);
      portalIframeRef.current = iframe;
      portalPreloadedRef.current = true;
    }

    if (snapshot.vibePortal.triggered && !portalOpenedRef.current) {
      portalOpenedRef.current = true;
      const targetUrl = buildVibePortalUrl(snapshot);
      const popup = window.open(targetUrl, "_blank", "noopener,noreferrer");
      if (!popup) {
        window.location.href = targetUrl;
      }
    }
  }, [snapshot]);

  useEffect(() => {
    return () => {
      if (portalIframeRef.current) {
        portalIframeRef.current.remove();
        portalIframeRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, []);

  // Start/stop procedural music with run phase
  useEffect(() => {
    const mgr = audioMgrRef.current;
    if (!mgr) return;
    if (snapshot.phase === "playing" || snapshot.phase === "upgrade" || snapshot.phase === "paused") {
      mgr.startMusic();
    } else {
      mgr.stopMusic();
    }
  }, [snapshot.phase]);

  const finishTutorial = (): void => {
    try {
      localStorage.setItem("hasSeenTutorial", "true");
    } catch {
      // Ignore storage failures and continue.
    }
    setShowTutorial(false);
  };

  const resetTutorialPreference = (): void => {
    try {
      localStorage.removeItem("hasSeenTutorial");
    } catch {
      /* ignore */
    }
    setShowTutorial(true);
    setShowControlsHelp(false);
  };

  const disconnectParty = (): void => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  };

  const connectParty = (mode: Exclude<NetMode, "solo">, roomCode: string, captainName: string): void => {
    if (!PARTYKIT_HOST) {
      setMultiplayer({
        mode: "solo",
        roomCode: "",
        connected: false,
        status: "No PartyKit host configured. Falling back to solo.",
        players: [],
      });
      return;
    }

    disconnectParty();
    const id = `ff-${crypto.randomUUID()}`;
    clientIdRef.current = id;
    localProfileRef.current = makeProfile(captainName);
    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomCode,
      party: PARTYKIT_PARTY,
      id,
    });
    socketRef.current = socket;

    setMultiplayer({
      mode,
      roomCode,
      connected: false,
      status: mode === "host" ? `Creating lobby ${roomCode}...` : `Joining lobby ${roomCode}...`,
      players: [],
    });

    socket.addEventListener("open", () => {
      const profile = localProfileRef.current;
      if (profile) {
        socket.send(JSON.stringify({ type: "hello", name: profile.name, color: profile.color, emoji: profile.emoji }));
      }
      setMultiplayer((prev) => ({
        ...prev,
        connected: true,
        status: mode === "host" ? `Lobby ${roomCode} ready. Share this code.` : `Connected to lobby ${roomCode}.`,
      }));
    });

    socket.addEventListener("message", (event) => {
      const parsed = parsePartyStateMessage(typeof event.data === "string" ? event.data : "");
      if (!parsed) return;
      setMultiplayer((prev) => ({
        ...prev,
        mode: parsed.hostId === clientIdRef.current ? "host" : "client",
        connected: true,
        players: parsed.players,
        status: `Lobby ${roomCode} • ${parsed.players.length}/4 captains`,
      }));
      if (parsed.world && parsed.hostId !== clientIdRef.current) {
        applyMultiplayerWorld(parsed.world);
      }
    });

    socket.addEventListener("close", () => {
      if (multiplayerRef.current.mode !== "solo") {
        setMultiplayer({
          mode: "solo",
          roomCode: "",
          connected: false,
          status: "Connection dropped. Continued in solo mode.",
          players: [],
        });
      }
      socketRef.current = null;
    });

    socket.addEventListener("error", () => {
      setMultiplayer((prev) => ({
        ...prev,
        status: "Network issue. If this persists, play solo.",
      }));
    });
  };

  const handlePlaySolo = (): void => {
    disconnectParty();
    setMultiplayer({
      mode: "solo",
      roomCode: "",
      connected: false,
      status: null,
      players: [],
    });
    localProfileRef.current = null;
    startRun();
  };

  const handleCreateLobby = (name: string): void => {
    const roomCode = makeRoomCode();
    connectParty("host", roomCode, name || "Captain");
    startRun();
  };

  const handleJoinLobby = (roomCodeRaw: string, name: string): void => {
    const roomCode = roomCodeRaw.trim().toUpperCase();
    if (!roomCode) {
      setMultiplayer((prev) => ({ ...prev, status: "Enter a lobby code first." }));
      return;
    }
    connectParty("client", roomCode, name || "Captain");
    startRun();
  };

  const remotePlayers = useMemo(
    () => multiplayer.players.filter((player) => player.id !== clientIdRef.current),
    [multiplayer.players],
  );
  const localPlayerBadge = useMemo(() => {
    const localFromRoom = multiplayer.players.find((player) => player.id === clientIdRef.current);
    if (localFromRoom) return localFromRoom;
    if (localProfileRef.current && multiplayer.mode !== "solo") {
      return {
        id: clientIdRef.current || "local",
        ...localProfileRef.current,
        position: { ...snapshot.player.position },
        facing: snapshot.player.facing,
        hp: snapshot.player.hp,
        upgradeLevel: snapshot.upgrades.level,
      };
    }
    return null;
  }, [multiplayer.mode, multiplayer.players, snapshot.player.facing, snapshot.player.hp, snapshot.player.position, snapshot.upgrades.level]);

  return (
    <div className="app-shell">
      {snapshot.phase === "loading" ? (
        <>
          <AssetPreloader tier="critical" onProgress={setLoadingProgress} onComplete={finishLoading} />
          <SplashScreen loading={snapshot.loading} />
        </>
      ) : (
        <>
          <GameScene snapshot={snapshot} remotePlayers={remotePlayers} localPlayerBadge={localPlayerBadge} />
          {showTutorial && snapshot.phase === "playing" ? <TutorialOverlay onFinish={finishTutorial} /> : null}
          {showControlsHelp ? (
            <ControlsHelpModal onClose={() => setShowControlsHelp(false)} onResetTutorial={resetTutorialPreference} />
          ) : null}
          <ScreenFlash signal={flashSignal} />
          <LevelUpRibbon signal={flashSignal} />
          {(snapshot.phase === "playing" || snapshot.phase === "upgrade" || snapshot.phase === "paused") && <Hud snapshot={snapshot} />}
          {snapshot.phase === "start" && (
            <>
              <AssetPreloader tier="biome" />
              <StartScreen
                onPlaySolo={handlePlaySolo}
                onCreateLobby={handleCreateLobby}
                onJoinLobby={handleJoinLobby}
                connectionStatus={multiplayer.status}
              />
            </>
          )}
          {snapshot.phase === "playing" && <AssetPreloader tier="deferred" />}
          {snapshot.phase === "paused" && (
            <PauseScreen
              snapshot={snapshot}
              onResume={togglePause}
              onQuit={quitRun}
              onShowControls={() => setShowControlsHelp(true)}
            />
          )}
          {snapshot.phase === "upgrade" && (
            <UpgradeModal
              options={snapshot.pendingUpgradeOptions}
              onPick={chooseUpgrade}
              stacks={snapshot.upgrades.stacks}
              upgrades={snapshot.upgrades}
              title={snapshot.pendingUpgradeContext === "eliteExtra" ? "ELITE SPOILS - CHOOSE E ABILITY" : "CHOOSE UPGRADE"}
              variant={snapshot.pendingUpgradeContext === "eliteExtra" ? "elite" : "default"}
            />
          )}
          {snapshot.phase === "gameover" && <GameOverScreen snapshot={snapshot} onRestart={restartRun} />}
        </>
      )}
    </div>
  );
}
