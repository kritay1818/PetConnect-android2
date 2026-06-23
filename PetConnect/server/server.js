const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');

const app = require('./src/app');
const connectDB = require('./src/config/db');
const registerChatSocket = require('./src/sockets/chatSocket');

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    }
  });

  app.set('io', io);
  registerChatSocket(io);

  server.listen(PORT, () => {
    console.log(`PetConnect server running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
