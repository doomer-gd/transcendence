import { Server } from "socket.io"
import { createServer } from "http"
import path from "path";
import { Socket } from "socket.io-client";

export const PUBLIC_FOLDER = path.resolve("./public");

const port: number = 3000;

const server = createServer();
const ioSock = new Server(server,{
    cors: {
        origin: "*"
    }
});
server.listen(port);

ioSock.on("connection", (socket) => {
  console.log(socket.id, "joined");

  socket.on("disconnect", () => {
    console.log(socket.id, "disconnected");
  });
});



