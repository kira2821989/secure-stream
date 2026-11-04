const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

io.on('connection', (socket) => {
  // 1. User specific Room me join hota hai
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.roomId = roomId;
    console.log(`User ${socket.id} joined Room: ${roomId}`);
  });

  // 2. Encrypted Chat Message sirf usi room ke logon ko jayega
  socket.on('encrypted-message', (data) => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('encrypted-message', data);
    }
  });

  // 3. Watch Party: Video Play/Pause sync sabhi doston ke phone me
  socket.on('sync-video', (data) => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('sync-video', data);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnect hua:', socket.id);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`⚡ Zingra Server Live on http://localhost:${PORT}`);
});
