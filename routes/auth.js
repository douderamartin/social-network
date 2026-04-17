const express = require('express');
const bcrypt  = require('bcryptjs');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../db');
const { redirectIfAuth } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads')),
  filename:    (req, file, cb) => cb(null, `avatar_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Pouze obrázky'))
});

router.get('/login', redirectIfAuth, (req, res) =>
  res.sendFile(path.join(__dirname, '../views/login.html')));

router.post('/login', redirectIfAuth, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Vyplňte přihlašovací údaje' });
    const user = await db.users.findOneAsync({ username });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Nesprávné přihlašovací údaje' });
    req.session.userId   = user._id;
    req.session.username = user.username;
    req.session.fullName = `${user.firstName} ${user.lastName}`;
    return res.json({ success: true });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Chyba serveru' }); }
});

router.get('/register', redirectIfAuth, (req, res) =>
  res.sendFile(path.join(__dirname, '../views/register.html')));

router.post('/register', redirectIfAuth, upload.single('avatar'), async (req, res) => {
  try {
    const { firstName, lastName, age, gender, username, password } = req.body;
    if (!firstName || !lastName || !age || !gender || !username || !password) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Vyplňte všechna povinná pole' });
    }
    if (parseInt(age) < 13) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Musíte být starší 13 let' });
    }
    const exists = await db.users.findOneAsync({ username });
    if (exists) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(409).json({ error: 'Uživatelské jméno je již obsazeno' });
    }
    const hash   = await bcrypt.hash(password, 10);
    const avatar = req.file ? `/uploads/${req.file.filename}` : null;
    const user   = await db.users.insertAsync({ firstName, lastName, age: parseInt(age), gender, username, password: hash, avatar, createdAt: new Date() });
    req.session.userId   = user._id;
    req.session.username = user.username;
    req.session.fullName = `${user.firstName} ${user.lastName}`;
    return res.json({ success: true });
  } catch (e) {
    if (req.file) fs.unlinkSync(req.file.path);
    if (e.errorType === 'uniqueViolated') return res.status(409).json({ error: 'Uživatelské jméno je již obsazeno' });
    console.error(e); return res.status(500).json({ error: 'Chyba serveru' });
  }
});

router.post('/logout', (req, res) => req.session.destroy(() => res.json({ success: true })));

module.exports = router;
