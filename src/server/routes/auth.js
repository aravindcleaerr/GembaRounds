const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'gembarounds-secret-key-change-in-production';

// In-memory user store (fallback when MongoDB is not available)
const memUsers = [];

let User;
try { User = require('../models/User'); } catch (e) {}

// ============ REGISTER ============
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (!req.dbConnected) {
      if (memUsers.find(u => u.email === email.toLowerCase())) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = {
        _id: 'user_' + (memUsers.length + 1),
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || 'operator',
        department: department || '',
        kaizenPoints: 0,
        createdAt: new Date().toISOString()
      };
      memUsers.push(user);
      const token = jwt.sign({ id: user._id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role, department: user.department } });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const user = new User({ name, email, password, role: role || 'operator', department: department || '' });
    await user.save();
    const token = jwt.sign({ id: user._id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role, department: user.department } });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ============ LOGIN ============
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!req.dbConnected) {
      const user = memUsers.find(u => u.email === email.toLowerCase());
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
      const token = jwt.sign({ id: user._id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role, department: user.department } });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role, department: user.department } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ============ GET CURRENT USER ============
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: decoded });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
