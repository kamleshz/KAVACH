# Deployment Guide

This guide explains how to deploy the EPRKAVACH application (Frontend + Backend) to cloud platforms.

## Prerequisites

1.  **GitHub Account**: You need a GitHub account.
2.  **Render Account**: Sign up at [dashboard.render.com](https://dashboard.render.com/).
3.  **Vercel Account** (Optional): Sign up at [vercel.com](https://vercel.com).
4.  **MongoDB Database**: You need a MongoDB connection string (URI).
    *   You can use [MongoDB Atlas](https://www.mongodb.com/atlas/database) (Free Tier).
    *   Get the connection string (e.g., `mongodb+srv://<username>:<password>@cluster.mongodb.net/eprkavach?retryWrites=true&w=majority`).

## Option 1: Full Deployment on Render (Backend + Frontend)

We have provided a `render.yaml` Blueprint to deploy both services automatically.

### Step 1: Push Code to GitHub
Ensure your latest code is pushed to your GitHub repository: `https://github.com/kamleshz/KAVACH`.

### Step 2: Create a New Blueprint
1.  Log in to [Render Dashboard](https://dashboard.render.com/).
2.  Click **New +** -> **Blueprint**.
3.  Connect your GitHub and select repository: `KAVACH`.
4.  Render will detect `render.yaml`.

### Step 3: Configure Variables
*   **MONGODB_URI**: Paste your MongoDB connection string.
*   **SECRET_KEY_ACCESS_TOKEN**: Type a random secret string.
*   **SECRET_KEY_REFRESH_TOKEN**: Type a random secret string.
*   **MAIL_USER**: Your email address (e.g., `user@gmail.com`).
*   **MAIL_PASS**: Your email app password (NOT your login password).
    *   For Gmail, go to Google Account -> Security -> 2-Step Verification -> App Passwords.
*   **VITE_API_URL**: **Leave blank** for now.

### Step 4: Apply & Configure
1.  Click **Apply Blueprint**. Wait for services to be created.
2.  **Link Backend to Frontend**:
    *   Go to **Backend Service** -> Copy URL (e.g., `https://eprkavach-backend.onrender.com`).
    *   Go to **Frontend Service** -> **Environment**.
    *   Set `VITE_API_URL` to the Backend URL.
    *   **Save**.
3.  **Link Frontend to Backend (CORS)**:
    *   Go to **Frontend Service** -> Copy URL.
    *   Go to **Backend Service** -> **Environment**.
    *   Set `FRONTEND_URL` to the Frontend URL.
    *   **Save**.

---

## Option 2: Hybrid Deployment (Backend on Render, Frontend on Vercel)

This is often faster for the frontend.

### Step 1: Deploy Backend on Render
Follow the steps above to deploy **only** the Backend on Render (or use the Blueprint and ignore the frontend part).
*   **Goal**: Get a live Backend URL (e.g., `https://eprkavach-backend.onrender.com`).

### Step 2: Deploy Frontend on Vercel
1.  Log in to [Vercel](https://vercel.com).
2.  Click **Add New...** -> **Project**.
3.  Import your GitHub Repository (`KAVACH`).
4.  **Configure Project**:
    *   **Framework Preset**: Vite (should be auto-detected).
    *   **Root Directory**: Click `Edit` and select `client-react`.
5.  **Environment Variables**:
    *   Expand the **Environment Variables** section.
    *   Add Key: `VITE_API_URL`
    *   Add Value: Your Render Backend URL (e.g., `https://eprkavach-backend.onrender.com`).
6.  Click **Deploy**.

### Step 3: Update Backend CORS
1.  Copy your new Vercel URL (e.g., `https://eprkavach.vercel.app`).
2.  Go to your Render Backend Dashboard -> **Environment**.
3.  Update `FRONTEND_URL` to include your Vercel URL.
