import { io, Socket } from "socket.io-client";

const socket = io('http://localhost:8081');

socket.on('connect', () => {
	console.log(`connected with ${socket.id}`);
	socket.emit('hello', 'how are you?');
	// keep connection briefly so server can process
	setTimeout(() => socket.disconnect(), 500);
});
