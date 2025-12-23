require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// --- THIS FIXES THE "Cannot GET /" ERROR ---
// It tells the server to share your index.html, css, and js files
app.use(express.static(__dirname));

// 1. MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// 2. Schema Setup (Auto-Expires after 30 Minutes)
const itemSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  type: { type: String, required: true, enum: ['text', 'file'] },
  content: { type: String },           
  fileData: { type: Buffer },          
  fileName: { type: String },
  mimeType: { type: String },
  createdAt: { type: Date, default: Date.now, index: { expires: '30m' } } 
});

const Item = mongoose.model('Item', itemSchema);

// Multer setup (File handling)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 16 * 1024 * 1024 } 
});

// Helper: Generate Code
async function generateUniqueCode() {
  let code;
  let isUnique = false;
  while (!isUnique) {
    code = Math.floor(1000 + Math.random() * 9000).toString();
    const existing = await Item.findOne({ code });
    if (!existing) isUnique = true;
  }
  return code;
}

// 3. API Routes

// Upload
app.post('/api/upload-item', upload.single('file'), async (req, res) => {
  try {
    const code = await generateUniqueCode();
    
    if (req.file) {
      const newItem = new Item({
        code,
        type: 'file',
        fileData: req.file.buffer,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype
      });
      await newItem.save();
    } 
    else if (req.body.text) {
      const newItem = new Item({
        code,
        type: 'text',
        content: req.body.text
      });
      await newItem.save();
    } else {
      return res.status(400).json({ success: false, error: 'No text or file provided' });
    }

    res.json({ success: true, code });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get Item
app.get('/api/get-item', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ success: false, error: 'Code required' });

    const item = await Item.findOne({ code });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found or expired' });
    }

    if (item.type === 'text') {
      return res.json({ 
        success: true, 
        itemType: 'text', 
        content: item.content 
      });
    } else {
      const fileBase64 = `data:${item.mimeType};base64,${item.fileData.toString('base64')}`;
      return res.json({
        success: true,
        itemType: 'file',
        fileName: item.fileName,
        fileUrl: fileBase64 
      });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});