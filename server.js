const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

io.on('connection', (socket) => {
  // Har user ka apna private inbox register hota hai
  socket.on('register-user', (username) => {
    socket.join(username);
    socket.username = username;
    console.log(`User connected to Inbox: @${username}`);
  });

  // Direct 1-on-1 message delivery
  socket.on('send-message', (data) => {
    // data = { to, from, cipher, iv, time }
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
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ Zingra Live on port ${PORT}`);
});
