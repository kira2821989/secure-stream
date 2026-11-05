const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// FAST WEBSOCKET CONFIGURATION (Zero Delay)
const io = new Server(server, {
  cors: { origin: "*" },
  transports: ['websocket', 'polling']
});

app.use(express.static('public'));

// Online users map: clean_username -> socket.id
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('⚡ New Connection:', socket.id);

  // USER REGISTRATION
  socket.on('register-user', ({ username }) => {
    if (!username) return;
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    socket.username = clean;
    socket.join(clean);
    onlineUsers.set(clean, socket.id);
    
    console.log(`✅ Online: @${clean}`);
    socket.emit('registered-success', { username: clean });
  });

  // DIRECT 1-ON-1 MESSAGE WITH DELIVERY ACKNOWLEDGEMENT
  socket.on('send-message', (data) => {
    const toUser = (data.to || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const fromUser = (data.from || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    const targetSocketId = onlineUsers.get(toUser);

    if (targetSocketId) {
      // Receiver online hai -> Message deliver karo!
      io.to(toUser).emit('receive-message', data);
      
      // Sender ko confirm karo ki deliver ho gaya (Double Tick ✓✓)
      socket.emit('message-status', { id: data.id, status: 'delivered' });
      console.log(`🚀 Delivered: @${fromUser} -> @${toUser}`);
    } else {
      // Receiver offline hai
      socket.emit('message-status', { id: data.id, status: 'offline', to: toUser });
      console.log(`⚠️ Offline: @${toUser}`);
    }
  });

  // Watch Party video sync
  socket.on('sync-video', (data) => {
    const toUser = (data.to || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (toUser) {
      io.to(toUser).emit('sync-video', data);
    }
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      onlineUsers.delete(socket.username);
      console.log(`🔴 Offline: @${socket.username}`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ Zingra Ultra-Fast Server on port ${PORT}`);
});
