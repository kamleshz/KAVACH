# Deployment Guide for EPRKAVACH

This project consists of a **React Frontend** and a **Node.js/Express Backend**. We recommend deploying them separately for the best performance and scalability.

## 1. Backend Deployment (Render / Railway / Heroku)
We recommend **Render** (free tier available) or **Railway**.

### Option A: Deploy on Render.com (Recommended)
You can deploy manually or use the `render.yaml` Blueprint I created for you.

#### Method 1: Using Blueprint (Easiest)
1.  Push your code to GitHub.
2.  Log in to [Render](https://render.com/).
3.  Click **New +** -> **Blueprint**.
4.  Connect your repository.
5.  Render will automatically detect `render.yaml` and ask you to fill in the environment variables (`MONGODB_URI`, etc.).
6.  Click **Apply**.

#### Method 2: Manual Setup
1.  Push your code to a **GitHub repository**.
2.  Log in to [Render](https://render.com/).
3.  Click **New +** -> **Web Service**.
4.  Connect your GitHub repository.
5.  **Configure the service**:
    *   **Root Directory**: `server`
    *   **Environment**: `Node`
    *   **Build Command**: `npm install`
    *   **Start Command**: `npm start`
6.  **Environment Variables** (Advanced):
    Add the following keys (copy from your local `.env` or set new ones):
    *   `MONGODB_URI`: Your MongoDB connection string (e.g., from MongoDB Atlas).
    *   `SECRET_KEY_ACCESS_TOKEN`: A long random string.
    *   `SECRET_KEY_REFRESH_TOKEN`: Another long random string.
    *   `FRONTEND_URL`: The URL where your frontend will be deployed (e.g., `https://your-app.vercel.app`). *You can update this later after deploying the frontend.*
    *   `MAIL_USER` / `MAIL_PASS`: For email functionality.
7.  Click **Create Web Service**.
8.  **Copy the Backend URL** (e.g., `https://eprkavach-api.onrender.com`) once it's live.

## 2. Frontend Deployment (Vercel)
Vercel is the best place to host Vite/React apps.

1.  Log in to [Vercel](https://vercel.com/).
2.  Click **Add New...** -> **Project**.
3.  Import your GitHub repository.
4.  **Configure the project**:
    *   **Root Directory**: Click `Edit` and select `client-react`.
    *   **Framework Preset**: Vite (should be auto-detected).
    *   **Build Command**: `npm run build` (default).
    *   **Output Directory**: `dist` (default).
5.  **Environment Variables**:
    *   Key: `VITE_API_URL`
    *   Value: The **Backend URL** you got from Step 1 (e.g., `https://eprkavach-api.onrender.com`).
    *   *Note: Do NOT add a trailing slash `/` at the end.*
6.  Click **Deploy**.

## 3. Final Connection
1.  Once the Frontend is deployed, copy its URL (e.g., `https://eprkavach-frontend.vercel.app`).
2.  Go back to your **Backend Dashboard** (Render).
3.  Update the `FRONTEND_URL` environment variable to match your new Frontend URL.
4.  **Redeploy** the backend (usually automatic on Render when env vars change).

## 4. Google Cloud Platform (Cloud Run)
If you prefer Google Cloud, we have configured the project for **Cloud Run**, which is a serverless container platform.

### Prerequisites
1.  Install the **Google Cloud SDK** (`gcloud` CLI).
2.  Enable **Cloud Run API** and **Container Registry API** (or Artifact Registry) in your GCP Console.
3.  Authenticate: `gcloud auth login` and `gcloud config set project YOUR_PROJECT_ID`.

### Step 1: Deploy Backend (Server)
1.  Navigate to the server directory:
    ```bash
    cd server
    ```
2.  Build and submit the image to Google Container Registry (GCR):
    ```bash
    gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/eprkavach-server
    ```
3.  Deploy to Cloud Run:
    ```bash
    gcloud run deploy eprkavach-server \
      --image gcr.io/YOUR_PROJECT_ID/eprkavach-server \
      --platform managed \
      --region us-central1 \
      --allow-unauthenticated \
      --set-env-vars="MONGODB_URI=your_mongo_uri,SECRET_KEY_ACCESS_TOKEN=secret1,SECRET_KEY_REFRESH_TOKEN=secret2,FRONTEND_URL=*"
    ```
    *Replace `your_mongo_uri` etc. with actual values. Initially set `FRONTEND_URL=*` or a placeholder, then update it after deploying the frontend.*
4.  Copy the **Service URL** (e.g., `https://eprkavach-server-xyz.a.run.app`).

### Step 2: Deploy Frontend (Client)
1.  Navigate to the client directory:
    ```bash
    cd ../client-react
    ```
2.  Build and submit the image (pass the backend URL as a build arg if needed, or better, configure it at runtime via window.env, but for simplicity we'll bake it in or use a relative path proxy):
    *   *Note: Vite Environment variables are baked in at build time.*
    *   Open `client-react/Dockerfile` and ensure you can pass the argument or create a `.env.production` file before building.
    *   Simplest way: Create `.env.production` locally with `VITE_API_URL=https://eprkavach-server-xyz.a.run.app` before running the build command.
    ```bash
    # Create temp env file
    echo "VITE_API_URL=https://eprkavach-server-xyz.a.run.app" > .env.production
    
    # Build image
    gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/eprkavach-client
    ```
3.  Deploy to Cloud Run:
    ```bash
    gcloud run deploy eprkavach-client \
      --image gcr.io/YOUR_PROJECT_ID/eprkavach-client \
      --platform managed \
      --region us-central1 \
      --allow-unauthenticated
    ```
4.  Copy the **Frontend URL**.

### Step 3: Final Link
1.  Go back to your Server Cloud Run service.
2.  Update the `FRONTEND_URL` environment variable to match the new Frontend URL.

## 5. Database (MongoDB Atlas)
If you are currently using a local MongoDB (`mongodb://localhost:27017/...`), you **MUST** switch to a cloud database.
1.  Go to [MongoDB Atlas](https://www.mongodb.com/atlas).
2.  Create a free cluster.
3.  Get the connection string (Choose "Connect your application").
4.  Replace `<password>` with your database user password.
5.  Use this string as the `MONGODB_URI` in your Backend Environment Variables.

## Troubleshooting
*   **CORS Errors**: Ensure `FRONTEND_URL` in the backend matches the actual frontend URL exactly (https vs http, no trailing slash).
*   **White Screen on Refresh**: We added `vercel.json` to handle this. If it happens on another host, ensure all requests rewrite to `index.html`.
*   **API Connection Fail**: Check the Network tab. If requests go to `localhost` or `undefined`, check your `VITE_API_URL` variable in Vercel.
