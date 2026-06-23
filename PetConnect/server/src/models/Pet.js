const mongoose = require('mongoose');

const petSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Pet name is required'],
      trim: true
    },
    type: {
      type: String,
      required: [true, 'Pet type is required'],
      enum: ['dog', 'cat', 'bird', 'rabbit', 'other'],
      lowercase: true,
      trim: true
    },
    breed: {
      type: String,
      trim: true
    },
    age: {
      type: Number,
      min: [0, 'Age cannot be negative']
    },
    city: {
      type: String,
      trim: true
    },
    bio: {
      type: String,
      trim: true
    },
    imageUrl: {
      type: String,
      trim: true
    },
    imageUri: {
      type: String,
      trim: true
    },
    photoUrl: {
      type: String,
      trim: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Pet owner is required']
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('Pet', petSchema);
