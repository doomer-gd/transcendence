import { Composite, Engine} from "matter-js";
import { constructServerWorld, MatterData } from "../utils/WorldConstructor";
import * as GameServer from "."
import { PlayerConfig } from "@/game_server/gameplay/Player";
import { GameNetwork } from "../network/Network";
import { PlayerInput, ServerSocket } from "@/game_common/network/Interfaces";

interface MatchStatus
{
  readyPlayers: number,
  isConstructed: boolean,
  isStarted: boolean
}


export class Match {
  private matter: MatterData;
  readonly id: string;
  readonly characterConfig: PlayerConfig[];
  readonly mapConfig: any;
  network: GameNetwork;
  state: MatchStatus;
  playersMap: Map<string, GameServer.Player>;

  constructor(id: string, mapConfig: any, characters: PlayerConfig[], network: GameNetwork) {
    this.id = id;
    this.state.isConstructed = false;
    this.state.isStarted = false;
    this.state.readyPlayers = 0;
    this.network = network;
    this.characterConfig = characters;
    this.mapConfig = mapConfig;
    constructServerWorld(mapConfig, this.matter, this.state.isConstructed);
    console.log("hi");
  }

  startMatch()
  {
    this.matter.isActive = true;
    this.state.isStarted = true;
    this.network.ioSock.to(this.id).emit("gameReady");
  }

  update(deltaTime: number){
    if (!this.matter.isActive)
      return ;
    Engine.update(this.matter.engine, deltaTime);
    this.matter.tick++;
    this.playersMap.forEach((value: GameServer.Player, key: string)=>{
      this.network.ioSock.to(key).emit("snapShot", this.matter.tick, [{id: value.id, pos: {x: value.body.position.x, y: value.body.position.y}}]);
    })
    console.log("tick:", this.matter.tick);
  }

  addPlayer(playerId: string)
  {
    this.network.ioSock.to(playerId).emit("requestHero");
    const socket = this.network.getSock(playerId);
    if (!socket)
      return ;
    socket.once("selectHero", (label: string) =>
    {
      const config = this.characterConfig.find((value) => value.label === label) as PlayerConfig;
      const player = new GameServer.Player(this.matter.idLast, config, this.matter);
      this.playersMap.set(playerId, player);
      this.matter.idObjectMap.set(this.matter.idLast, player);
      this.matter.idLast++;
      this.addPlayerListen(socket, player);
      if (this.state.isStarted)
        socket.emit("gameReady");
    })
  };

  removePlayer(playerId: string)
  {
    const player = this.playersMap.get(playerId);
    if (!player)
      return ;
    this.matter.idObjectMap.delete(player.id);
    this.playersMap.delete(playerId);
  };

  addPlayerListen(socket: ServerSocket, player: GameServer.Player)
  {
    socket.on("input", (data: PlayerInput) => player.applyInput(data));
    socket.once("playerReady", () => {
      player.stats.isReady = true;
      this.state.readyPlayers++;
      if (!this.state.isStarted &&
          (this.state.readyPlayers >= this.mapConfig.minPlayers))
        this.checkStartMatch();
    })
  }

  spawnPlayer(player: GameServer.Player)
  {
    player.body.position = {x: 300, y: 400};
    Composite.add(this.matter.world, player.body);
  }

  checkStartMatch()
  {
    if (this.state.isStarted)
      return ;
    let numReady: number = 0;
    this.playersMap.forEach((value: GameServer.Player) => {
      if(value.stats.isReady)
        numReady++;
      });
    this.state.readyPlayers = numReady;
    if (numReady >= this.mapConfig.minPlayers)
      this.startMatch();
  }

  destroy(){};

}
