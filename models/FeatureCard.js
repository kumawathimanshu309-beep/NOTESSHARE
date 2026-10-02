const mongoose = require('mongoose');

const featureCardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Feature title is required.'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters.'],
    },
    description: {
      type: String,
      required: [true, 'Feature description is required.'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters.'],
    },
    icon: {
      type: String,
      default: '✨',
      trim: true,
      maxlength: [30, 'Icon identifier cannot exceed 30 characters.'],
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

featureCardSchema.index({ order: 1, isActive: 1, isDeleted: 1 });

module.exports = mongoose.model('FeatureCard', featureCardSchema);
