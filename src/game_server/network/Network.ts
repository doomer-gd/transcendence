import { GameServer, ServerSocket } from "../../game_common/network/Interfaces";
import { createServer } from "http";
import path from "path";
import { Server, Socket } from "socket.io";



export class GameNetwork
{
  ioSock: GameServer;
  private sockMap: Map<string, ServerSocket>;

  constructor (port: number)
  {
    this.sockMap = new Map<string, ServerSocket>;
    const server = createServer();
    this.ioSock = new Server(server,{
        cors: {
            origin: "*"
        },
        connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: false
        }
    });
    server.listen(port);
    this.setUpListen();
  }

  private setUpListen()
  {
    this.ioSock.on("connect", (socket) => {
      this.sockMap.set(socket.id, socket);
      console.log(socket.id, "joined");

      socket.on("disconnect", () => {
        this.sockMap.delete(socket.id);
        console.log(socket.id, "disconnected");
      });
    });
  }

  getSock(idSock: string): ServerSocket | undefined
  {
    return this.sockMap.get(idSock);
  }

  joinRoom(idSock: string, idRoom: string)
  {
    const socket = this.sockMap.get(idSock);
    if (!socket)
      return ;
    socket.join(idRoom);
  }

  leaveRoom(idSock: string, idRoom: string)
  {
    const socket = this.sockMap.get(idSock);
    if (!socket)
      return ;
    socket.leave(idRoom);
  }
}
