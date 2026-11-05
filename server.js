const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

// Active users tracking (username -> { socketId, ghostMode })
const activeUsers = new Map();

io.on('connection', (socket) => {
  // User apna inbox register karta hai
  socket.on('register-user', ({ username, ghostMode }) => {
    socket.join(username);
    socket.username = username;
    activeUsers.set(username, { socketId: socket.id, ghostMode: !!ghostMode });
  });

  // PRIVACY RULE: Server sirf unhi doston ka status batayega jo user ne maange hain
  socket.on('check-friends-status', (friendsList) => {
    if (!Array.isArray(friendsList)) return;
    const onlineFriends = friendsList.filter(f => {
      const user = activeUsers.get(f);
      // Agar user online hai AUR usne Ghost Mode ON nahi kiya hai
      return user && !user.ghostMode;
    });
    socket.emit('friends-status-response', onlineFriends);
  });

  // Direct 1-on-1 private messaging
  socket.on('send-message', (data) => {
    if (data.to) {
      io.to(data.to).emit('receive-message', data);
    }
  });

  // Watch Party video sync
  socket.on('sync-video', (data) => {
    if (data.to) {
      io.to(data.to).emit('sync-video', data);
    }
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      activeUsers.delete(socket.username);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ Zingra Private Server on port ${PORT}`);
});
