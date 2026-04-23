type Vec2 = { x: number; y: number };

type PeerState = {
  id: string;
  name: string;
  color: string;
  emoji: string;
  position: Vec2;
  facing: number;
  hp: number;
  upgradeLevel: number;
};

type EnemyState = {
  id: number;
  type: string;
  isElite: boolean;
  position: Vec2;
  facing: number;
  hp: number;
  maxHp: number;
  speed: number;
  touchDamage: number;
  touchTimer: number;
  rangedCooldown: number;
};

type PickupState = {
  id: number;
  kind: string;
  position: Vec2;
  value: number;
};

type WorldState = {
  runClock: {
    phase: "wave" | "elite" | "lull" | "boss";
    phaseTime: number;
    elapsedTotal: number;
  };
  runBiome: "open_sea" | "island_chain" | "deep_waters" | "boss_storm";
  spawnIntensity: number;
  enemies: EnemyState[];
  pickups: PickupState[];
  sharedCoins: number;
};

type IncomingMessage =
  | { type: "hello"; name: string; color: string; emoji: string }
  | { type: "player_update"; player: Omit<PeerState, "id"> }
  | { type: "world_update"; world: WorldState; hostPlayer: Omit<PeerState, "id"> };

type OutgoingState = {
  type: "state";
  hostId: string | null;
  players: PeerState[];
  world: WorldState | null;
};

function safeParseMessage(raw: string): IncomingMessage | null {
  try {
    const data = JSON.parse(raw) as IncomingMessage;
    if (!data || typeof data !== "object" || typeof data.type !== "string") return null;
    return data;
  } catch {
    return null;
  }
}

function defaultPeer(id: string): PeerState {
  return {
    id,
    name: `Captain ${id.slice(0, 4)}`,
    color: "#7dd3fc",
    emoji: "🚢",
    position: { x: 0, y: 0 },
    facing: 0,
    hp: 100,
    upgradeLevel: 0,
  };
}

export default class FlowForgePartyServer {
  constructor(readonly room: { broadcast: (message: string) => void }) {}

  private peers = new Map<string, PeerState>();
  private hostId: string | null = null;
  private world: WorldState | null = null;

  onConnect(connection: { id: string; send: (message: string) => void }): void {
    const id = connection.id;
    this.peers.set(id, defaultPeer(id));
    if (!this.hostId) {
      this.hostId = id;
    }
    connection.send(JSON.stringify(this.buildState()));
    this.broadcastState();
  }

  onMessage(rawMessage: string, connection: { id: string }): void {
    const id = connection.id;
    const message = safeParseMessage(rawMessage);
    if (!message) return;
    const peer = this.peers.get(id);
    if (!peer) return;

    if (message.type === "hello") {
      peer.name = (message.name || peer.name).slice(0, 18);
      peer.color = message.color || peer.color;
      peer.emoji = message.emoji || peer.emoji;
      this.broadcastState();
      return;
    }

    if (message.type === "player_update") {
      this.peers.set(id, { ...message.player, id });
      this.broadcastState();
      return;
    }

    if (message.type === "world_update" && id === this.hostId) {
      const playerCount = Math.max(1, this.peers.size);
      const enemyScale = 1 + 0.15 * Math.max(0, playerCount - 1);
      this.world = {
        ...message.world,
        enemies: message.world.enemies.map((enemy) => ({
          ...enemy,
          hp: Math.max(1, Math.round(enemy.hp * enemyScale)),
          maxHp: Math.max(1, Math.round(enemy.maxHp * enemyScale)),
        })),
      };
      this.peers.set(id, { ...message.hostPlayer, id });
      this.broadcastState();
    }
  }

  onClose(connection: { id: string }): void {
    const id = connection.id;
    this.peers.delete(id);
    if (this.hostId === id) {
      this.hostId = this.peers.keys().next().value ?? null;
    }
    if (this.peers.size === 0) {
      this.world = null;
      this.hostId = null;
    }
    this.broadcastState();
  }

  private buildState(): OutgoingState {
    return {
      type: "state",
      hostId: this.hostId,
      players: Array.from(this.peers.values()),
      world: this.world,
    };
  }

  private broadcastState(): void {
    this.room.broadcast(JSON.stringify(this.buildState()));
  }
}
