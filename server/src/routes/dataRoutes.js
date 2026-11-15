const express = require('express');
const { generateDataset } = require('../services/datasetGenerator');
const Company = require('../models/Company');
const Student = require('../models/Student');
const Room = require('../models/Room');
const Panel = require('../models/Panel');

const router = express.Router();

/**
 * @route   POST /api/data/generate
 * @desc    Generate realistic placement dataset (35 companies, 800 students, 20 rooms, panels, shortlists)
 * @access  Public
 */
router.post('/generate', async (req, res, next) => {
  try {
    const { totalStudents, clearExisting } = req.body || {};
    const result = await generateDataset({
      totalStudents: totalStudents ? parseInt(totalStudents, 10) : 800,
      clearExisting: clearExisting !== undefined ? Boolean(clearExisting) : true
    });

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
});

/**
 * @route   GET /api/data/summary
 * @desc    Quick count check of generated data in database
 * @access  Public
 */
router.get('/summary', async (req, res, next) => {
  try {
    const [companyCount, studentCount, roomCount, panelCount] = await Promise.all([
      Company.countDocuments(),
      Student.countDocuments(),
      Room.countDocuments(),
      Panel.countDocuments()
    ]);

    return res.status(200).json({
      success: true,
      counts: {
        companies: companyCount,
        students: studentCount,
        rooms: roomCount,
        panels: panelCount
      }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
