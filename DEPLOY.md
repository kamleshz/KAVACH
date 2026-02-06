# Deployment Guide for Render

This guide explains how to deploy the EPRKAVACH application (Frontend + Backend) to [Render](https://render.com) using the provided `render.yaml` Blueprint.

## Prerequisites

1.  **GitHub Account**: You need a GitHub account.
2.  **Render Account**: Sign up at [dashboard.render.com](https://dashboard.render.com/).
3.  **MongoDB Database**: You need a MongoDB connection string (URI).
    *   You can use [MongoDB Atlas](https://www.mongodb.com/atlas/database) (Free Tier).
    *   Get the connection string (e.g., `mongodb+srv://<username>:<password>@cluster.mongodb.net/eprkavach?retryWrites=true&w=majority`).

## Step 1: Push Code to GitHub

Ensure your latest code is pushed to your GitHub repository:
[https://github.com/kamleshz/KAVACH](https://github.com/kamleshz/KAVACH)

(We have already done this in the previous steps).

## Step 2: Create a New Blueprint on Render

1.  Log in to your [Render Dashboard](https://dashboard.render.com/).
2.  Click the **"New +"** button and select **"Blueprint"**.
3.  Connect your GitHub account if you haven't already.
4.  Search for and select your repository: `KAVACH`.
5.  Render will automatically detect the `render.yaml` file.

## Step 3: Configure Environment Variables

Render will ask you to provide values for the environment variables defined in `render.yaml`.

*   **Service Group**: You can give it a name like `eprkavach`.
*   **MONGODB_URI**: Paste your MongoDB Connection String here.
    *   *Important*: Ensure your IP Access List in MongoDB Atlas allows access from anywhere (`0.0.0.0/0`) or configure Render's static IPs (requires paid plan). For the free tier, allow `0.0.0.0/0`.
*   **SECRET_KEY_ACCESS_TOKEN**: Render will verify this (it will auto-generate if we didn't specify value, but `render.yaml` says `generateValue: true`, so it might just show it). If it asks, you can type a random long string.
*   **SECRET_KEY_REFRESH_TOKEN**: Same as above.

## Step 4: Apply Blueprint

1.  Click **"Apply Blueprint"**.
2.  Render will start deploying both the Backend and Frontend services.
3.  You can watch the logs for both services.

## Step 5: Final Configuration (CORS)

Once deployed, you need to tell the Backend to allow requests from your new Frontend URL.

1.  Wait for the **Frontend** deployment to finish.
2.  Copy the Frontend URL (e.g., `https://eprkavach-frontend.onrender.com`).
3.  Go to the **Dashboard**, click on your **Backend Service** (`eprkavach-backend`).
4.  Go to **Environment**.
5.  Add a new Environment Variable:
    *   **Key**: `FRONTEND_URL`
    *   **Value**: Paste your Frontend URL (e.g., `https://eprkavach-frontend.onrender.com`).
6.  Render will automatically restart the backend.

## Troubleshooting

*   **Build Failures**: Check the logs. If `npm install` fails, it might be a dependency issue.
*   **White Screen on Frontend**: Open the browser console (F12). If you see 404 errors for assets, ensure `vercel.json` or rewrite rules are working (Render uses the `routes` rule in `render.yaml`).
*   **API Errors (Network Error)**:
    *   Check if `VITE_API_URL` is correctly set in the Frontend Environment (it should be auto-linked via `render.yaml`).
    *   Check Backend logs for CORS errors. Ensure `FRONTEND_URL` is set correctly.

## Deployment to Vercel (Alternative for Frontend)

If you prefer Vercel for the frontend:
1.  Import the repo in Vercel.
2.  Set Root Directory to `client-react`.
3.  Add Environment Variable: `VITE_API_URL` = Your Render Backend URL.
4.  Deploy.
