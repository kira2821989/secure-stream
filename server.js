const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
  transports: ['websocket', 'polling']
});

app.use(express.static('public'));

// Online users: username -> socketId
const onlineUsers = new Map();

// WHATSAPP QUEUE: Offline users ke pending messages yahan save honge
const offlineMessages = new Map();

io.on('connection', (socket) => {
  // USER REGISTRATION
  socket.on('register-user', ({ username }) => {
    if (!username) return;
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    socket.username = clean;
    socket.join(clean);
    onlineUsers.set(clean, socket.id);
    
    console.log(`✅ Online: @${clean}`);
    socket.emit('registered-success', { username: clean });

    // JAise hi banda online aaye, uske purane pending messages deliver karo!
    if (offlineMessages.has(clean)) {
      const pending = offlineMessages.get(clean);
      console.log(`📦 Delivering ${pending.length} pending messages to @${clean}`);
      pending.forEach(msg => {
        socket.emit('receive-message', msg);
        // Sender ko batao ki deliver ho gaya
        const senderSocket = onlineUsers.get(msg.from);
        if (senderSocket) {
          io.to(senderSocket).emit('message-status', { id: msg.id, status: 'delivered' });
        }
      });
      offlineMessages.delete(clean); // Delivered messages clear
    }
  });

  // SEND MESSAGE
  socket.on('send-message', (data) => {
    const toUser = (data.to || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const fromUser = (data.from || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    const targetSocketId = onlineUsers.get(toUser);

    if (targetSocketId) {
      // 1. Receiver online hai -> Turant deliver karo
      io.to(targetSocketId).emit('receive-message', data);
      socket.emit('message-status', { id: data.id, status: 'delivered' });
      console.log(`🚀 Instant Delivered: @${fromUser} -> @${toUser}`);
    } else {
      // 2. Receiver offline hai -> Server par save karo (WhatsApp style)
      if (!offlineMessages.has(toUser)) {
        offlineMessages.set(toUser, []);
      }
      offlineMessages.get(toUser).push(data);
      socket.emit('message-status', { id: data.id, status: 'queued', to: toUser });
      console.log(`📥 Queued for offline user @${toUser}`);
    }
  });

  // Video sync
  socket.on('sync-video', (data) => {
    const toUser = (data.to || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const target = onlineUsers.get(toUser);
    if (target) {
      io.to(target).emit('sync-video', data);
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
  console.log(`⚡ Zingra Message Server with Queue on port ${PORT}`);
});
