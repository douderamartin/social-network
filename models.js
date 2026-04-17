const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});

// --- MODELS ---

const User = sequelize.define('User', {
  id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  firstName: { type: DataTypes.STRING, allowNull: false },
  lastName:  { type: DataTypes.STRING, allowNull: false },
  age:       { type: DataTypes.INTEGER, allowNull: false },
  gender:    { type: DataTypes.ENUM('male', 'female', 'other'), allowNull: false },
  avatar:    { type: DataTypes.STRING, defaultValue: null },
  username:  { type: DataTypes.STRING, allowNull: false, unique: true },
  password:  { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'users' });

const Post = sequelize.define('Post', {
  id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title:     { type: DataTypes.STRING, allowNull: false },
  text:      { type: DataTypes.TEXT, allowNull: false },
  image:     { type: DataTypes.STRING, defaultValue: null },
  authorId:  { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'id' } }
}, { tableName: 'posts' });

const Comment = sequelize.define('Comment', {
  id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  text:     { type: DataTypes.TEXT, allowNull: false },
  authorId: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'id' } },
  postId:   { type: DataTypes.INTEGER, allowNull: false, references: { model: Post, key: 'id' } }
}, { tableName: 'comments' });

const Like = sequelize.define('Like', {
  id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId:    { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'id' } },
  postId:    { type: DataTypes.INTEGER, allowNull: false, references: { model: Post, key: 'id' } }
}, {
  tableName: 'likes',
  indexes: [{ unique: true, fields: ['userId', 'postId'] }]
});

// --- ASSOCIATIONS ---
User.hasMany(Post,    { foreignKey: 'authorId', as: 'posts' });
Post.belongsTo(User,  { foreignKey: 'authorId', as: 'author' });

User.hasMany(Comment, { foreignKey: 'authorId', as: 'comments' });
Comment.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
Comment.belongsTo(Post, { foreignKey: 'postId',   as: 'post' });
Post.hasMany(Comment,   { foreignKey: 'postId',   as: 'comments' });

User.hasMany(Like,   { foreignKey: 'userId', as: 'likes' });
Like.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Like.belongsTo(Post, { foreignKey: 'postId', as: 'post' });
Post.hasMany(Like,   { foreignKey: 'postId', as: 'likes' });

module.exports = { sequelize, User, Post, Comment, Like };
