const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// REAL-TIME INSTANT WEBSOCKET ENGINE
const io = new Server(server, {
  cors: { origin: "*" },
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling']
});

app.use(express.static('public'));

// Offline backup store
const offlineStore = new Map();

io.on('connection', (socket) => {
  // USER REGISTRATION (Direct Room Join)
  socket.on('register-user', ({ username }) => {
    if (!username) return;
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    socket.username = clean;
    socket.join(clean); // Har user ka apna permanent room
    console.log(`⚡ Joined Room: @${clean}`);

    // Offline pending messages turant deliver karo
    if (offlineStore.has(clean)) {
      const pending = offlineStore.get(clean);
      pending.forEach(m => socket.emit('receive-message', m));
      offlineStore.delete(clean);
    }
  });

  // INSTANT MESSAGE SEND (NO WAITING)
  socket.on('send-message', (data) => {
    const toUser = (data.to || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // 1. SEEDHE LIVE ROOM ME EMIT KARO (Zero second delay)
    io.to(toUser).emit('receive-message', data);
    socket.emit('message-status', { id: data.id, status: 'delivered' });
    console.log(`🚀 Live Emitted to @${toUser}`);

    // 2. Backup check (Agar banda bilkul disconnect ho)
    const room = io.sockets.adapter.rooms.get(toUser);
    if (!room || room.size === 0) {
      if (!offlineStore.has(toUser)) offlineStore.set(toUser, []);
      offlineStore.get(toUser).push(data);
    }
  });

  socket.on('disconnect', () => {
    // Socket automatically leaves room
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ Zingra Ultra-Live Server on port ${PORT}`);
});
