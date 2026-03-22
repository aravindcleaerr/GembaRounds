const express = require('express');
const cors = require('cors');
const multer = require('multer');

const app = express();
app.use(cors());

// Use memory storage for serverless (files stored as buffer)
// In production, integrate with Vercel Blob, Cloudinary, or S3
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for serverless
  fileFilter: (req, file, cb) => {
    if (/^(image|video)\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image and video files allowed'));
  }
});

// For now, convert to base64 data URLs (works without external storage)
// For production, replace with Vercel Blob or Cloudinary
app.post('/api/uploads/file', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  const fileType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
  res.json({ url: dataUrl, filename: req.file.originalname, originalName: req.file.originalname, fileType, size: req.file.size });
});

app.post('/api/uploads/files', upload.array('files', 5), (req, res) => {
  if (!req.files || !req.files.length) return res.status(400).json({ error: 'No files uploaded' });
  const uploaded = req.files.map(f => ({
    url: `data:${f.mimetype};base64,${f.buffer.toString('base64')}`,
    filename: f.originalname,
    originalName: f.originalname,
    fileType: f.mimetype.startsWith('video') ? 'video' : 'image',
    size: f.size
  }));
  res.json({ files: uploaded });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 10MB)' : err.message });
  if (err) return res.status(400).json({ error: err.message });
  next();
});

module.exports = app;
