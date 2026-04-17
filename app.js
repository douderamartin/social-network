const express      = require('express');
const session      = require('express-session');
const FileStore    = require('session-file-store')(session);
const path         = require('path');
const fs           = require('fs');
const bcrypt       = require('bcryptjs');

const db           = require('./db');
const authRoutes   = require('./routes/auth');
const postRoutes   = require('./routes/posts');
const userRoutes   = require('./routes/users');
const { requireAuth } = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 3000;

const uploadsDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const sessionsDir = path.join(__dirname, 'data/sessions');
fs.mkdirSync(sessionsDir, { recursive: true });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret:            'socialnet-secret-2024',
  resave:            false,
  saveUninitialized: false,
  store:             new FileStore({ path: sessionsDir, ttl: 86400 * 7, retries: 0, logFn: () => {} }),
  cookie:            { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

app.use('/', authRoutes);
app.use('/', postRoutes);
app.use('/', userRoutes);

app.get('/',          (req, res) => res.redirect(req.session.userId ? '/wall' : '/login'));
app.get('/wall',      requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'views/wall.html')));
app.get('/users',     requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'views/users.html')));
app.get('/users/:id', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'views/user-detail.html')));

async function seed() {
  const count = await db.users.countAsync({});
  if (count > 0) return;
  console.log('Seeding test data...');
  const hash = await bcrypt.hash('heslo123', 10);
  const now = (m=0) => new Date(Date.now() - m*60000);
  const u1 = await db.users.insertAsync({ firstName:'Anna',  lastName:'Nováková',   age:22, gender:'female', username:'anna',  password:hash, avatar:null, createdAt:now() });
  const u2 = await db.users.insertAsync({ firstName:'Petr',  lastName:'Svoboda',    age:25, gender:'male',   username:'petr',  password:hash, avatar:null, createdAt:now() });
  const u3 = await db.users.insertAsync({ firstName:'Lucie', lastName:'Dvořáčková', age:20, gender:'female', username:'lucie', password:hash, avatar:null, createdAt:now() });
  const u4 = await db.users.insertAsync({ firstName:'Tomáš', lastName:'Kratochvíl', age:30, gender:'male',   username:'tomas', password:hash, avatar:null, createdAt:now() });
  const p1 = await db.posts.insertAsync({ title:'Vítejte na síti!',     text:'Toto je první příspěvek na naší sociální síti. Těším se na vaše příspěvky! 🎉', authorId:u1._id, image:null, createdAt:now(120) });
  const p2 = await db.posts.insertAsync({ title:'Krásný výlet do hor',  text:'Minulý víkend jsem byl na výletě v Krkonoších. Počasí bylo nádherné a příroda úžasná!', authorId:u2._id, image:null, createdAt:now(90) });
  const p3 = await db.posts.insertAsync({ title:'Doporučení na knihu',  text:'Právě jsem dočetla "Dívka ve vlaku" od Pauly Hawkins. Naprosto strhující čtení, doporučuji všem!', authorId:u3._id, image:null, createdAt:now(60) });
  const p4 = await db.posts.insertAsync({ title:'Recept na svíčkovou', text:'Sdílím svůj rodinný recept na svíčkovou na smetaně. Tajemství je v dlouhém dušení zeleniny...', authorId:u4._id, image:null, createdAt:now(30) });
  await db.comments.insertAsync({ text:'Moc hezký příspěvek!',                    authorId:u2._id, postId:p1._id, createdAt:now(110) });
  await db.comments.insertAsync({ text:'Krkonoše jsou super! Byl jsi na Sněžce?', authorId:u3._id, postId:p2._id, createdAt:now(80) });
  await db.comments.insertAsync({ text:'Tuhle knihu jsem taky četla, výborná!',   authorId:u1._id, postId:p3._id, createdAt:now(50) });
  await db.comments.insertAsync({ text:'Díky za recept, určitě vyzkouším!',       authorId:u1._id, postId:p4._id, createdAt:now(20) });
  await db.likes.insertAsync({ userId:u2._id, postId:p1._id, createdAt:now(115) });
  await db.likes.insertAsync({ userId:u3._id, postId:p1._id, createdAt:now(113) });
  await db.likes.insertAsync({ userId:u4._id, postId:p1._id, createdAt:now(111) });
  await db.likes.insertAsync({ userId:u1._id, postId:p2._id, createdAt:now(85) });
  await db.likes.insertAsync({ userId:u3._id, postId:p2._id, createdAt:now(83) });
  await db.likes.insertAsync({ userId:u2._id, postId:p3._id, createdAt:now(55) });
  await db.likes.insertAsync({ userId:u1._id, postId:p4._id, createdAt:now(25) });
  console.log('Testovací data vytvořena. Login: anna / heslo123');
}

app.listen(PORT, async () => {
  await seed();
  console.log(`Server běží na http://localhost:${PORT}`);
});
