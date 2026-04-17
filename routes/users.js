const express = require('express');
const db      = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

async function enrichPost(post, currentUserId) {
  const author   = await db.users.findOneAsync({ _id: post.authorId });
  const likes    = await db.likes.findAsync({ postId: post._id });
  const comments = await db.comments.findAsync({ postId: post._id });
  comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const enrichedComments = await Promise.all(comments.map(async c => {
    const ca = await db.users.findOneAsync({ _id: c.authorId });
    return { id: c._id, text: c.text, createdAt: c.createdAt,
      author: { id: ca._id, firstName: ca.firstName, lastName: ca.lastName, avatar: ca.avatar } };
  }));
  const enrichedLikes = await Promise.all(likes.map(async l => {
    const lu = await db.users.findOneAsync({ _id: l.userId });
    return { user: { id: lu._id, firstName: lu.firstName, lastName: lu.lastName }, date: l.createdAt };
  }));
  enrichedLikes.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    id: post._id, title: post.title, text: post.text, image: post.image, createdAt: post.createdAt,
    author: { id: author._id, firstName: author.firstName, lastName: author.lastName, avatar: author.avatar },
    likesCount: likes.length,
    liked: currentUserId ? likes.some(l => l.userId === currentUserId) : false,
    likes: enrichedLikes,
    comments: enrichedComments
  };
}

// GET /api/me
router.get('/api/me', requireAuth, (req, res) =>
  res.json({ userId: req.session.userId, username: req.session.username, fullName: req.session.fullName }));

// GET /api/users
router.get('/api/users', requireAuth, async (req, res) => {
  try {
    const users = await db.users.findAsync({});
    users.sort((a, b) => a.lastName.localeCompare(b.lastName, 'cs') || a.firstName.localeCompare(b.firstName, 'cs'));
    res.json(users.map(u => ({ id: u._id, firstName: u.firstName, lastName: u.lastName, age: u.age, gender: u.gender, avatar: u.avatar })));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Chyba serveru' }); }
});

// GET /api/users/:id
router.get('/api/users/:id', requireAuth, async (req, res) => {
  try {
    const user = await db.users.findOneAsync({ _id: req.params.id });
    if (!user) return res.status(404).json({ error: 'Uživatel nenalezen' });

    // Own posts
    const ownPostsRaw = await db.posts.findAsync({ authorId: user._id });
    ownPostsRaw.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Posts liked by user
    const likedLinks    = await db.likes.findAsync({ userId: user._id });
    const likedPostIds  = likedLinks.map(l => l.postId);

    // Posts commented by user
    const commentLinks  = await db.comments.findAsync({ authorId: user._id });
    const commentedIds  = commentLinks.map(c => c.postId);

    const ownIds = new Set(ownPostsRaw.map(p => p._id));
    const activityIds = [...new Set([...likedPostIds, ...commentedIds])].filter(id => !ownIds.has(id));

    const activityPostsRaw = await Promise.all(activityIds.map(id => db.posts.findOneAsync({ _id: id })));
    const validActivity = activityPostsRaw.filter(Boolean);
    validActivity.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      user: { id: user._id, firstName: user.firstName, lastName: user.lastName, age: user.age, gender: user.gender, avatar: user.avatar },
      ownPosts:      await Promise.all(ownPostsRaw.map(p => enrichPost(p, req.session.userId))),
      activityPosts: await Promise.all(validActivity.map(p => enrichPost(p, req.session.userId)))
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Chyba serveru' }); }
});

module.exports = router;
