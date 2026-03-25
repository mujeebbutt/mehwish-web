const express = require('express');
const router = express.Router();

// Example student POST route
router.post('/add', async (req, res) => {
  const { name, email, major, semester } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const pool = require('../db');
    const [result] = await pool.query(
      'INSERT INTO students (name, email, major, semester) VALUES (?, ?, ?, ?)',
      [name, email, major, semester]
    );
    res.json({ message: 'Student added successfully', studentId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add student' });
  }
});

module.exports = router;
