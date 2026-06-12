import { Server, Socket } from "socket.io"
import { createServer } from "http"


const port: number = 8081;
const server = createServer();
const ioSock = new Server(server,{
    cors: {
        origin: "*"
    }
});

server.listen(port);

console.log("Server started at:", port);

ioSock.on("connection", (socket) => {
  console.log(socket.id, "joined");
  socket.on("disconnect", () => {
    console.log(socket.id, "disconnected");
  });

  socket.on("hello", (text) => {
    console.log(`client ${socket.id}: `, text);
  });
});



