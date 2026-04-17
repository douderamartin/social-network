const Datastore = require('@seald-io/nedb');
const path      = require('path');

const dbDir = path.join(__dirname, 'data');
require('fs').mkdirSync(dbDir, { recursive: true });

const db = {
  users:    new Datastore({ filename: path.join(dbDir, 'users.db'),    autoload: true }),
  posts:    new Datastore({ filename: path.join(dbDir, 'posts.db'),    autoload: true }),
  comments: new Datastore({ filename: path.join(dbDir, 'comments.db'), autoload: true }),
  likes:    new Datastore({ filename: path.join(dbDir, 'likes.db'),    autoload: true }),
};

// Ensure unique index on likes (userId + postId)
db.likes.ensureIndex({ fieldName: 'userId' });
db.likes.ensureIndex({ fieldName: 'postId' });
db.users.ensureIndex({ fieldName: 'username', unique: true });

// @seald-io/nedb má nativní async metody (findAsync, insertAsync, countAsync, atd.)
// žádné další wrappery nejsou potřeba

module.exports = db;
