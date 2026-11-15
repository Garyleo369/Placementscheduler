const mongoose = require('mongoose');

const panelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },
    panelNumber: {
      type: Number,
      required: true,
      min: 1
    },
    interviewers: [
      {
        type: String,
        trim: true
      }
    ],
    operatingDays: [
      {
        type: Number,
        min: 1,
        max: 4
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Panel', panelSchema);
