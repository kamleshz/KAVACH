# EPR Kavach Audit - React Frontend

Modern React application with Vite + Tailwind CSS for EPR compliance management.

## 🚀 Tech Stack

- **React 18** - UI Library
- **Vite** - Build tool & dev server
- **Tailwind CSS 3** - Utility-first CSS framework
- **React Router DOM** - Client-side routing
- **Axios** - HTTP client
- **Context API** - State management

## 📦 Installation

```bash
npm install
```

## 🏃 Development

```bash
npm run dev
```

Or double-click `START.bat`

Runs on: **http://localhost:5173**

## 🏗️ Build for Production

```bash
npm run build
```

Output: `dist/` folder

## 📁 Project Structure

```
src/
├── components/         # Reusable components
│   └── PrivateRoute.jsx
├── context/           # React Context for state
│   └── AuthContext.jsx
├── pages/             # Page components
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── ForgotPassword.jsx
│   └── Dashboard.jsx
├── services/          # API services
│   └── api.js
├── App.jsx            # Main app component
├── main.jsx           # Entry point
└── index.css          # Tailwind CSS + custom styles
```

## 🎨 Features

✅ Modern React with Hooks  
✅ React Router for navigation  
✅ Protected routes with authentication  
✅ Axios interceptors for API calls  
✅ Context API for global state  
✅ Tailwind CSS with custom theme  
✅ Responsive design  
✅ Beautiful animations  

## 🔑 Environment Variables

Create `.env` file:

```env
VITE_API_URL=http://localhost:8080/api
```

## 📄 Available Pages

- `/login` - Login page
- `/register` - Registration page
- `/forgot-password` - Password reset
- `/dashboard` - Main dashboard (protected)

## 🔗 Backend Integration

Make sure backend server is running on `http://localhost:8080`

## 🎯 Next Steps

1. Complete Register page with OTP verification
2. Complete ForgotPassword page
3. Build full Dashboard with client management
4. Add more protected routes
5. Implement client CRUD operations

---

**Built with React + Vite + Tailwind CSS** 🚀
