# EPR Kavach Audit Application

A comprehensive audit application for managing EPR (Extended Producer Responsibility) compliance with user authentication, client onboarding, and document management.

## Features

### Authentication System
- ✅ User Registration with Email Verification (OTP-based)
- ✅ Secure Login with JWT Tokens
- ✅ Forgot Password with OTP Reset
- ✅ Role-based Access Control (Admin/User)
- ✅ Session Management with Refresh Tokens

### Client Management
- ✅ Client Onboarding with Complete Details
- ✅ Entity Type Selection (Producer, Brand Owner, Importer, PWP)
- ✅ Company Details Management (PAN, CIN, GST, Udyam)
- ✅ Production Facility Information
- ✅ Document Upload & Management
- ✅ Client Status Tracking (Pending, In Progress, Completed, On Hold)
- ✅ Search & Filter Functionality
- ✅ Client Assignment to Users

### Dashboard
- ✅ Statistics Overview
- ✅ Recent Clients List
- ✅ User Profile Management
- ✅ Responsive Design

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express 5.2
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (jsonwebtoken) + bcryptjs
- **File Upload**: Multer
- **Email**: Nodemailer (Gmail)
- **Security**: Helmet, CORS, Cookie Parser

### Frontend
- **HTML5 + CSS3** with Tailwind CSS
- **Vanilla JavaScript** (ES6+)
- **Font Awesome** Icons
- **Responsive Design**

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- Gmail account for email service

### Backend Setup

1. Navigate to server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
PORT=8080
FRONTEND_URL=http://localhost:3000

MONGODB_URI=mongodb://localhost:27017/eprkavach

SECRET_KEY_ACCESS_TOKEN=your_secret_access_token_minimum_32_characters
SECRET_KEY_REFRESH_TOKEN=your_secret_refresh_token_minimum_32_characters

MAIL_USER=your_email@gmail.com
MAIL_PASS=your_gmail_app_password

NODE_ENV=development
```

5. Generate secure secret keys:
```bash
# For Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# For Linux/Mac
openssl rand -base64 32
```

6. Set up Gmail App Password:
   - Go to Google Account Settings
   - Enable 2-Factor Authentication
   - Generate App Password for "Mail"
   - Use this password in MAIL_PASS

7. Start the server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

Server will run on http://localhost:8080

### Frontend Setup

1. Open `client` folder
2. Update API_URL in all HTML files if needed (default: http://localhost:8080/api)
3. Open `login.html` in browser or use a simple HTTP server:

```bash
# Using Python
python -m http.server 3000

# Using Node.js http-server (install globally first)
npx http-server -p 3000
```

Frontend will run on http://localhost:3000

## API Endpoints

### Authentication Routes
```
POST   /api/auth/register              - Register new user
POST   /api/auth/verify-email          - Verify email with OTP
POST   /api/auth/login                 - User login
POST   /api/auth/logout                - User logout
POST   /api/auth/forgot-password       - Request password reset OTP
POST   /api/auth/verify-forgot-password-otp - Verify reset OTP
POST   /api/auth/reset-password        - Reset password
GET    /api/auth/user-details          - Get current user details (protected)
```

### Client Routes
```
POST   /api/client/create                      - Create new client (protected)
GET    /api/client/all                         - Get all clients with filters (protected)
GET    /api/client/stats                       - Get client statistics (protected)
GET    /api/client/:clientId                   - Get client by ID (protected)
PUT    /api/client/:clientId                   - Update client (protected)
DELETE /api/client/:clientId                   - Delete client (admin only)
PATCH  /api/client/:clientId/assign            - Assign client to user (admin only)
POST   /api/client/:clientId/upload-document   - Upload document for client (protected)
```

## Project Structure

```
EPRKAVACH/
├── server/
│   ├── config/
│   │   ├── connectDB.js           # MongoDB connection
│   │   └── sendEmail.js           # Email service configuration
│   ├── controllers/
│   │   ├── auth.controller.js     # Authentication logic
│   │   └── client.controller.js   # Client management logic
│   ├── middleware/
│   │   ├── auth.js                # JWT authentication middleware
│   │   └── upload.js              # File upload middleware
│   ├── models/
│   │   ├── user.model.js          # User schema
│   │   └── client.model.js        # Client schema
│   ├── routes/
│   │   ├── auth.route.js          # Authentication routes
│   │   └── client.route.js        # Client routes
│   ├── utils/
│   │   ├── generateToken.js       # JWT token generation
│   │   ├── generateOtp.js         # OTP generation utilities
│   │   └── verifyEmailTemplate.js # Email templates
│   ├── uploads/                   # Uploaded files storage
│   ├── .env.example               # Environment variables template
│   ├── index.js                   # Server entry point
│   └── package.json               # Dependencies
│
└── client/
    ├── login.html                 # Login page
    ├── register.html              # Registration page
    ├── forgot-password.html       # Password reset page
    ├── dashboard.html             # Main dashboard
    └── dashboard.js               # Dashboard functionality
```

## Usage Guide

### 1. User Registration
1. Open `register.html`
2. Fill in name, email, password, and mobile (optional)
3. Submit form
4. Check email for 6-digit OTP
5. Enter OTP to verify email
6. Redirected to login page

### 2. User Login
1. Open `login.html`
2. Enter email and password
3. Click "Sign In"
4. Redirected to dashboard

### 3. Password Reset
1. Click "Forgot Password?" on login page
2. Enter email address
3. Receive OTP via email
4. Enter OTP to verify
5. Set new password
6. Login with new password

### 4. Client Onboarding
1. Login to dashboard
2. Click "Add New Client" button
3. Fill in client details across 4 tabs:
   - **Basic Info**: Name, entity type, contact person
   - **Company Details**: PAN, CIN, GST, Udyam, address
   - **Facility**: Production facility information
   - **Documents**: Upload relevant documents (after creation)
4. Submit to create client

### 5. Managing Clients
- **Search**: Use search bar to find clients by name, email, PAN, or GST
- **Filter**: Filter by status (Pending, In Progress, Completed, On Hold)
- **View**: Click "View Details" to see complete client information
- **Update**: Edit client details as needed
- **Assign**: Admin can assign clients to specific users

## Security Features

- ✅ Password hashing with bcryptjs (10 rounds)
- ✅ JWT-based authentication with refresh tokens
- ✅ HTTP-only cookies for token storage
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ Input validation
- ✅ File type and size restrictions
- ✅ OTP expiry (10 minutes)
- ✅ Email verification required before login

## File Upload Specifications

- **Allowed Types**: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG
- **Max Size**: 10MB per file
- **Storage**: Local file system (`server/uploads/`)

## Email Templates

Beautiful HTML email templates for:
- Email Verification (Teal theme)
- Password Reset (Orange theme)
- Both include OTP display and expiry information

## Default User Roles

- **USER**: Can create and manage their own clients
- **ADMIN**: Full access including client assignment and deletion

## Troubleshooting

### MongoDB Connection Issues
```javascript
// Already configured in connectDB.js
// Uses IPv4 and increased timeouts for Windows compatibility
```

### Email Not Sending
1. Verify Gmail App Password is correct
2. Check 2FA is enabled on Gmail account
3. Review MAIL_USER and MAIL_PASS in .env
4. Check nodemailer logs in console

### CORS Errors
1. Verify FRONTEND_URL in .env matches your frontend URL
2. Check credentials are included in fetch requests

### JWT Token Errors
1. Ensure SECRET_KEY_ACCESS_TOKEN and SECRET_KEY_REFRESH_TOKEN are set
2. Check token is being sent in Authorization header
3. Verify token hasn't expired (6h for access, 7d for refresh)

## Future Enhancements

- [ ] Real-time notifications
- [ ] Advanced document viewer
- [ ] Client communication portal
- [ ] Audit trail/activity logs
- [ ] Report generation (PDF)
- [ ] Data analytics dashboard
- [ ] Multi-language support
- [ ] Mobile app integration

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC License

## Support

For issues and questions, please open an issue in the repository.

---

**Built with ❤️ for EPR Compliance Management**
