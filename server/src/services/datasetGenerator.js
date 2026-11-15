const Company = require('../models/Company');
const Student = require('../models/Student');
const Room = require('../models/Room');
const Panel = require('../models/Panel');
const Interview = require('../models/Interview');

// 35 Diverse Companies categorized across 3 Tiers
const COMPANY_DEFINITIONS = [
  // --- TIER 1: High Priority (10 Companies) ---
  // Min CGPA: 8.0 - 8.5, Interview Duration: 45 - 60m, Panels: 3 - 4, Days: 1-2, Target Shortlist: 80 - 160
  { name: 'Google', tier: 'Tier 1', priority: 1, minCGPA: 8.5, interviewDuration: 60, numPanels: 4, operatingDays: [1, 2], targetShortlistSize: 120 },
  { name: 'Microsoft', tier: 'Tier 1', priority: 1, minCGPA: 8.2, interviewDuration: 45, numPanels: 4, operatingDays: [1, 2], targetShortlistSize: 150 },
  { name: 'Amazon', tier: 'Tier 1', priority: 1, minCGPA: 8.0, interviewDuration: 45, numPanels: 4, operatingDays: [1, 2], targetShortlistSize: 160 },
  { name: 'Apple', tier: 'Tier 1', priority: 1, minCGPA: 8.5, interviewDuration: 60, numPanels: 3, operatingDays: [1, 2], targetShortlistSize: 90 },
  { name: 'Meta', tier: 'Tier 1', priority: 1, minCGPA: 8.5, interviewDuration: 60, numPanels: 3, operatingDays: [1, 2], targetShortlistSize: 100 },
  { name: 'Goldman Sachs', tier: 'Tier 1', priority: 1, minCGPA: 8.2, interviewDuration: 45, numPanels: 4, operatingDays: [1, 2], targetShortlistSize: 130 },
  { name: 'D.E. Shaw', tier: 'Tier 1', priority: 1, minCGPA: 8.5, interviewDuration: 60, numPanels: 3, operatingDays: [1], targetShortlistSize: 80 },
  { name: 'Uber', tier: 'Tier 1', priority: 1, minCGPA: 8.0, interviewDuration: 45, numPanels: 3, operatingDays: [1, 2], targetShortlistSize: 110 },
  { name: 'Nvidia', tier: 'Tier 1', priority: 1, minCGPA: 8.2, interviewDuration: 60, numPanels: 3, operatingDays: [1, 2], targetShortlistSize: 100 },
  { name: 'Stripe', tier: 'Tier 1', priority: 1, minCGPA: 8.5, interviewDuration: 60, numPanels: 3, operatingDays: [1], targetShortlistSize: 85 },

  // --- TIER 2: Mid-High Priority (15 Companies) ---
  // Min CGPA: 7.0 - 7.8, Interview Duration: 45m, Panels: 2 - 3, Days: 2-3 or 1-3, Target Shortlist: 120 - 220
  { name: 'Adobe', tier: 'Tier 2', priority: 2, minCGPA: 7.8, interviewDuration: 45, numPanels: 3, operatingDays: [2, 3], targetShortlistSize: 140 },
  { name: 'Salesforce', tier: 'Tier 2', priority: 2, minCGPA: 7.5, interviewDuration: 45, numPanels: 3, operatingDays: [2, 3], targetShortlistSize: 150 },
  { name: 'Cisco', tier: 'Tier 2', priority: 2, minCGPA: 7.2, interviewDuration: 45, numPanels: 3, operatingDays: [2, 3], targetShortlistSize: 170 },
  { name: 'Oracle', tier: 'Tier 2', priority: 2, minCGPA: 7.5, interviewDuration: 45, numPanels: 3, operatingDays: [2, 3], targetShortlistSize: 160 },
  { name: 'Qualcomm', tier: 'Tier 2', priority: 2, minCGPA: 7.5, interviewDuration: 45, numPanels: 3, operatingDays: [2, 3], targetShortlistSize: 130 },
  { name: 'Intel', tier: 'Tier 2', priority: 2, minCGPA: 7.2, interviewDuration: 45, numPanels: 3, operatingDays: [2, 3], targetShortlistSize: 140 },
  { name: 'Samsung R&D', tier: 'Tier 2', priority: 2, minCGPA: 7.5, interviewDuration: 45, numPanels: 3, operatingDays: [2, 3], targetShortlistSize: 180 },
  { name: 'Atlassian', tier: 'Tier 2', priority: 2, minCGPA: 7.8, interviewDuration: 45, numPanels: 2, operatingDays: [2, 3], targetShortlistSize: 120 },
  { name: 'Flipkart', tier: 'Tier 2', priority: 2, minCGPA: 7.5, interviewDuration: 45, numPanels: 3, operatingDays: [1, 2, 3], targetShortlistSize: 190 },
  { name: 'Swiggy', tier: 'Tier 2', priority: 2, minCGPA: 7.2, interviewDuration: 45, numPanels: 2, operatingDays: [2, 3], targetShortlistSize: 140 },
  { name: 'Zomato', tier: 'Tier 2', priority: 2, minCGPA: 7.2, interviewDuration: 45, numPanels: 2, operatingDays: [2, 3], targetShortlistSize: 140 },
  { name: 'Razorpay', tier: 'Tier 2', priority: 2, minCGPA: 7.5, interviewDuration: 45, numPanels: 2, operatingDays: [2, 3], targetShortlistSize: 130 },
  { name: 'Morgan Stanley', tier: 'Tier 2', priority: 2, minCGPA: 7.8, interviewDuration: 45, numPanels: 3, operatingDays: [1, 2], targetShortlistSize: 150 },
  { name: 'McKinsey & Company', tier: 'Tier 2', priority: 2, minCGPA: 7.8, interviewDuration: 45, numPanels: 2, operatingDays: [2, 3], targetShortlistSize: 110 },
  { name: 'Boston Consulting Group', tier: 'Tier 2', priority: 2, minCGPA: 7.8, interviewDuration: 45, numPanels: 2, operatingDays: [2, 3], targetShortlistSize: 100 },

  // --- TIER 3: Mass & Core Recruiters (10 Companies) ---
  // Min CGPA: 6.0 - 6.5, Interview Duration: 30m, Panels: 4 - 5, Days: 3-4, Target Shortlist: 250 - 380
  { name: 'Tata Consultancy Services', tier: 'Tier 3', priority: 3, minCGPA: 6.0, interviewDuration: 30, numPanels: 5, operatingDays: [3, 4], targetShortlistSize: 380 },
  { name: 'Infosys', tier: 'Tier 3', priority: 3, minCGPA: 6.0, interviewDuration: 30, numPanels: 5, operatingDays: [3, 4], targetShortlistSize: 350 },
  { name: 'Wipro', tier: 'Tier 3', priority: 3, minCGPA: 6.0, interviewDuration: 30, numPanels: 4, operatingDays: [3, 4], targetShortlistSize: 320 },
  { name: 'Accenture', tier: 'Tier 3', priority: 3, minCGPA: 6.5, interviewDuration: 30, numPanels: 5, operatingDays: [3, 4], targetShortlistSize: 360 },
  { name: 'Cognizant', tier: 'Tier 3', priority: 3, minCGPA: 6.0, interviewDuration: 30, numPanels: 4, operatingDays: [3, 4], targetShortlistSize: 310 },
  { name: 'Larsen & Toubro (L&T)', tier: 'Tier 3', priority: 3, minCGPA: 6.5, interviewDuration: 30, numPanels: 4, operatingDays: [3, 4], targetShortlistSize: 260 },
  { name: 'Tata Motors', tier: 'Tier 3', priority: 3, minCGPA: 6.5, interviewDuration: 30, numPanels: 3, operatingDays: [3, 4], targetShortlistSize: 240 },
  { name: 'Bajaj Auto', tier: 'Tier 3', priority: 3, minCGPA: 6.5, interviewDuration: 30, numPanels: 3, operatingDays: [3, 4], targetShortlistSize: 220 },
  { name: 'ITC Limited', tier: 'Tier 3', priority: 3, minCGPA: 6.5, interviewDuration: 30, numPanels: 3, operatingDays: [3, 4], targetShortlistSize: 210 },
  { name: 'Hindustan Unilever (HUL)', tier: 'Tier 3', priority: 3, minCGPA: 6.8, interviewDuration: 30, numPanels: 3, operatingDays: [3, 4], targetShortlistSize: 220 }
];

// 20 Interview Rooms across 4 floors in Academic & Placement blocks
const ROOM_DEFINITIONS = [
  // Floor 1 (Rooms 101 - 105)
  { roomNumber: 'Room 101', building: 'Placement Cell Block', floor: 1, capacity: 1 },
  { roomNumber: 'Room 102', building: 'Placement Cell Block', floor: 1, capacity: 1 },
  { roomNumber: 'Room 103', building: 'Placement Cell Block', floor: 1, capacity: 1 },
  { roomNumber: 'Room 104', building: 'Placement Cell Block', floor: 1, capacity: 1 },
  { roomNumber: 'Room 105', building: 'Placement Cell Block', floor: 1, capacity: 1 },

  // Floor 2 (Rooms 201 - 205)
  { roomNumber: 'Room 201', building: 'Placement Cell Block', floor: 2, capacity: 1 },
  { roomNumber: 'Room 202', building: 'Placement Cell Block', floor: 2, capacity: 1 },
  { roomNumber: 'Room 203', building: 'Placement Cell Block', floor: 2, capacity: 1 },
  { roomNumber: 'Room 204', building: 'Placement Cell Block', floor: 2, capacity: 1 },
  { roomNumber: 'Room 205', building: 'Placement Cell Block', floor: 2, capacity: 1 },

  // Floor 3 (Rooms 301 - 305)
  { roomNumber: 'Room 301', building: 'Academic Annex', floor: 3, capacity: 1 },
  { roomNumber: 'Room 302', building: 'Academic Annex', floor: 3, capacity: 1 },
  { roomNumber: 'Room 303', building: 'Academic Annex', floor: 3, capacity: 1 },
  { roomNumber: 'Room 304', building: 'Academic Annex', floor: 3, capacity: 1 },
  { roomNumber: 'Room 305', building: 'Academic Annex', floor: 3, capacity: 1 },

  // Floor 4 (Rooms 401 - 405)
  { roomNumber: 'Room 401', building: 'Academic Annex', floor: 4, capacity: 1 },
  { roomNumber: 'Room 402', building: 'Academic Annex', floor: 4, capacity: 1 },
  { roomNumber: 'Room 403', building: 'Academic Annex', floor: 4, capacity: 1 },
  { roomNumber: 'Room 404', building: 'Academic Annex', floor: 4, capacity: 1 },
  { roomNumber: 'Room 405', building: 'Academic Annex', floor: 4, capacity: 1 }
];

// Realistic name pools for Student generation
const FIRST_NAMES = [
  'Aarav', 'Aditi', 'Advait', 'Akash', 'Ananya', 'Aryan', 'Ayush', 'Bhavya', 'Chetan', 'Devansh',
  'Dhruv', 'Diya', 'Divyansh', 'Gauri', 'Hardik', 'Ishaan', 'Isha', 'Kabir', 'Kavya', 'Krish',
  'Kunal', 'Manav', 'Meera', 'Mohit', 'Neha', 'Nikhil', 'Pooja', 'Pranav', 'Priya', 'Rahul',
  'Rhea', 'Rishabh', 'Rohan', 'Roshni', 'Sakshi', 'Sameer', 'Sanvi', 'Siddharth', 'Simran', 'Sneha',
  'Sparsh', 'Tanvi', 'Tarun', 'Utkarsh', 'Vaibhav', 'Varun', 'Vidhi', 'Vikram', 'Yash', 'Zoya',
  'Abhinav', 'Alok', 'Ankit', 'Archit', 'Arjun', 'Ashwin', 'Chirag', 'Deepak', 'Esha', 'Gautam',
  'Harsh', 'Himanshu', 'Jatin', 'Karan', 'Kartik', 'Lavanya', 'Madhav', 'Naveen', 'Nidhi', 'Parth',
  'Piyush', 'Prateek', 'Raghav', 'Ritu', 'Sahil', 'Sanket', 'Shreya', 'Tanya', 'Uday', 'Vivek'
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Mehta', 'Patel', 'Singh', 'Reddy', 'Nair', 'Iyer', 'Chatterjee',
  'Banerjee', 'Chopra', 'Joshi', 'Bhat', 'Deshmukh', 'Kulkarni', 'Kapoor', 'Malhotra', 'Saxena', 'Agrawal',
  'Bansal', 'Mittal', 'Kumar', 'Garg', 'Chauhan', 'Pandey', 'Mishra', 'Tripathi', 'Thakur', 'Yadav',
  'Rawat', 'Srivastava', 'Mukherjee', 'Dutta', 'Menon', 'Pillai', 'Rao', 'Narayanan', 'Hegde', 'Shetty'
];

const DEPARTMENTS = [
  { name: 'Computer Science', weight: 0.32, prefix: 'CS' },
  { name: 'Information Technology', weight: 0.18, prefix: 'IT' },
  { name: 'Electronics & Communication', weight: 0.20, prefix: 'EC' },
  { name: 'Electrical & Electronics', weight: 0.10, prefix: 'EE' },
  { name: 'Mechanical Engineering', weight: 0.10, prefix: 'ME' },
  { name: 'Civil Engineering', weight: 0.05, prefix: 'CE' },
  { name: 'Chemical Engineering', weight: 0.05, prefix: 'CH' }
];

const INTERVIEWER_NAMES = [
  'Dr. Rajesh Sengupta (Principal Architect)',
  'Dr. Sunita Rao (Director of Engineering)',
  'Amitabh Sinha (Staff SWE)',
  'Priyanka Nair (Senior Engineering Manager)',
  'Suresh Nambiar (Lead System Architect)',
  'Vikramaditya Roy (VP of Tech)',
  'Anjali Kashyap (Staff Research Scientist)',
  'Hemant Deshpande (Principal Consultant)',
  'Nandini Murthy (Senior Talent Lead & Tech Evaluator)',
  'Arunabh Sen (Lead Algorithm Specialist)'
];

/**
 * Generate a realistic normally distributed CGPA
 * Skewed mean = 7.75, std = 0.95, bounds = [5.60, 9.95]
 */
function generateRealisticCGPA() {
  // Box-Muller transform for normal distribution
  let u1 = Math.random();
  let u2 = Math.random();
  while (u1 === 0) u1 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

  const mean = 7.75;
  const stdDev = 0.92;
  let cgpa = mean + z0 * stdDev;

  // Clamp within realistic range
  cgpa = Math.max(5.6, Math.min(9.95, cgpa));
  return Math.round(cgpa * 100) / 100;
}

/**
 * Pick a department based on predefined distribution weights
 */
function pickDepartment() {
  const rand = Math.random();
  let cumulative = 0;
  for (const dept of DEPARTMENTS) {
    cumulative += dept.weight;
    if (rand <= cumulative) {
      return dept;
    }
  }
  return DEPARTMENTS[0];
}

/**
 * Main Dataset Generation Service
 */
async function generateDataset(options = {}) {
  const {
    totalStudents = 800,
    clearExisting = true
  } = options;

  const startTime = Date.now();

  // 1. Clear existing dataset if requested
  if (clearExisting) {
    await Promise.all([
      Company.deleteMany({}),
      Student.deleteMany({}),
      Room.deleteMany({}),
      Panel.deleteMany({}),
      Interview.deleteMany({})
    ]);
  }

  // 2. Insert 20 Rooms
  const createdRooms = await Room.insertMany(ROOM_DEFINITIONS);

  // 3. Generate 800 Realistic Students
  const studentsToInsert = [];
  const deptCounters = {};
  DEPARTMENTS.forEach(d => { deptCounters[d.prefix] = 0; });

  for (let i = 1; i <= totalStudents; i++) {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const deptObj = pickDepartment();
    deptCounters[deptObj.prefix]++;

    const rollNumber = `2024${deptObj.prefix}${String(deptCounters[deptObj.prefix]).padStart(3, '0')}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@campus.edu`;
    const cgpa = generateRealisticCGPA();

    studentsToInsert.push({
      rollNumber,
      name: `${firstName} ${lastName}`,
      email,
      department: deptObj.name,
      cgpa,
      shortlistedCompanies: []
    });
  }

  const createdStudents = await Student.insertMany(studentsToInsert);

  // Map student ID to student doc in memory for fast shortlisting
  const studentMap = new Map();
  createdStudents.forEach(stu => {
    studentMap.set(stu._id.toString(), stu);
  });

  // 4. Create 35 Companies & their Shortlists
  // High-CGPA students should be prioritized in shortlists so they appear in multiple companies, creating natural conflicts
  const companiesToInsert = [];

  for (const compDef of COMPANY_DEFINITIONS) {
    // Filter candidate pool by minimum CGPA cutoff
    const eligibleStudents = createdStudents.filter(s => s.cgpa >= compDef.minCGPA);

    // Score eligible students to give top CGPA students higher probability of being selected
    // Weight = CGPA^2 + random jitter so higher CGPA is strongly favored, yet varied
    const scoredStudents = eligibleStudents.map(student => {
      const score = Math.pow(student.cgpa, 2.5) + (Math.random() * 15);
      return { id: student._id, score, cgpa: student.cgpa };
    });

    // Sort descending by score and pick top targetShortlistSize
    scoredStudents.sort((a, b) => b.score - a.score);
    const selectedBatch = scoredStudents.slice(0, Math.min(compDef.targetShortlistSize, scoredStudents.length));
    const shortlistStudentIds = selectedBatch.map(s => s.id);

    companiesToInsert.push({
      name: compDef.name,
      tier: compDef.tier,
      priority: compDef.priority,
      minCGPA: compDef.minCGPA,
      interviewDuration: compDef.interviewDuration,
      numPanels: compDef.numPanels,
      operatingDays: compDef.operatingDays,
      operatingHours: {
        start: '09:00',
        end: '18:00'
      },
      targetShortlistSize: compDef.targetShortlistSize,
      shortlist: shortlistStudentIds
    });
  }

  const createdCompanies = await Company.insertMany(companiesToInsert);

  // 5. Update Student records with their shortlistedCompanies
  const studentShortlistUpdates = new Map();
  createdCompanies.forEach(comp => {
    comp.shortlist.forEach(studentId => {
      const idStr = studentId.toString();
      if (!studentShortlistUpdates.has(idStr)) {
        studentShortlistUpdates.set(idStr, []);
      }
      studentShortlistUpdates.get(idStr).push(comp._id);
    });
  });

  const studentBulkOps = [];
  studentShortlistUpdates.forEach((companyIds, studentId) => {
    studentBulkOps.push({
      updateOne: {
        filter: { _id: studentId },
        update: { $set: { shortlistedCompanies: companyIds } }
      }
    });
  });

  if (studentBulkOps.length > 0) {
    await Student.bulkWrite(studentBulkOps);
  }

  // 6. Generate Panels for each Company
  const panelsToInsert = [];
  createdCompanies.forEach(comp => {
    for (let p = 1; p <= comp.numPanels; p++) {
      const interviewer1 = INTERVIEWER_NAMES[(p * 2) % INTERVIEWER_NAMES.length];
      const interviewer2 = INTERVIEWER_NAMES[(p * 2 + 1) % INTERVIEWER_NAMES.length];

      panelsToInsert.push({
        name: `${comp.name} - Panel ${p}`,
        company: comp._id,
        panelNumber: p,
        interviewers: [interviewer1, interviewer2],
        operatingDays: comp.operatingDays
      });
    }
  });

  const createdPanels = await Panel.insertMany(panelsToInsert);

  // 7. Calculate Conflict & Distribution Analytics for response
  const updatedStudents = await Student.find({}, 'cgpa shortlistedCompanies');
  let zeroShortlists = 0;
  let oneToTwoShortlists = 0;
  let threeToFiveShortlists = 0;
  let sixPlusShortlists = 0;
  let highCGPAOverlapCount = 0; // CGPA >= 8.5 with 4+ shortlists
  let totalShortlistPairs = 0;

  updatedStudents.forEach(stu => {
    const count = stu.shortlistedCompanies.length;
    totalShortlistPairs += count;
    if (count === 0) zeroShortlists++;
    else if (count <= 2) oneToTwoShortlists++;
    else if (count <= 5) threeToFiveShortlists++;
    else sixPlusShortlists++;

    if (stu.cgpa >= 8.5 && count >= 4) {
      highCGPAOverlapCount++;
    }
  });

  const avgShortlistsPerStudent = (totalShortlistPairs / totalStudents).toFixed(2);
  const topCgpaStudents = updatedStudents.filter(s => s.cgpa >= 8.5);
  const avgShortlistsTopCgpa = (
    topCgpaStudents.reduce((acc, s) => acc + s.shortlistedCompanies.length, 0) / (topCgpaStudents.length || 1)
  ).toFixed(2);

  const durationMs = Date.now() - startTime;

  return {
    success: true,
    message: 'Placement dataset successfully generated',
    executionTimeMs: durationMs,
    summary: {
      totalCompanies: createdCompanies.length,
      totalStudents: createdStudents.length,
      totalRooms: createdRooms.length,
      totalPanels: createdPanels.length,
      totalShortlistAllocations: totalShortlistPairs,
      avgShortlistsPerStudent: parseFloat(avgShortlistsPerStudent),
      avgShortlistsForTopStudentsCGPA8_5Plus: parseFloat(avgShortlistsTopCgpa)
    },
    tierBreakdown: {
      tier1: createdCompanies.filter(c => c.tier === 'Tier 1').length,
      tier2: createdCompanies.filter(c => c.tier === 'Tier 2').length,
      tier3: createdCompanies.filter(c => c.tier === 'Tier 3').length
    },
    conflictAnalytics: {
      studentsWithZeroShortlists: zeroShortlists,
      studentsWith1To2Shortlists: oneToTwoShortlists,
      studentsWith3To5Shortlists: threeToFiveShortlists,
      studentsWith6PlusShortlists: sixPlusShortlists,
      highCgpaMultiShortlistConflictCandidates: highCGPAOverlapCount
    },
    sampleData: {
      sampleCompanies: createdCompanies.slice(0, 3).map(c => ({
        name: c.name,
        tier: c.tier,
        priority: c.priority,
        minCGPA: c.minCGPA,
        interviewDurationMinutes: c.interviewDuration,
        panels: c.numPanels,
        operatingDays: c.operatingDays,
        shortlistCount: c.shortlist.length
      })),
      sampleRooms: createdRooms.slice(0, 3).map(r => ({
        roomNumber: r.roomNumber,
        building: r.building,
        floor: r.floor
      })),
      samplePanels: createdPanels.slice(0, 3).map(p => ({
        panelName: p.name,
        panelNumber: p.panelNumber,
        interviewers: p.interviewers
      }))
    }
  };
}

module.exports = {
  generateDataset,
  COMPANY_DEFINITIONS,
  ROOM_DEFINITIONS
};
