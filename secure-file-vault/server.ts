import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const app = express();
const PORT = 3000;

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Database setup
const db = new Database('files.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    originalName TEXT NOT NULL,
    mimeType TEXT NOT NULL,
    size INTEGER NOT NULL,
    hash TEXT NOT NULL,
    iv TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Encryption key (In production, this should be in an environment variable)
// For demonstration, we use a fixed key generated once or hardcoded.
const ENCRYPTION_KEY = crypto.scryptSync('my-secure-password', 'salt', 32);

const upload = multer({ dest: UPLOADS_DIR });

app.use(express.json());

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);

    // Step B: Scramble the file using a secret key (AES Encryption)
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    const encryptedBuffer = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);

    // Step A: Calculate its "fingerprint" (SHA-256 hash) of the scrambled file
    const hashSum = crypto.createHash('sha256');
    hashSum.update(encryptedBuffer);
    const hexHash = hashSum.digest('hex');

    // Step C: Save the scrambled file on the computer
    const encryptedFilename = `${req.file.filename}.enc`;
    const encryptedFilePath = path.join(UPLOADS_DIR, encryptedFilename);
    fs.writeFileSync(encryptedFilePath, encryptedBuffer);

    // Remove original unencrypted file
    fs.unlinkSync(filePath);

    // Save the fingerprint in a database
    const stmt = db.prepare(`
      INSERT INTO files (filename, originalName, mimeType, size, hash, iv)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      encryptedFilename,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      hexHash,
      iv.toString('hex')
    );

    res.json({
      id: info.lastInsertRowid,
      originalName: req.file.originalname,
      hash: hexHash,
      message: 'File uploaded, encrypted, and fingerprinted successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process file' });
  }
});

app.get('/api/files', (req, res) => {
  try {
    const stmt = db.prepare('SELECT id, originalName, mimeType, size, hash, createdAt FROM files ORDER BY createdAt DESC');
    const files = stmt.all();
    res.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files', details: String(error) });
  }
});

app.get('/api/verify/:id', (req, res) => {
  const stmt = db.prepare('SELECT * FROM files WHERE id = ?');
  const file = stmt.get(req.params.id) as any;

  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    const encryptedFilePath = path.join(UPLOADS_DIR, file.filename);
    const encryptedBuffer = fs.readFileSync(encryptedFilePath);

    // Calculate a new fingerprint of the scrambled file
    const hashSum = crypto.createHash('sha256');
    hashSum.update(encryptedBuffer);
    const currentHash = hashSum.digest('hex');

    // Compare the new fingerprint to the old one saved in the database
    const isValid = currentHash === file.hash;

    res.json({
      id: file.id,
      originalHash: file.hash,
      currentHash: currentHash,
      isValid: isValid,
      message: isValid ? 'Integrity verified: File is unmodified.' : 'Warning: This file has been modified!'
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ 
      error: 'Failed to verify file. File might be missing or unreadable.',
      isValid: false
    });
  }
});

app.delete('/api/files', (req, res) => {
  try {
    // Get all files to delete them from disk
    const stmt = db.prepare('SELECT filename FROM files');
    const files = stmt.all() as { filename: string }[];

    for (const file of files) {
      const filePath = path.join(UPLOADS_DIR, file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Clear the database
    db.prepare('DELETE FROM files').run();
    
    res.json({ message: 'All files cleared successfully' });
  } catch (error) {
    console.error('Error clearing files:', error);
    res.status(500).json({ error: 'Failed to clear files' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
