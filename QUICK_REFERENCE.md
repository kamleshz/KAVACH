# 🚀 EPR Kavach - Quick Reference

## Start the Application

### Backend (Required)
```bash
cd server
npm run dev
```
Runs on: **http://localhost:8080**

### Frontend (Choose One)

#### A) Simple - No Build (Recommended for Development)
```bash
cd client
start login.html
```
Works immediately with Tailwind CSS via CDN!

#### B) Vite Dev Server (For Production Builds)
```bash
cd client
npx vite
```
Runs on: **http://localhost:5173**

Or double-click: `client/start-dev.bat`

---

## First Time Setup

### 1. Backend Setup
```bash
cd server
npm install
# Configure .env file (copy from .env.example)
npm run dev
```

### 2. Frontend Setup  
**Option A (CDN):** Nothing needed - just open HTML files!

**Option B (Vite):** Already installed - just run `npx vite`

---

## Environment Variables (.env in server folder)

```env
PORT=8080
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/eprkavach
SECRET_KEY_ACCESS_TOKEN=your_secret_key_here
SECRET_KEY_REFRESH_TOKEN=your_secret_key_here  
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_gmail_app_password
NODE_ENV=development
```

---

## API Endpoints

**Base URL:** http://localhost:8080/api

### Authentication
- POST `/auth/register` - Register user
- POST `/auth/verify-email` - Verify email with OTP
- POST `/auth/login` - Login
- POST `/auth/logout` - Logout
- POST `/auth/forgot-password` - Request password reset
- POST `/auth/reset-password` - Reset password

### Client Management  
- POST `/client/create` - Create client
- GET `/client/all` - Get all clients
- GET `/client/stats` - Get statistics
- GET `/client/:id` - Get client by ID
- PUT `/client/:id` - Update client
- DELETE `/client/:id` - Delete client (admin)

---

## File Structure

```
EPRKAVACH/
├── server/                 # Backend (Node.js + Express)
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   └── index.js
│
└── client/                 # Frontend (HTML + Tailwind + JS)
    ├── login.html
    ├── register.html
    ├── forgot-password.html
    ├── dashboard.html
    └── start-dev.bat      # Quick start script
```

---

## Common Commands

### Backend
```bash
npm install              # Install dependencies
npm run dev             # Start with nodemon (auto-restart)
npm start               # Start server
```

### Frontend
```bash
npm install             # Install dependencies  
npx vite                # Start dev server
npx vite build          # Build for production
npx vite preview        # Preview production build
```

---

## Troubleshooting

### MongoDB not connecting
```bash
net start MongoDB       # Windows
```

### Email not sending
- Use Gmail App Password (not regular password)
- Enable 2FA on Gmail account

### Port already in use
Change PORT in `.env` file

### Vite not found
```bash
cd client
npm install -D vite
npx vite
```

---

## Quick Test Flow

1. Start MongoDB
2. Start backend: `cd server && npm run dev`
3. Open frontend: `cd client && start login.html`
4. Register new account
5. Check email for OTP
6. Login and add clients

---

## Production Build

### Backend
```bash
cd server
npm start
```

### Frontend
```bash
cd client
npx vite build          # Creates dist/ folder
```

Deploy the `dist/` folder to your web server.

---

**Need Help?**  
Check `README.md` for full documentation!
