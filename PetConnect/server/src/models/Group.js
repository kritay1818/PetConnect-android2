const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Group category is required'],
      enum: ['dogs', 'cats', 'adoption', 'training', 'health', 'general'],
      lowercase: true,
      trim: true
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Group admin is required']
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    pendingRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('Group', groupSchema);
