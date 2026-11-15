const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    rollNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    department: {
      type: String,
      required: true,
      enum: [
        'Computer Science',
        'Information Technology',
        'Electronics & Communication',
        'Electrical & Electronics',
        'Mechanical Engineering',
        'Civil Engineering',
        'Chemical Engineering'
      ]
    },
    cgpa: {
      type: Number,
      required: true,
      min: 0,
      max: 10
    },
    shortlistedCompanies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company'
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Student', studentSchema);
