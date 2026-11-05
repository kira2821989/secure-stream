const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

// Registered users database: username -> { pin, socketId, ghostMode }
const registeredUsers = new Map();

io.on('connection', (socket) => {
  // USERNAME CLAIM & PIN VERIFICATION
  socket.on('register-user', ({ username, pin, ghostMode }) => {
    if (!username || !pin) return;

    const existing = registeredUsers.get(username);

    // Agar username pehle se registered hai aur PIN match nahi karta
    if (existing && existing.pin !== pin) {
      socket.emit('auth-error', `❌ '@${username}' pehle se kisi aur ka hai! Sahi PIN dalein ya naya naam chunein.`);
      return;
    }

    // Username successfully verified/registered
    socket.join(username);
    socket.username = username;
    registeredUsers.set(username, { pin, socketId: socket.id, ghostMode: !!ghostMode });
    socket.emit('auth-success', { username });
    console.log(`🔐 Verified User: @${username}`);
  });

  // Friends status check
  socket.on('check-friends-status', (friendsList) => {
    if (!Array.isArray(friendsList)) return;
    const onlineFriends = friendsList.filter(f => {
      const u = registeredUsers.get(f);
      return u && !u.ghostMode;
    });
    socket.emit('friends-status-response', onlineFriends);
  });

  // Direct 1-on-1 private messaging
  socket.on('send-message', (data) => {
    if (data.to) {
      io.to(data.to).emit('receive-message', data);
    }
  });

  // Watch party video sync
  socket.on('sync-video', (data) => {
    if (data.to) {
      io.to(data.to).emit('sync-video', data);
    }
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      const u = registeredUsers.get(socket.username);
      if (u) u.socketId = null; // Mark offline
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ Zingra Private Server on port ${PORT}`);
});
