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
    const { name, email, password, role, department, factory } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password required' });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const user = new User({ name, email, password, role: role || 'operator', department: department || '', factory: factory || '' });
    await user.save();
    const token = jwt.sign({ id: user._id, name: user.name, role: user.role, factory: user.factory }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role, department: user.department, factory: user.factory } });
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
    const token = jwt.sign({ id: user._id, name: user.name, role: user.role, factory: user.factory }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role, department: user.department, factory: user.factory } });
  } catch (e) { res.status(500).json({ error: 'Login failed' }); }
});

// Admin: list all users
app.get('/api/auth/users', async (req, res) => {
  try {
    await connectDB();
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch users' }); }
});

// Admin: update user role
app.put('/api/auth/users/:id', async (req, res) => {
  try {
    await connectDB();
    const { role, department } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { role, department }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (e) { res.status(500).json({ error: 'Failed to update user' }); }
});

// Admin: delete user
app.delete('/api/auth/users/:id', async (req, res) => {
  try {
    await connectDB();
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (e) { res.status(500).json({ error: 'Failed to delete user' }); }
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
