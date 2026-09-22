const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    doubt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doubt',
      required: [true, 'Doubt reference is required.'],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author reference is required.'],
    },
    content: {
      type: String,
      required: [true, 'Answer content is required.'],
      trim: true,
      minlength: [5, 'Answer must be at least 5 characters long.'],
      maxlength: [3000, 'Answer cannot exceed 3000 characters.'],
    },
    isAccepted: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

answerSchema.index({ doubt: 1, createdAt: -1 });
answerSchema.index({ author: 1, createdAt: -1 });

const Answer = mongoose.model('Answer', answerSchema);

module.exports = Answer;
