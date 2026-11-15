const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    tier: {
      type: String,
      enum: ['Tier 1', 'Tier 2', 'Tier 3'],
      required: true
    },
    priority: {
      type: Number,
      required: true,
      min: 1,
      max: 3
    },
    minCGPA: {
      type: Number,
      required: true,
      min: 0,
      max: 10
    },
    interviewDuration: {
      type: Number,
      required: true, // in minutes (e.g., 30, 45, 60)
      default: 45
    },
    numPanels: {
      type: Number,
      required: true,
      min: 1,
      default: 2
    },
    operatingDays: [
      {
        type: Number,
        min: 1,
        max: 4
      }
    ],
    operatingHours: {
      start: {
        type: String,
        default: '09:00'
      },
      end: {
        type: String,
        default: '18:00'
      }
    },
    shortlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
      }
    ],
    targetShortlistSize: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Company', companySchema);
