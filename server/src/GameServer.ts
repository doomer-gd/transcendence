import { Server, Socket } from "socket.io"
import { createServer } from "http"


const port: number = 8081; //defalut
const server = createServer();
const ioSock = new Server(server,{
    cors: {
        origin: "*"
    }
});

export interface SampleData
{
  x: number;
  y: number;
  color: string;
}

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
  socket.on("data", (data: SampleData) =>{
    console.log("x:", data.x, "y:", data.y, "color:", data.color);
  })
});



