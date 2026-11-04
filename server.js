const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

io.on('connection', (socket) => {
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.roomId = roomId;
  });

  socket.on('encrypted-message', (data) => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('encrypted-message', data);
    }
  });

  socket.on('sync-video', (data) => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('sync-video', data);
    }
  });
});

// Render cloud ke liye dynamic PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ Zingra Server Live on port ${PORT}`);
});
