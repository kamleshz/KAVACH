# EPR KAVACH - Project Overview

## 1. Introduction
**EPR KAVACH** is a comprehensive Enterprise Resource Planning (ERP) solution designed for managing Extended Producer Responsibility (EPR) compliance, client management, and plant processing operations. It features a modern, responsive web interface and a robust, scalable backend.

## 2. Technology Stack

### Frontend (`client-react`)
*   **Framework**: [React 18](https://react.dev/)
*   **Build Tool**: [Vite](https://vitejs.dev/) (Fast development server & bundler)
*   **State Management**: [Redux Toolkit](https://redux-toolkit.js.org/) (Global state, Auth management)
*   **Routing**: [React Router DOM v6](https://reactrouter.com/)
*   **UI Component Library**: [Ant Design (Antd)](https://ant.design/) (Tables, Forms, Modals, Layouts)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Utility-first CSS)
*   **HTTP Client**: [Axios](https://axios-http.com/)
*   **PDF/File Handling**: `jspdf`, `jspdf-autotable`

### Backend (`server`)
*   **Runtime**: [Node.js](https://nodejs.org/)
*   **Framework**: [Express.js](https://expressjs.com/)
*   **Database**: [MongoDB](https://www.mongodb.com/) (NoSQL Database)
*   **ODM**: [Mongoose](https://mongoosejs.com/) (Schema modeling)
*   **Authentication**: JWT (JSON Web Tokens) stored in HTTP-Only Cookies
*   **Security**: `helmet` (Headers), `cors` (Cross-Origin), `bcryptjs` (Password Hashing)
*   **File Handling**: `multer` (Uploads), `xlsx` (Excel processing)
*   **Scheduled Tasks**: `node-cron` (Audit & automated checks)
*   **Integrations**:
    *   **Cloudinary**: Cloud storage for documents/images.
    *   **Firebase Admin**: Push notifications.
    *   **Nodemailer**: Email transaction services.

---

## 3. Project Structure

### Backend Structure (`/server`)
*   **`config/`**: Database connection (`connectDB.js`), Firebase setup, and Email configuration.
*   **`controllers/`**: Business logic for API endpoints (`auth`, `client`, `user`, `admin`).
*   **`models/`**: Mongoose schemas defining data structure:
    *   `User`: System users and authentication.
    *   `Client`: Core entity representing companies/clients.
    *   `Procurement`: Supply chain and inventory data.
    *   `ProductCompliance`: Compliance rules and validation data.
*   **`routes/`**: API endpoint definitions mapping to controllers.
*   **`middleware/`**:
    *   `auth.js`: Protects routes, verifies JWT.
    *   `upload.js`: Handles file uploads via Multer.
*   **`cron/`**: Scheduled background tasks (e.g., `auditCron.js`).
*   **`uploads/`**: Local temporary storage for uploaded files.

### Frontend Structure (`/client-react/src`)
*   **`components/`**: Reusable UI parts (`DashboardLayout`, `PrivateRoute`, Header, Sidebar).
*   **`pages/`**: Main application views:
    *   **Auth**: `Login`, `Register`, `ForgotPassword`.
    *   **Dashboard**: `DashboardHome`.
    *   **Client Management**: `Clients` (List), `AddClient`, `EditClient`, `ClientDetail`.
    *   **Validation**: `PreValidationCheck`, `ValidatedClients`, `ClientValidation`.
    *   **Operations**: `PlantProcess` (Complex module for Procurement, Consumption, Dispatch).
*   **`store/`**: Redux logic (slices) for global state.
*   **`App.jsx`**: Main routing configuration.

---

## 4. Key Workflows & Features

### A. Authentication & Security
*   Users register and login via email/password.
*   Upon login, the server issues a **JWT** set as an `httpOnly` cookie.
*   The frontend's `PrivateRoute` component checks this authentication state before allowing access to protected pages.

### B. Client Management
*   **Onboarding**: Admins can add new clients with detailed profiles.
*   **Search**: Advanced grouping and search capabilities (`ClientGroupSearch`).
*   **Validation**: A dedicated workflow to validate client compliance documents and status.

### C. Plant Operations (`PlantProcess.jsx`)
*   A central hub for managing plant activities.
*   **Procurement**: Tracks incoming raw materials. Features **Excel Import** capabilities using the `xlsx` library to bulk upload procurement data.
*   **Consumption**: Tracks usage of raw materials in manufacturing (Recycled Quantity Used).
*   **Dispatch**: Manages outgoing finished goods.
*   **Auto-Fetch Logic**: Smart forms that auto-populate details (e.g., Supplier Name) based on selected Component Codes.

### D. Data Management
*   **File Uploads**: Images and PDFs are uploaded, processed by Multer, and often stored in Cloudinary for scalable access.
*   **Excel Integration**: The system can parse Excel files to update database records for procurement, saving manual entry time.

## 5. How to Run

1.  **Database**: Ensure MongoDB is running or `MONGO_URI` is set in `.env`.
2.  **Server**:
    ```bash
    cd server
    npm install
    npm run dev
    ```
    Runs on Port `8080` (default).
3.  **Client**:
    ```bash
    cd client-react
    npm install
    npm run dev
    ```
    Runs on Port `5173` (Vite default).

## 6. Recent Developments
*   **Pagination Fixes**: Procurement table now supports dynamic page sizes (10, 20, 50, 100).
*   **Smart Forms**: Recycled Quantity Used table auto-fetches Supplier Names from Component details.
*   **Architecture Visualization**: A full system architecture diagram is available in `EPR_KAVACH_Architecture.html`.
