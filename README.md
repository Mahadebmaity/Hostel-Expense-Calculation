# 🏨 Hostel & Universal Expense Manager

A modern, full-stack expense calculation and ledger platform designed for **Hostels/Messes, Tour Groups, Flatmates, and Shared Living**.

---

## 🌟 Key Features
- **Mess & Hostel Management**:
  - Daily Meal Attendance (Breakfast, Lunch, Dinner).
  - Dynamic **Meal Rate** Calculation ($\frac{\text{Total Variable Grocery Expense}}{\text{Total Meals Consumed}}$).
  - Fixed Cost Distribution (Cook salary, gas, Wi-Fi, electricity, rent) vs Variable Cost.
  - Member Deposit Ledger & Automatic Net Balance Sheets.
- **Trip & Flatmate Expense Splitter**:
  - Split bills equally, by exact amount, or by custom percentage.
  - **Debt Simplification Algorithm** (Min-Cashflow Graph Greedy Solver) to minimize number of transactions.
- **Automated Statement Export**:
  - Beautiful, audit-ready PDF reports with itemized tables and summary charts.
  - Excel/CSV data exports.
- **Modern Interactive Dashboard**:
  - Real-time balance status, category expense graphs, and instant settle-up via UPI QR codes.

---

## 📖 Documentation & Architecture
- Detailed system architecture, data models, algorithm specifications, and implementation phases are documented in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

---

## 🚀 Tech Stack
- **Backend**: Python (FastAPI), SQLAlchemy 2.0, Pydantic v2
- **Database**: PostgreSQL / SQLite
- **PDF Engine**: ReportLab / WeasyPrint
- **Frontend**: Modern Responsive SPA (Vite/React) with Glassmorphism UI
- **Auth**: JWT Authentication with Role-Based Access Control (Admin/Manager/Member)
