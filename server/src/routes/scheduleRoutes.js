const express = require('express');
const { runScheduler } = require('../services/scheduler');
const Interview = require('../models/Interview');
const Company = require('../models/Company');

const router = express.Router();

/**
 * @route   POST /api/schedule/generate
 * @desc    Run the greedy EAS scheduler and save interviews to MongoDB
 * @body    { clearExisting?: boolean }   default: true
 * @access  Public
 */
router.post('/generate', async (req, res, next) => {
  try {
    const { clearExisting } = req.body || {};
    const result = await runScheduler({
      clearExisting: clearExisting !== undefined ? Boolean(clearExisting) : true
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
});

/**
 * @route   GET /api/schedule
 * @desc    Retrieve the saved schedule with optional filters
 * @query   status  (scheduled | conflict | all)   default: all
 * @query   day     (1 | 2 | 3 | 4)
 * @query   company (company name, partial match)
 * @query   page    default: 1
 * @query   limit   default: 50
 * @access  Public
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, day, company: companyName, page = 1, limit = 50 } = req.query;

    // Build filter
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (day) {
      filter.day = parseInt(day, 10);
    }

    // Filter by company name if provided
    if (companyName) {
      const matchedCompany = await Company.findOne({
        name: { $regex: companyName, $options: 'i' }
      }).lean();
      if (matchedCompany) {
        filter.company = matchedCompany._id;
      } else {
        // No matching company → return empty result set
        return res.status(200).json({
          success: true,
          total: 0,
          page: 1,
          pages: 0,
          data: []
        });
      }
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [interviews, total] = await Promise.all([
      Interview.find(filter)
        .populate('student', 'name rollNumber cgpa department')
        .populate('company', 'name tier priority interviewDuration')
        .populate('panel', 'name panelNumber interviewers')
        .populate('room', 'roomNumber building floor')
        .sort({ day: 1, startTime: 1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Interview.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
      data: interviews
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @route   GET /api/schedule/summary
 * @desc    Quick overview: scheduled vs unscheduled counts by status and day
 * @access  Public
 */
router.get('/summary', async (req, res, next) => {
  try {
    const [total, scheduled, unscheduled, byDay, reasonBreakdown] = await Promise.all([
      Interview.countDocuments(),
      Interview.countDocuments({ status: 'scheduled' }),
      Interview.countDocuments({ status: 'conflict' }),
      Interview.aggregate([
        { $group: { _id: '$day', count: { $sum: 1 }, scheduled: { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } } } },
        { $sort: { _id: 1 } }
      ]),
      Interview.aggregate([
        { $match: { status: 'conflict' } },
        { $group: { _id: '$unscheduledReason', count: { $sum: 1 } } }
      ])
    ]);

    return res.status(200).json({
      success: true,
      summary: {
        total,
        scheduled,
        unscheduled,
        schedulingPercentage: total > 0 ? `${((scheduled / total) * 100).toFixed(2)}%` : '0%'
      },
      byDay: byDay.map(d => ({
        day: d._id,
        totalInterviews: d.count,
        scheduledInterviews: d.scheduled,
        unscheduledInterviews: d.count - d.scheduled
      })),
      failureReasonBreakdown: Object.fromEntries(
        reasonBreakdown.map(r => [r._id || 'UNKNOWN', r.count])
      )
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
