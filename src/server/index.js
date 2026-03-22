require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// MongoDB connection (optional - app works with in-memory fallback)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gembarounds';
let dbConnected = false;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    dbConnected = true;
  })
  .catch(err => {
    console.warn('MongoDB not available - using in-memory storage');
    console.warn('To use MongoDB, set MONGO_URI environment variable or install MongoDB locally');
    dbConnected = false;
  });

// Make db status available to routes
app.use((req, res, next) => {
  req.dbConnected = dbConnected;
  next();
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// API routes
const walksRouter = require('./routes/walks');
const aiRouter = require('./routes/ai');
const uploadsRouter = require('./routes/uploads');
const authRouter = require('./routes/auth');
app.use('/api/walks', walksRouter);
app.use('/api/ai', aiRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/auth', authRouter);
const iotRouter = require('./routes/iot');
app.use('/api/iot', iotRouter);

// Wire up scheduler walk creator (in-memory)
const scheduler = require('./scheduler');
const memWalkCreator = async (walkData) => {
  try {
    // Use the internal walks API to create a scheduled walk
    const http = require('http');
    const postData = JSON.stringify({ ...walkData, status: 'scheduled' });
    const options = { hostname: 'localhost', port, path: '/api/walks/schedule', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } };
    const req = http.request(options);
    req.write(postData);
    req.end();
  } catch (e) { console.error('Scheduler walk creation failed:', e); }
};
scheduler.setWalkCreator(memWalkCreator);

// Serve frontend for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(port, () => {
  console.log(`GembaRounds server running on http://localhost:${port}`);
});
