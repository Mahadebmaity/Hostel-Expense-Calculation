# 🏨 Universal Expense & Mess Management Platform

A production-ready, full-stack financial ledger, daily mess calculation, and expense splitting web application designed for **Hostels & Mess Life, Tour/Trip Groups, Flatmates, and Shared Living**.

---

## 🌐 Live Production Links
- 💻 **Live Web Application**: [https://hostel-expense-calculation-manager.onrender.com](https://hostel-expense-calculation-manager.onrender.com)
- ⚙️ **Live Backend API**: [https://hostel-expense-calculation.onrender.com](https://hostel-expense-calculation.onrender.com)
- 📑 **Interactive API Docs (Swagger UI)**: [https://hostel-expense-calculation.onrender.com/api/v1/docs](https://hostel-expense-calculation.onrender.com/api/v1/docs)
- 📜 **OpenAPI Specification (JSON)**: [https://hostel-expense-calculation.onrender.com/api/v1/openapi.json](https://hostel-expense-calculation.onrender.com/api/v1/openapi.json)
- 📖 **Alternative API Docs (Redoc)**: [https://hostel-expense-calculation.onrender.com/api/v1/redoc](https://hostel-expense-calculation.onrender.com/api/v1/redoc)

---

## 🔑 Login & Demo Credentials

The platform uses a **Unified Sign-In** system (no extra admin buttons required). When you sign in with admin credentials, you automatically enter with **Superadmin** status. Any other user logs in with standard member permissions.

| Account Type | Email | Password | Role & Permissions |
| :--- | :--- | :--- | :--- |
| 👑 **Super Admin** | `admin@hostel.com` | `admin123` | Full access to all groups, User Directory, platform metrics, meal tracker & debt solver |
| 👤 **Demo Admin** | `mahadeb@example.com` | `password123` | Group Creator / Mess Admin for *Royal Engineers Mess 2026* |
| 👥 **Demo Member** | `rahul@example.com` | `password123` | Mess Manager / Member permissions |

---

## 🌟 Key Features

### 1. 👑 Superadmin Hub & Users Directory
- **Platform-Wide Audit**: View all registered users across the platform, including sign-up dates, verified contact numbers, UPI IDs, and associated mess groups.
- **Live System Analytics**: Real-time counters for Total Users, Active Groups, Total Expenses Processed (₹), and Total Mess Meals logged.
- **Universal Group Switcher**: Superadmin can inspect, manage, and calculate settlements for any hostel group or trip ledger in the system.
- **User Role Management**: Promote or demote users to/from administrator roles with a single click.

### 2. 🍽️ Mess & Hostel Daily Meal Tracker
- Customizable meal unit weights (e.g. Breakfast = 0.5x, Lunch = 1.0x, Dinner = 1.0x).
- Real-time **Dynamic Meal Rate** calculation:
  $$\text{Meal Rate} = \frac{\text{Total Variable Grocery Expense}}{\text{Total Meals Consumed}}$$
- Daily meal attendance counters with 15-day monthly matrix table view.

### 3. ⚡ Fixed vs Variable Cost Division
- Fixed costs (Cook salary, Gas cylinder, Electricity, Wi-Fi, Room rent) are divided equally among all members.
- Variable costs (Groceries, Vegetables, Meat/Fish) are calculated dynamically based on individual meal consumption.

### 4. 💳 Debt Simplification Graph Algorithm
- Implements a **Greedy Min-Cashflow Graph Solver** ($O(N \log N)$) that condenses complex multi-party debt chains into the absolute minimum number of peer-to-peer payout transactions.

### 5. 📱 Instant UPI Settle-Up (QR & Deep Links)
- Generates dynamic NPCI-compliant UPI QR codes and deep links (`upi://pay?pa=...&pn=...&am=...`) for instant settlement via Google Pay, PhonePe, Paytm, and BHIM.

### 6. 📄 Audit-Ready PDF Statement Generator
- One-click downloadable PDF statements formatted with executive metrics, member balance tables, and payout instructions using ReportLab.

---

## 🛠️ Technology Stack

| Component | Technology |
| :--- | :--- |
| **Backend Framework** | **Python (FastAPI)** |
| **Database & ORM** | **PostgreSQL (Neon / Render) + SQLite / SQLAlchemy 2.0** |
| **Data Validation** | **Pydantic v2 & Pydantic Settings** |
| **Frontend Framework** | **React 19 + Vite** |
| **Styling & UI** | **Modern Glassmorphic CSS System (Responsive & Mobile-Ready)** |
| **PDF Generation** | **ReportLab** |
| **Authentication** | **Stateless JWT Tokens + Bcrypt Password Hashing + Role Authorization** |
| **Cloud Hosting** | **Render.com (FastAPI Web Service + React Static Site)** |

---

## 📁 Repository Documentation
- 📄 **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)**: Detailed system architecture, data models (ER diagram), and algorithm blueprints.
- 🚀 **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**: Complete guide on deploying to Render, Neon PostgreSQL, and Vercel.
- 🧪 **[WALKTHROUGH.md](WALKTHROUGH.md)**: Test verification logs and end-to-end integration results.

---

## 💻 Local Development Setup

### 1. Backend Setup
```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# Populate realistic demo mess data
python seed_demo_data.py

# Run FastAPI server on port 8000
python -m uvicorn app.main:app --reload --port 8000
```
Interactive API documentation will be available locally at `http://127.0.0.1:8000/api/v1/docs` and OpenAPI JSON at `http://127.0.0.1:8000/api/v1/openapi.json`.

### 2. Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 👤 Author
- **Mahadeb Maity** — [GitHub Profile](https://github.com/Mahadebmaity)
- Repository: [Mahadebmaity/Hostel-Expense-Calculation](https://github.com/Mahadebmaity/Hostel-Expense-Calculation)
