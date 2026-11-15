const express  = require('express');
const { runReplanner } = require('../services/replanner');
const Interview = require('../models/Interview');
const Company   = require('../models/Company');
const Room      = require('../models/Room');
const Panel     = require('../models/Panel');
const Student   = require('../models/Student');

const router = express.Router();

/**
 * @route   POST /api/replan
 * @desc    Apply a disruption and surgically replan only affected interviews.
 *          Locked (unaffected) interviews are never touched.
 *
 * @body Disruption object — one of:
 *
 *   COMPANY_DELAY:
 *     { "type": "COMPANY_DELAY", "companyId": "<id>", "delayMinutes": 120, "affectedDays": [1] }
 *     affectedDays is optional; defaults to all company operating days.
 *
 *   PANEL_DROP:
 *     { "type": "PANEL_DROP", "panelId": "<id>" }
 *
 *   ROOM_UNAVAILABLE:
 *     { "type": "ROOM_UNAVAILABLE", "roomId": "<id>", "day": 2 }
 *     day is optional; if omitted, room is blocked for all days.
 *
 *   STUDENT_WITHDRAW:
 *     { "type": "STUDENT_WITHDRAW", "studentId": "<id>" }
 *
 * @access  Public
 */
router.post('/', async (req, res, next) => {
  try {
    const disruption = req.body;

    if (!disruption || !disruption.type) {
      return res.status(400).json({
        success: false,
        message: 'Request body must include a "type" field. Valid types: COMPANY_DELAY | PANEL_DROP | ROOM_UNAVAILABLE | STUDENT_WITHDRAW'
      });
    }

    const result = await runReplanner(disruption);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
});

/**
 * @route   GET /api/replan/history
 * @desc    Retrieve interviews marked as cancelled by replanning (for audit)
 * @query   page default: 1, limit default: 50
 * @access  Public
 */
router.get('/history', async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [cancelled, total] = await Promise.all([
      Interview.find({ status: 'cancelled' })
        .populate('student', 'name rollNumber cgpa')
        .populate('company', 'name tier')
        .populate('panel', 'name panelNumber')
        .populate('room', 'roomNumber building')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Interview.countDocuments({ status: 'cancelled' })
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
      data: cancelled
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @route   GET /api/replan/ids
 * @desc    Helper — returns one sample ID for each entity type so you can build
 *          test requests without manually querying MongoDB.
 * @access  Public
 */
router.get('/ids', async (req, res, next) => {
  try {
    const [company, panel, room, student, interview] = await Promise.all([
      Company.findOne({}).select('name tier operatingDays').lean(),
      Panel.findOne({}).select('name company panelNumber').lean(),
      Room.findOne({}).select('roomNumber building').lean(),
      Student.findOne({}).select('name rollNumber').lean(),
      Interview.findOne({ status: 'scheduled' }).select('student company panel room day startTime').lean()
    ]);

    return res.status(200).json({
      success: true,
      note: 'Use these IDs to build test requests for POST /api/replan',
      sampleIds: {
        companyId: company ? company._id : null,
        companyName: company ? company.name : null,
        companyOperatingDays: company ? company.operatingDays : null,
        panelId: panel ? panel._id : null,
        panelName: panel ? panel.name : null,
        roomId: room ? room._id : null,
        roomNumber: room ? room.roomNumber : null,
        studentId: student ? student._id : null,
        studentName: student ? student.name : null,
        sampleScheduledInterview: interview || null
      }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
