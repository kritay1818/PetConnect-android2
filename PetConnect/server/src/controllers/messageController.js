const mongoose = require('mongoose');

const Message = require('../models/Message');
const User = require('../models/User');

const ensureValidObjectId = (id, res, label = 'ObjectId') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error(`Invalid ${label}`);
  }
};

const ensureValidReceiver = async (receiverId, senderId, res) => {
  ensureValidObjectId(receiverId, res, 'receiver id');

  if (receiverId.toString() === senderId.toString()) {
    res.status(400);
    throw new Error('User cannot send message to himself');
  }

  const receiver = await User.findById(receiverId);
  if (!receiver) {
    res.status(404);
    throw new Error('Receiver not found');
  }
};

const populateMessage = (query) =>
  query
    .populate('sender', 'username email')
    .populate('receiver', 'username email');

const emitMessage = (req, message) => {
  const io = req.app.get('io');

  if (!io) {
    return;
  }

  io.to(message.sender._id.toString()).emit('receiveMessage', message);
  io.to(message.receiver._id.toString()).emit('receiveMessage', message);
};

const createMessage = async ({ senderId, receiverId, text }) => {
  const message = await Message.create({
    sender: senderId,
    receiver: receiverId,
    text
  });

  return populateMessage(Message.findById(message._id));
};

const sendMessage = async (req, res, next) => {
  try {
    const { receiver, text } = req.body;

    await ensureValidReceiver(receiver, req.user._id, res);

    const message = await createMessage({
      senderId: req.user._id,
      receiverId: receiver,
      text
    });

    emitMessage(req, message);

    res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
};

const getConversation = async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.userId, res, 'user id');

    const otherUser = await User.findById(req.params.userId);
    if (!otherUser) {
      res.status(404);
      throw new Error('User not found');
    }

    const messages = await populateMessage(
      Message.find({
        $or: [
          { sender: req.user._id, receiver: req.params.userId },
          { sender: req.params.userId, receiver: req.user._id }
        ]
      })
    ).sort({ createdAt: 1 });

    res.status(200).json({ messages });
  } catch (error) {
    next(error);
  }
};

const getMyConversations = async (req, res, next) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }]
    })
      .populate('sender', 'username email')
      .populate('receiver', 'username email')
      .sort({ createdAt: -1 });

    const conversationMap = new Map();

    messages.forEach((message) => {
      const otherUser =
        message.sender._id.toString() === req.user._id.toString()
          ? message.receiver
          : message.sender;

      const otherUserId = otherUser._id.toString();

      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          user: otherUser,
          lastMessage: message
        });
      }
    });

    res.status(200).json({
      conversations: Array.from(conversationMap.values())
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendMessage,
  getConversation,
  getMyConversations,
  createMessage,
  ensureValidReceiver
};
