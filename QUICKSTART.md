# EPR Kavach Audit - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
cd server
npm install
```

### Step 2: Setup Environment
```bash
# Copy the example env file
copy .env.example .env
```

Edit `.env` and update these required fields:
```env
MONGODB_URI=mongodb://localhost:27017/eprkavach
SECRET_KEY_ACCESS_TOKEN=your_32_character_secret_key_here
SECRET_KEY_REFRESH_TOKEN=your_32_character_secret_key_here
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_gmail_app_password
```

### Step 3: Generate Secret Keys
Run this in PowerShell to generate secure keys:
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### Step 4: Setup Gmail App Password
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Go to App Passwords
4. Create new app password for "Mail"
5. Copy the 16-character password to `.env` MAIL_PASS

### Step 5: Start MongoDB
Make sure MongoDB is running on your system:
```bash
# Windows (if installed as service)
net start MongoDB

# Or start manually
mongod
```

### Step 6: Start the Server
```bash
npm start
```

You should see:
```
✅ Nodemailer transporter is ready
MongoDB connected successfully
Server is running 8080
```

### Step 7: Open Frontend
1. Navigate to `client` folder
2. Open `login.html` in your browser
3. Or run a simple server:
```bash
# Using Python
python -m http.server 3000

# Using npx
npx http-server -p 3000
```

## 🎯 First Steps

### Create Your Account
1. Click "Sign Up" on login page
2. Fill in your details
3. Check email for OTP
4. Verify email with OTP
5. Login with your credentials

### Add Your First Client
1. Login to dashboard
2. Click "Add New Client"
3. Fill in basic information
4. Add company details
5. Add facility information
6. Submit to create

## 📁 Project Structure
```
EPRKAVACH/
├── server/          # Backend (Node.js + Express)
│   ├── config/      # Database & Email config
│   ├── controllers/ # Business logic
│   ├── middleware/  # Auth & Upload handlers
│   ├── models/      # MongoDB schemas
│   ├── routes/      # API routes
│   ├── utils/       # Helper functions
│   └── index.js     # Server entry
│
└── client/          # Frontend (HTML/CSS/JS)
    ├── login.html
    ├── register.html
    ├── forgot-password.html
    ├── dashboard.html
    └── dashboard.js
```

## 🔑 Default Test Account (After Registration)
Create your own account - there are no default credentials for security reasons.

## 🌐 API Endpoints
- **Auth**: http://localhost:8080/api/auth/*
- **Client**: http://localhost:8080/api/client/*

## 📊 Features Checklist
- ✅ User Registration with Email Verification
- ✅ Login/Logout
- ✅ Forgot Password (OTP-based)
- ✅ Client Management
- ✅ Document Upload
- ✅ Dashboard with Statistics
- ✅ Search & Filter Clients

## 🆘 Common Issues

### MongoDB Connection Failed
```bash
# Check if MongoDB is running
mongod --version

# Start MongoDB service (Windows)
net start MongoDB
```

### Email Not Sending
- Verify Gmail App Password (not regular password)
- Enable 2FA on Gmail
- Check MAIL_USER and MAIL_PASS in .env

### CORS Errors
- Make sure FRONTEND_URL in .env matches your frontend URL
- Default: http://localhost:3000

### Port Already in Use
```bash
# Change PORT in .env to different port
PORT=8081
```

## 📖 Next Steps
1. Read full README.md for detailed documentation
2. Explore API endpoints
3. Customize email templates in `utils/verifyEmailTemplate.js`
4. Add custom validation rules
5. Extend client fields as needed

## 💡 Pro Tips
- Use environment-specific .env files (.env.development, .env.production)
- Enable nodemon for development: `npm run dev`
- Check server console for detailed logs
- Use MongoDB Compass to view database
- Keep .env file secure and never commit it

## 🎨 UI Customization
All frontend pages use:
- Tailwind CSS (via CDN)
- Font Awesome icons
- Custom animations and gradients

Modify styles directly in the `<style>` tags of each HTML file.

## 📱 Responsive Design
All pages are mobile-responsive and tested on:
- Desktop (1920x1080)
- Tablet (768px)
- Mobile (375px)

---

**Ready to build something amazing! 🚀**

For detailed documentation, see [README.md](README.md)
