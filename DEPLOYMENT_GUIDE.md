# 🚀 Complete Deployment Guide: Universal Expense & Mess Manager

This guide walks you through deploying your application online **100% free** using **GitHub**, **Render.com** (for the Python FastAPI Backend), and **Vercel** (for the React Frontend).

---

## 📋 Architecture of Deployed App

```
[ Frontend: Vercel ]  --(HTTPS REST API calls)-->  [ Backend: Render.com (FastAPI) ]
  (https://your-app.vercel.app)                      (https://your-api.onrender.com)
```

---

## 🛠️ Step 1: Push Code to GitHub

1. Open your terminal in the project root: `c:\Users\Mahadeb Maity\Desktop\WebDev\Personal_Projects\HostelExpenseManager`
2. Initialize Git and make the first commit:
   ```powershell
   git init
   git add .
   git commit -m "feat: complete hostel & expense manager fullstack app"
   ```
3. Go to [github.com/new](https://github.com/new) and create a new repository (e.g. `HostelExpenseManager`).
4. Link and push to GitHub:
   ```powershell
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/HostelExpenseManager.git
   git push -u origin main
   ```

---

## 🐍 Step 2: Deploy Backend on Render.com (Free)

1. Sign in to [Render.com](https://render.com/) with your GitHub account.
2. Click **"New +"** in the top-right corner and select **"Web Service"**.
3. Choose **"Build and deploy from a Git repository"** and select your `HostelExpenseManager` repository.
4. Fill in the following settings:
   - **Name**: `hostel-expense-backend` (or any name you like)
   - **Region**: Nearest to you (e.g., `Singapore` or `Frankfurt`)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`

5. Scroll down to **"Environment Variables"** and add:
   | Key | Value |
   | :--- | :--- |
   | `SECRET_KEY` | `hostel-expense-production-secret-key-2026-xyz` |
   | `ALGORITHM` | `HS256` |
   | `ENVIRONMENT` | `production` |
   | `DATABASE_URL` | `sqlite:///./hostel_expense.db` *(or your PostgreSQL URL if using cloud DB)* |

6. Click **"Deploy Web Service"**.
7. Once deployed, copy your live backend URL (e.g., `https://hostel-expense-backend.onrender.com`).
   - You can test it by opening `https://hostel-expense-backend.onrender.com/api/v1/docs` in your browser.

*(Optional)* To seed demo accounts on your live Render instance:
- Go to the **"Shell"** tab in your Render dashboard and run: `python seed_demo_data.py`.

---

## ⚛️ Step 3: Deploy Frontend on Vercel (Free)

1. Sign in to [Vercel.com](https://vercel.com/) with your GitHub account.
2. Click **"Add New..."** -> **"Project"**.
3. Import your `HostelExpenseManager` GitHub repository.
4. Configure the Project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and choose `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand **"Environment Variables"** and add:
   | Name | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://hostel-expense-backend.onrender.com` *(Your Render Backend URL from Step 2)* |

6. Click **"Deploy"**.
7. In ~30 seconds, Vercel will give you a live production URL (e.g., `https://hostel-expense-manager.vercel.app`)!

---

## 🔄 Step 4: Add Frontend URL to Backend CORS

1. Go back to your **Render.com** Dashboard -> Your Web Service -> **"Environment"**.
2. Add or update:
   | Key | Value |
   | :--- | :--- |
   | `FRONTEND_URL` | `https://hostel-expense-manager.vercel.app` |

---

## 🎯 Verification Checklist

- [ ] Open your live Vercel URL on mobile or laptop.
- [ ] Sign up or log in.
- [ ] Add a sample expense, mark daily meals, and view the live calculated Meal Rate.
- [ ] Test the UPI QR modal to see if the QR code displays properly.
- [ ] Click "Download Statement (PDF)" to test audit report generation.
