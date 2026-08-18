# 🏨 Universal Expense & Mess Management Platform

A modern, full-stack financial ledger and calculation web application designed for **Hostels & Mess Life, Tour/Trip Groups, Flatmates, and Shared Living**.

---

## 🌐 Live Production Links
- 💻 **Live Web Application**: [https://hostel-expense-calculation-manager.onrender.com](https://hostel-expense-calculation-manager.onrender.com)
- ⚙️ **Live Backend API**: [https://hostel-expense-calculation.onrender.com](https://hostel-expense-calculation.onrender.com)
- 📑 **Interactive API Docs (Swagger UI)**: [https://hostel-expense-calculation.onrender.com/api/v1/docs](https://hostel-expense-calculation.onrender.com/api/v1/docs)
- 📖 **Alternative API Docs (Redoc)**: [https://hostel-expense-calculation.onrender.com/api/v1/redoc](https://hostel-expense-calculation.onrender.com/api/v1/redoc)

---

## 🌟 Key Features

### 1. 🍽️ Mess & Hostel Daily Meal Tracker
- Customizable meal unit weights (e.g. Breakfast = 0.5x, Lunch = 1.0x, Dinner = 1.0x).
- Real-time **Dynamic Meal Rate** calculation:
  $$\text{Meal Rate} = \frac{\text{Total Variable Grocery Expense}}{\text{Total Meals Consumed}}$$
- Daily meal attendance counters with 15-day monthly matrix table view.

### 2. ⚡ Fixed vs Variable Cost Division
- Fixed costs (Cook salary, Gas cylinder, Electricity, Wi-Fi, Room rent) are divided equally among all members.
- Variable costs (Groceries, Vegetables, Meat/Fish) are calculated based on individual meal consumption.

### 3. 💳 Debt Simplification Graph Algorithm
- Implements a **Greedy Min-Cashflow Graph Solver** ($O(N \log N)$) that condenses complex multi-party debt chains into the absolute minimum number of peer-to-peer payout transactions.

### 4. 📱 Instant UPI Settle-Up (QR & Deep Links)
- Generates dynamic NPCI-compliant UPI QR codes and deep links (`upi://pay?pa=...&pn=...&am=...`) for instant settlement via Google Pay, PhonePe, Paytm, and BHIM.

### 5. 📄 Audit-Ready PDF Statement Generator
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
| **Authentication** | **Stateless JWT Tokens + Bcrypt Password Hashing** |
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

# Run server on port 8000
python -m uvicorn app.main:app --reload --port 8000
```
API Documentation will be available locally at `http://127.0.0.1:8000/api/v1/docs`.

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
