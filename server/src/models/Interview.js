const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },
    panel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Panel'
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room'
    },
    day: {
      type: Number,
      min: 1,
      max: 4
    },
    startTime: {
      type: String // e.g., '09:00', '10:30'
    },
    endTime: {
      type: String // e.g., '09:45', '11:15'
    },
    duration: {
      type: Number // in minutes
    },
    status: {
      type: String,
      enum: ['pending', 'scheduled', 'completed', 'cancelled', 'conflict'],
      default: 'pending'
    },
    // Explicit reason stored when status is 'conflict' (not scheduled)
    // Possible values: NO_STUDENT_AVAILABILITY | NO_ROOM_AVAILABLE |
    //                  NO_PANEL_AVAILABLE | COMPANY_WINDOW_EXPIRED | NO_FEASIBLE_SLOT
    unscheduledReason: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Interview', interviewSchema);
