import { Server } from "socket.io"
import { createServer } from "http"


const httpServer = createServer();
const ioSock = new Server(httpServer,{
    cors: {
        origin: "*"
    }
});

ioSock.on("connection", (socket) => {
  console.log(socket.id, "joined");
});

ioSock.on("disconnect", (socket) => {
  console.log(socket.id, "disconnected");
})

ioSock.on("hello", (socket, text) =>{
  console.log("client", socket.id + ": ", text);
})

httpServer.listen(8081);
