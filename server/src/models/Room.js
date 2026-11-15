const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    building: {
      type: String,
      required: true,
      default: 'Placement Cell Block'
    },
    floor: {
      type: Number,
      required: true,
      default: 1
    },
    capacity: {
      type: Number,
      default: 1 // Capacity in terms of panels / concurrent interviews
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Room', roomSchema);
