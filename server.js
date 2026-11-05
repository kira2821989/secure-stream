const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

// Online users ki active list
const activeUsers = new Map();

io.on('connection', (socket) => {
  // User online aaya
  socket.on('register-user', (username) => {
    socket.join(username);
    socket.username = username;
    activeUsers.set(username, socket.id);
    
    // Sabhi ko updated online list bhejo
    io.emit('online-users-list', Array.from(activeUsers.keys()));
    console.log(`🟢 Online: @${username}`);
  });

  // Direct 1-on-1 messaging
  socket.on('send-message', (data) => {
    if (data.to) {
      io.to(data.to).emit('receive-message', data);
    }
  });

  // Watch party sync
  socket.on('sync-video', (data) => {
    if (data.to) {
      io.to(data.to).emit('sync-video', data);
    }
  });

  // User ne tab band kiya / disconnect hua
  socket.on('disconnect', () => {
    if (socket.username) {
      activeUsers.delete(socket.username);
      io.emit('online-users-list', Array.from(activeUsers.keys()));
      console.log(`🔴 Offline: @${socket.username}`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ Zingra Live on port ${PORT}`);
});
