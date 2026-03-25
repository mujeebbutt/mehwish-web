const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // serve frontend files

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'admin',
  database: 'mehwish_institute'
});

db.connect(err => {
  if (err) throw err;
  console.log('✅ MySQL Connected');
});

// Signup route
app.post('/api/signup', async (req, res) => {
  const { name, email, password, course } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }

  try {
    db.query('SELECT * FROM students WHERE email = ?', [email], async (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      if (results.length > 0) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const sql = 'INSERT INTO students (name, email, password, course) VALUES (?, ?, ?, ?)';
      db.query(sql, [name, email, hashedPassword, course || null], (err, result) => {
        if (err) {
          console.error('Error inserting student:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json({ message: 'Student registered successfully', id: result.insertId });
      });
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ✅ Fixed Login route
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  db.query('SELECT * FROM students WHERE email = ?', [email], async (err, results) => {
    if (err) {
      console.error('DB error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      console.log(`Login failed: Email ${email} not found`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = results[0];
    console.log('User found:', user.email);

    const hashedPassword = user.password;

    // 🛡️ Prevent bcrypt.compare error
    if (!hashedPassword || !password) {
      console.error('Missing data for password comparison');
      return res.status(500).json({ error: 'Server error: incomplete credentials' });
    }

    try {
      const passwordMatch = await bcrypt.compare(password, hashedPassword);
      console.log('Password match:', passwordMatch);

      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          course: user.course
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal error' });
    }
  });
});

// Get all students (optional, for admin etc.)
app.get('/api/students', (req, res) => {
  db.query('SELECT id, name, email, course FROM students', (err, results) => {
    if (err) {
      console.error('Error fetching students:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
