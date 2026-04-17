const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads')),
  filename:    (req, file, cb) => cb(null, `post_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Pouze obrázky'))
});

// Enrich a list of posts with author, likes, comments
async function enrichPosts(posts, currentUserId) {
  return Promise.all(posts.map(async post => {
    const author   = await db.users.findOneAsync({ _id: post.authorId });
    const likes    = await db.likes.findAsync({ postId: post._id });
    const comments = await db.comments.findAsync({ postId: post._id });
    comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const enrichedComments = await Promise.all(comments.map(async c => {
      const ca = await db.users.findOneAsync({ _id: c.authorId });
      return { id: c._id, text: c.text, createdAt: c.createdAt,
        isOwner: currentUserId === c.authorId,
        author: { id: ca._id, firstName: ca.firstName, lastName: ca.lastName, avatar: ca.avatar } };
    }));

    const enrichedLikes = await Promise.all(likes.map(async l => {
      const lu = await db.users.findOneAsync({ _id: l.userId });
      return { user: { id: lu._id, firstName: lu.firstName, lastName: lu.lastName }, date: l.createdAt };
    }));
    enrichedLikes.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      id: post._id, title: post.title, text: post.text, image: post.image, createdAt: post.createdAt,
      isOwner: currentUserId === post.authorId,
      author: { id: author._id, firstName: author.firstName, lastName: author.lastName, avatar: author.avatar },
      likesCount: likes.length,
      liked: currentUserId ? likes.some(l => l.userId === currentUserId) : false,
      likes: enrichedLikes,
      comments: enrichedComments
    };
  }));
}

// GET /api/posts
router.get('/api/posts', requireAuth, async (req, res) => {
  try {
    const posts = await db.posts.findAsync({});
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(await enrichPosts(posts, req.session.userId));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Chyba serveru' }); }
});

// POST /api/posts
router.post('/api/posts', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { title, text } = req.body;
    if (!title || !text) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Vyplňte nadpis a text' });
    }
    const image = req.file ? `/uploads/${req.file.filename}` : null;
    const post  = await db.posts.insertAsync({ title, text, image, authorId: req.session.userId, createdAt: new Date() });
    const rich  = await enrichPosts([post], req.session.userId);
    res.status(201).json(rich[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Chyba serveru' }); }
});

// POST /api/posts/:id/like  (toggle)
router.post('/api/posts/:id/like', requireAuth, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.session.userId;
    const post   = await db.posts.findOneAsync({ _id: postId });
    if (!post) return res.status(404).json({ error: 'Příspěvek nenalezen' });
    const existing = await db.likes.findOneAsync({ userId, postId });
    if (existing) {
      await db.likes.removeAsync({ _id: existing._id }, {});
      return res.json({ liked: false });
    } else {
      await db.likes.insertAsync({ userId, postId, createdAt: new Date() });
      return res.json({ liked: true });
    }
  } catch (e) { console.error(e); res.status(500).json({ error: 'Chyba serveru' }); }
});

// POST /api/posts/:id/comments
router.post('/api/posts/:id/comments', requireAuth, async (req, res) => {
  try {
    const postId = req.params.id;
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text komentáře je povinný' });
    const post = await db.posts.findOneAsync({ _id: postId });
    if (!post) return res.status(404).json({ error: 'Příspěvek nenalezen' });
    const comment = await db.comments.insertAsync({ text, authorId: req.session.userId, postId, createdAt: new Date() });
    const author  = await db.users.findOneAsync({ _id: req.session.userId });
    res.status(201).json({
      id: comment._id, text: comment.text, createdAt: comment.createdAt,
      author: { id: author._id, firstName: author.firstName, lastName: author.lastName, avatar: author.avatar }
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Chyba serveru' }); }
});

// DELETE /api/posts/:id
router.delete('/api/posts/:id', requireAuth, async (req, res) => {
  try {
    const post = await db.posts.findOneAsync({ _id: req.params.id });
    if (!post) return res.status(404).json({ error: 'Příspěvek nenalezen' });
    if (post.authorId !== req.session.userId) return res.status(403).json({ error: 'Nemáte oprávnění' });
    if (post.image) {
      const imgPath = path.join(__dirname, '../public', post.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    await db.posts.removeAsync({ _id: req.params.id }, {});
    await db.comments.removeAsync({ postId: req.params.id }, { multi: true });
    await db.likes.removeAsync({ postId: req.params.id }, { multi: true });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Chyba serveru' }); }
});

// DELETE /api/posts/:id/comments/:commentId
router.delete('/api/posts/:id/comments/:commentId', requireAuth, async (req, res) => {
  try {
    const comment = await db.comments.findOneAsync({ _id: req.params.commentId });
    if (!comment) return res.status(404).json({ error: 'Komentář nenalezen' });
    if (comment.authorId !== req.session.userId) return res.status(403).json({ error: 'Nemáte oprávnění' });
    await db.comments.removeAsync({ _id: req.params.commentId }, {});
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Chyba serveru' }); }
});


module.exports = router;
