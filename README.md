# SocialNet – Dokumentace

## Popis aplikace

SocialNet je responzivní webová sociální síť pro registrované uživatele. Umožňuje:
- Registraci a přihlášení uživatelů
- Sdílení příspěvků (s textem a volitelným obrázkem)
- Komentování příspěvků
- Lajkování příspěvků (max. 1 lajk na příspěvek na uživatele)
- Prohlížení profilu uživatelů a jejich aktivity

---

## Technologie

| Vrstva     | Technologie                              |
|------------|------------------------------------------|
| Backend    | Node.js + Express                        |
| Frontend   | Vanilla JavaScript + HTML + CSS          |
| Databáze   | SQLite (via Sequelize ORM)               |
| Autentizace| express-session + bcrypt                 |
| Upload     | multer                                   |

> Databáze je SQLite pro snadné spuštění. Pro produkci lze v `models.js` přepnout na MySQL/PostgreSQL změnou `dialect` a přidáním connection stringů.

---

## Instalace a spuštění

### Požadavky
- Node.js 18+ ([nodejs.org](https://nodejs.org))
- npm (součást Node.js)

### Kroky

```bash
# 1. Nainstalujte závislosti
npm install

# 2. Spusťte server
npm start

# Nebo pro vývoj s automatickým restartem:
npm run dev
```

Server poběží na: **http://localhost:3000**

Při prvním spuštění se automaticky:
- Vytvoří databáze (`database.sqlite`)
- Naplní testovacími daty (4 uživatelé, příspěvky, komentáře, lajky)

### Testovací přihlašovací údaje

| Uživatel      | Jméno    | Heslo      |
|---------------|----------|------------|
| Anna Nováková | anna     | heslo123   |
| Petr Svoboda  | petr     | heslo123   |
| Lucie Dvořáčková | lucie | heslo123   |
| Tomáš Kratochvíl | tomas | heslo123  |

---

## Struktura projektu

```
socialnet/
├── app.js              # Hlavní soubor – konfigurace Express, init DB
├── models.js           # Sequelize modely (User, Post, Comment, Like)
├── middleware/
│   └── auth.js         # Middleware pro ochranu tras
├── routes/
│   ├── auth.js         # Login, registrace, logout
│   ├── posts.js        # CRUD příspěvků, lajky, komentáře
│   └── users.js        # Výpis uživatelů, detail uživatele, /api/me
├── views/
│   ├── login.html
│   ├── register.html
│   ├── wall.html       # Hlavní feed
│   ├── users.html      # Seznam uživatelů
│   └── user-detail.html
├── public/
│   ├── css/main.css
│   ├── js/
│   │   ├── main.js     # Sdílené utility (logout, nav, formatDate)
│   │   ├── posts.js    # Sdílená logika vykreslování příspěvků
│   │   └── wall.js     # Logika zdi
│   ├── img/
│   │   └── default-avatar.svg
│   └── uploads/        # Nahrané obrázky (gitignore)
└── package.json
```

---

## API Endpoints

### Autentizace
| Metoda | Cesta       | Popis                  |
|--------|-------------|------------------------|
| GET    | /login      | Přihlašovací stránka   |
| POST   | /login      | Přihlášení (JSON)      |
| GET    | /register   | Registrační stránka    |
| POST   | /register   | Registrace (multipart) |
| POST   | /logout     | Odhlášení              |

### Příspěvky (vyžadují přihlášení)
| Metoda | Cesta                     | Popis                       |
|--------|---------------------------|-----------------------------|
| GET    | /api/posts                | Výpis všech příspěvků       |
| POST   | /api/posts                | Vytvoření příspěvku         |
| POST   | /api/posts/:id/like       | Toggle lajku                |
| POST   | /api/posts/:id/comments   | Přidání komentáře           |

### Uživatelé (vyžadují přihlášení)
| Metoda | Cesta          | Popis                                     |
|--------|----------------|-------------------------------------------|
| GET    | /api/users     | Výpis uživatelů (abecedně dle příjmení)   |
| GET    | /api/users/:id | Detail + příspěvky + aktivita uživatele   |
| GET    | /api/me        | Info o přihlášeném uživateli              |

---

## Bezpečnost

- Všechny DB dotazy jdou přes Sequelize ORM → ochrana před SQL injection
- Hesla hashována pomocí bcrypt (salt rounds: 12)
- Sessions s httpOnly cookies
- Validace vstupu na serveru i klientovi
- Věkový limit 13 let při registraci (JS + serverová validace)
- Nepřihlášení uživatelé jsou přesměrováni na /login

---

## Přepnutí na MySQL/PostgreSQL

V souboru `models.js` nahraďte konfiguraci Sequelize:

```js
const sequelize = new Sequelize('databaze', 'uzivatel', 'heslo', {
  host:    'localhost',
  dialect: 'mysql',   // nebo 'postgres'
  logging: false
});
```

A nainstalujte příslušný driver:
```bash
npm install mysql2     # pro MySQL
npm install pg pg-hstore  # pro PostgreSQL
```
