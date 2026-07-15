import { io, Socket } from "socket.io-client";
import { SampleData } from "./GameServer";


//placeholder file
const socket = io('http://localhost:8081');
console.log("connecting to localhost");
const sampleData: SampleData = { x: 1, y: 2, color: "blue" };

socket.on('connect', () => {
	console.log(`connected with ${socket.id}`);
	socket.emit('hello', 'how are you?');
  socket.emit('data', sampleData);
	// keep connection briefly so server can process
	setTimeout(() => socket.disconnect(), 500);
});
