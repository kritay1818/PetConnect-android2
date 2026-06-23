const jwt = require('jsonwebtoken');

const {
  createMessage,
  ensureValidReceiver
} = require('../controllers/messageController');
const User = require('../models/User');

const getTokenFromSocket = (socket) => {
  const authToken = socket.handshake.auth && socket.handshake.auth.token;
  const headerToken = socket.handshake.headers.authorization;

  if (authToken) {
    return authToken;
  }

  if (headerToken && headerToken.startsWith('Bearer ')) {
    return headerToken.split(' ')[1];
  }

  return null;
};

const authenticateSocket = async (socket, next) => {
  try {
    const token = getTokenFromSocket(socket);

    if (!token) {
      throw new Error('Socket authentication token missing');
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new Error('Socket user not found');
    }

    socket.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

const registerChatSocket = (io) => {
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const userRoom = socket.user._id.toString();

    socket.join(userRoom);
    socket.emit('join', {
      userId: userRoom,
      message: 'Joined personal room'
    });

    console.log(`Socket connected: ${socket.id} for user ${userRoom}`);

    socket.on('join', () => {
      socket.join(userRoom);
      socket.emit('join', {
        userId: userRoom,
        message: 'Joined personal room'
      });
    });

    socket.on('sendMessage', async (payload, callback) => {
      try {
        const { receiver, text } = payload || {};
        const socketResponse = {
          status: () => socketResponse
        };

        if (!text || !text.trim()) {
          throw new Error('Message text is required');
        }

        await ensureValidReceiver(receiver, socket.user._id, socketResponse);

        const message = await createMessage({
          senderId: socket.user._id,
          receiverId: receiver,
          text
        });

        io.to(message.receiver._id.toString()).emit('receiveMessage', message);
        io.to(message.sender._id.toString()).emit('receiveMessage', message);

        if (callback) {
          callback({ ok: true, message });
        }
      } catch (error) {
        if (callback) {
          callback({ ok: false, error: error.message });
        }

        socket.emit('receiveMessage', {
          error: error.message
        });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id} for user ${userRoom}`);
    });
  });
};

module.exports = registerChatSocket;
