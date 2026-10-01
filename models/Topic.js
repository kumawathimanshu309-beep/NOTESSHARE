const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required for a topic.'],
    },
    name: {
      type: String,
      required: [true, 'Topic name is required.'],
      trim: true,
      minlength: [2, 'Topic name must be at least 2 characters.'],
      maxlength: [120, 'Topic name cannot exceed 120 characters.'],
    },
    slug: {
      type: String,
      required: [true, 'Topic slug is required.'],
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters.'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
topicSchema.index({ subject: 1, name: 1 }, { unique: true });
topicSchema.index({ subject: 1, slug: 1 }, { unique: true });
topicSchema.index({ subject: 1, isActive: 1 });

const Topic = mongoose.model('Topic', topicSchema);

module.exports = Topic;
