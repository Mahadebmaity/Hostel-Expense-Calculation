# 🏨 Universal Expense & Mess Management Platform — Walkthrough & Verification

## 🎯 What Was Built

We have built a **Full-Stack Universal Expense & Mess Management Web Application** tailored for:
1. **Hostels & Traditional Mess Life (Khatabook & Score Board)**:
   - **Establishment Fixed Charges Calculation**: Cook/Masi (`₹3450`), Gas Refills (`₹850`), Meat Feast (`₹3448`), Egg Crate (`₹860`), Newspaper/Paper (`₹170`), Others (`₹485`) $\rightarrow$ Total: **₹9,260** ÷ 15 candidates = **₹617.33 / candidate**.
   - **Meal Charge & Marketing Pool**: Daily Bazar (`₹5438`), Rice Sack (`₹4210`), Grocery (`₹3193`), Potato Sack (`₹1150`) $\rightarrow$ Gross: **₹13,991** - Guest Meal Revenue (`-₹465`) $\rightarrow$ Net Pool: **₹13,526** ÷ 700 meals = **₹19.32 / meal**.
   - **May Score Board Table**: Live formula display `(Meals × Rate) + Establishment + Guest = Total Bill - Total Paid = Net Due / Refund`.
   - **Freeze & Archive Month to Khatabook**: Archive snapshots (e.g. *May Score Board*) with ReportLab PDF audit reports.
2. **Flatmates Shared Living Mode**:
   - Monthly Flat Rent, Supermarket Grocery & Dairy, Gas Cylinders, 20L Water Cans, 300Mbps WiFi, Maid Salary, and Electricity Bill.
3. **Tour / Trip Planner Mode**:
   - Hotel & Resort Stay, Flight/Train/Bus Tickets, Cab/Fuel/Toll, Restaurant Outings, Sightseeing & Activity Passes with 1-click UPI settle-up.
4. **Virtual / Non-Registered Member Support**:
   - Instant addition of members by name alone with no mandatory registration or login accounts.

---

## 🏗️ Architecture & Component Summary

### 1. Backend (Python + FastAPI + SQLAlchemy 2.0)
- **Modular Design**:
  - `app/api/v1/`: REST endpoints for `auth`, `groups`, `expenses`, `meals`, `settlements`, `reports`, `admin`.
  - `app/models/`: Relational schema with `User`, `Group`, `GroupMember` (virtual members), `Expense`, `ExpenseSplit`, `MealAttendance` (guest meals), `MonthlyScoreBoard`, `Settlement`.
  - `app/services/meal_engine.py`: Rebuilt mess financial calculator with exact establishment per-head charges, net meal pool, guest meal deductions, and candidate formula strings.
  - `app/services/split_engine.py`: Debt simplification graph solver ($O(N \log N)$ reduction).
  - `app/services/upi_service.py`: Standard NPCI UPI URI and PNG QR Code encoder.
  - `app/services/pdf_service.py`: ReportLab tabular PDF statement generator.
- **Database**: SQLite (local development) / PostgreSQL (production ready via `DATABASE_URL`).

### 2. Frontend (React 19 + Vite + Glassmorphic Design System)
- **Components**:
  - `Navbar.jsx`: Group switcher, UPI ID profile badge, edit modal, logout.
  - `MetricCards.jsx`: Real-time stats (Personal Refund/Due, Total Group Spend, Dynamic Meal Rate, Deposits).
  - `MessMealTracker.jsx`: 3 views (Monthly Scoreboard Ledger, Daily Marking, and Date Matrix).
  - `SettlementEngine.jsx`: Establishment breakdown, variable meal pool card, live Score Board Khatabook table, and saved snapshots drawer.
  - `ExpenseList.jsx`: Category-filtered and searchable purchases feed with rich category icons.
  - `UPIModal.jsx`: Scannable QR code, copyable UPI ID, and direct app launcher.
  - `AddExpenseModal.jsx`: Establishment vs Meal Bazar categories, flatmate presets, tour presets, and member selector.
  - `GroupSettingsModal.jsx`: Quick name-only member additions, deposit management, meal weights, and guest meal rates.
  - `AnalyticsCharts.jsx`: Clean SVG donut and progress breakdown.

---

## 🧪 Verification & Test Results

### 1. Automated Unit Tests (`pytest`)
Ran unit tests on core engines:
- ✅ `test_custom_meal_units_calculation`: PASSED
- ✅ `test_debt_simplification_algorithm`: PASSED
- ✅ `test_upi_uri_and_qr_generation`: PASSED
- ✅ `test_pdf_generation`: PASSED
- ✅ `test_notebook_may_score_board_calculation`: PASSED
```
============================== 5 passed in 1.45s ==============================
```

### 2. Frontend Production Build
- `vite build` completed in **6.41s** with 0 errors and generated optimized bundles.

---

## 🚀 How To Run & Access Live

### Running Servers
- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **FastAPI Backend**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/api/v1/docs](http://127.0.0.1:8000/api/v1/docs)

### Pre-seeded Demo Accounts (Password: `password123`)
- `mahadeb@example.com` (Admin / Mess Manager)
- `rahul@example.com` (Manager)
- `admin@hostel.com` (Super Admin, Password: `admin123`)
