const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const connectDB = require('./_lib/db');
const { User } = require('./_lib/models');
const rateLimit = require('./_lib/ratelimit');

const app = express();
app.use(cors());
app.use(express.json());
// Rate limiting: 10 requests per minute (stricter for auth)
app.use(rateLimit(10));

app.use(async (req, res, next) => { await connectDB(); next(); });

const JWT_SECRET = process.env.JWT_SECRET || 'gembarounds-secret-key-change-in-production';

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password required' });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const user = new User({ name, email, password, role: role || 'operator', department: department || '' });
    await user.save();
    const token = jwt.sign({ id: user._id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role, department: user.department } });
  } catch (e) { res.status(500).json({ error: 'Registration failed' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role, department: user.department } });
  } catch (e) { res.status(500).json({ error: 'Login failed' }); }
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  try {
    const token = authHeader.replace('Bearer ', '');
    res.json({ user: jwt.verify(token, JWT_SECRET) });
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

module.exports = app;
