const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required.'],
    },
    note: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
      required: [true, 'Note reference is required.'],
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index to prevent duplicate likes at the database level
likeSchema.index({ user: 1, note: 1 }, { unique: true });
likeSchema.index({ note: 1 });

const Like = mongoose.model('Like', likeSchema);

module.exports = Like;
