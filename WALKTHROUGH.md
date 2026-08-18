# 🏨 Universal Expense & Mess Management Platform — Walkthrough & Verification

## 🎯 What Was Built

We have built a **Full-Stack Universal Expense & Mess Management Web Application** tailored for:
1. **Hostels & Mess Life**: Daily meal attendance tracking with customizable weights (Breakfast 0.5x, Lunch 1.0x, Dinner 1.0x), dynamic monthly **Meal Rate** calculation ($\frac{\text{Variable Grocery Expenses}}{\text{Total Meals}}$), fixed utility splitting (Cook, Gas, Electricity, Room Rent), and deposit reconciliation.
2. **Trips & Flatmates**: Equal, exact, and percentage splits with **Debt Simplification Graph Algorithm** (Greedy Min-Cashflow Solver) minimizing multi-party payouts.
3. **Instant UPI Payments**: Deep-link opener and dynamic QR Code generation for PhonePe, Google Pay, and Paytm payments.
4. **Audit PDF Statements**: Downloadable monthly statements with formatted summary metrics, individual meal breakdown tables, and payment instructions.

---

## 🏗️ Architecture & Component Summary

### 1. Backend (Python + FastAPI + SQLAlchemy 2.0)
- **Modular Design**:
  - `app/api/v1/`: REST endpoints for `auth`, `groups`, `expenses`, `meals`, `settlements`, `reports`.
  - `app/models/`: Relational schema with `User`, `Group`, `GroupMember`, `Expense`, `ExpenseSplit`, `MealAttendance`, `Settlement`.
  - `app/services/meal_engine.py`: Dynamic mess financial calculator & attendance multiplier.
  - `app/services/split_engine.py`: Debt simplification graph solver ($O(N \log N)$ reduction).
  - `app/services/upi_service.py`: Standard NPCI UPI URI and PNG QR Code encoder.
  - `app/services/pdf_service.py`: ReportLab tabular PDF statement generator.
- **Database**: SQLite (local development) / PostgreSQL (production ready via `DATABASE_URL`).

### 2. Frontend (React 19 + Vite + Glassmorphic Design System)
- **Components**:
  - `Navbar.jsx`: Group switcher, UPI ID profile badge, edit modal, logout.
  - `MetricCards.jsx`: Real-time stats (Personal Refund/Due, Total Group Spend, Dynamic Meal Rate, Deposits).
  - `MessMealTracker.jsx`: Daily attendance counter buttons (`- 1 +`), date navigation, and monthly matrix view.
  - `ExpenseList.jsx`: Category-filtered and searchable purchases feed.
  - `SettlementEngine.jsx`: Simplified payout cards with "Pay / Settle QR" action.
  - `UPIModal.jsx`: Scannable QR code, copyable UPI ID, and direct app launcher.
  - `AddExpenseModal.jsx`: Add grocery vs fixed utilities with custom categories.
  - `GroupSettingsModal.jsx`: Manage members, advance deposits, and meal weights.
  - `AnalyticsCharts.jsx`: Clean SVG donut and progress breakdown.

---

## 🧪 Verification & Test Results

### 1. Automated Unit Tests (`pytest`)
Ran unit tests on core engines:
- ✅ `test_custom_meal_units_calculation`: PASSED
- ✅ `test_debt_simplification_algorithm`: PASSED
- ✅ `test_upi_uri_and_qr_generation`: PASSED
- ✅ `test_pdf_generation`: PASSED

### 2. End-to-End API Integration
Executed `scratch_test_e2e.py` against live server:
```
[+] Auth Login Success: Token generated
[+] Fetched Group: Royal Engineers Mess 2026 (Type: MESS)
[+] Calculated Mess Balances: Meal Rate = Rs 50.3478/meal, Total Meals = 115.0
[+] Simplified Transactions: 2 payouts recommended
    -> Priya Sengupta -> Mahadeb Maity: Rs 162.63 (UPI: mahadeb@oksbi)
    -> Amit Das -> Mahadeb Maity: Rs 89.49 (UPI: mahadeb@oksbi)
[+] PDF Report Generated Successfully! Size: 3866 bytes
[SUCCESS] All Full-Stack API Integration flows passed flawlessly!
```

### 3. Frontend Production Build
- `vite build` completed in **4.94s** with 0 errors and generated optimized bundles.

---

## 🚀 How To Run & Access Live

### Running Servers
- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **FastAPI Backend**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/api/v1/docs](http://127.0.0.1:8000/api/v1/docs)

### Pre-seeded Demo Accounts (Password: `password123`)
- `mahadeb@example.com` (Admin / Mess Manager)
- `rahul@example.com` (Manager)
- `sourav@example.com` (Member)
- `amit@example.com` (Member)
- `priya@example.com` (Member)
