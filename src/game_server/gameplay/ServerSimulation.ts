import { GameModes, Simulation } from "../../game_common/gameplay/Simulation";
import EventEmitter from "eventemitter3";
import { ManagerEvents} from "@/game_common/network/Interfaces";
import {GameConstructData,GameMap} from "../../game_common/utility/SharedConfig";
import {GameObjectType} from "@/game_common/gameobjects/GameObject";
import path from "path";
import { Player } from "@/game_common/gameobjects/Player";
import { ScoreMap } from "./ScoreMap";

export const PUBLIC_FOLDER = path.resolve("./public");

export interface PlayerResult
{
  id: string;
  kills: number;
  deaths: number;
  hero: string;
  team?: number;
  won: boolean;
}

export interface GameResult
{
  start: number;
  map: string;
  numPlayers: number;
  mode: GameModes;
  players: PlayerResult[];
}

export class ServerSimulation extends Simulation
{
  readonly id: string;
  private players: Set<Player>;
  private playerIds: Map<number, string>;
  private startTime: number;
  private score: ScoreMap;
  eventsManager: EventEmitter<ManagerEvents>;

  constructor(id: string, mapConfig: GameMap, config: GameConstructData,
    events: EventEmitter<ManagerEvents>)
  {
    super(mapConfig, config);
    this.eventsManager = events;
    this.id = id;
    this.players = new Set<Player>();
    this.playerIds = new Map<number, string>();
    this.playerIds.set(0, "Game");
    this.score = new ScoreMap();
  }

  override onConstructed(): void
  {
    this.eventsManager.emit("worldConstructed", this.id);
  }

  override onStart(): void
  {
    this.matter.tick = 0;
    this.startTime = Date.now();
    this.eventsGame.on("frag", (id: number, author: number) => this.updateScore(id, author));
  }

  addPlayer(hero: string, id: string): number
  {
    const player = this.factory.create(GameObjectType.player, hero) as Player;
    if (!player)
      return -1;
    this.players.add(player as Player);
    this.playerIds.set(player.id, id);
    this.score.set(player.id, [0, 0]);
    return player.id;
  }

  removePlayer(id: number)
  {
    const player = this.matter.dynamics.get(id) as Player;
    if (!player)
      return ;
    this.playerIds.delete(player.id);
    this.score.delete(player.id);
    this.players.delete(player);
    this.factory.remove(id);
  }

  countReadyPlayers()
  {
    let result = 0;
    this.players.forEach((player: Player) =>
    {
      if (player.state.isReady)
        result++;
    });
    return result;
  }

  getPlayerHero(playerId: number): string | undefined
  {
    const player = this.matter.dynamics.get(playerId);
    return player?.label;
  }

  setPlayerReady(id: number, isReady: boolean)
  {
    const player = this.matter.dynamics.get(id);
    if (!player)
      return;
    (player as Player).state.isReady = isReady;
  }

  protected override endGame(): void
  {
    this.matter.isActive = false;
    this.eventsManager.emit("matchEnded", this.id, this.exportResult());
    this.players.forEach((player: Player) => this.removePlayer(player.id));
  }

  exportScore(): Array<[number, number, number]>
  {
    return this.score.getValues();
  }

  exportResult(): GameResult
  {
    let result: GameResult = {
      start: this.startTime,
      mode: this.params.mode,
      map: this.mapConfig.label,
      numPlayers: this.mapConfig.worldConfig.numPlayers,
      players: new Array<PlayerResult>(this.params.numPlayers),
    };
    let index = 0;
    this.players.forEach((player: Player) =>
      {
        let score = this.score.get(player.id) as [number, number];
        result.players[index++] =
        {
          id: this.playerIds.get(player.id) as string,
          kills: score[0],
          deaths: score[1],
          hero: player.label,
          team: this.params.mode === GameModes.teams ? player.team : undefined,
          won: false,
        };
      });
    this.assignWinner(result);
    return result;
  }

  private updateScore(id: number, author: number)
  {
    let oldScoreSubject = this.score.get(id) as [number, number];
    this.score.set(id, [oldScoreSubject[0], oldScoreSubject[1] + 1]);
    if (author !== 0)
    {
      let oldScoreAuthor = this.score.get(author) as [number, number];
      this.score.set(author, [oldScoreAuthor[0] + 1, oldScoreAuthor[1]]);
      if (this.params.mode === GameModes.teams)
      {
        let teamId = (this.matter.dynamics.get(author) as Player).team;
        if (teamId > -1)
          this.params.teamScores![teamId]++;
      }
    }
    this.eventsManager.emit("frag", id, author);
  }

  private assignWinner(result: GameResult)
  {
    if (this.score.getValues().length === 0)
      return;
    if (this.params.mode === GameModes.teams)
    {
      let winningTeam = 0;
      if (this.params.teamScores![1] > this.params.teamScores![0])
        winningTeam = 1;
      result.players.forEach((player: PlayerResult) =>
      {
        if (player.team === winningTeam)
          player.won = true;
      });
    }
    else
    {
      let winnerId = this.score.getValues()[0][0];
      result.players.forEach((player: PlayerResult) =>
      {
        if (this.playerIds.get(winnerId) === player.id)
          player.won = true;
      });
    }
  }
}
