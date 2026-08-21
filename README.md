# 🏨 Universal Expense & Mess Management Platform (Khatabook & Score Board)

A modern, full-stack financial ledger, daily mess calculation, and expense splitting platform built for **Hostels & College Messes (Khatabook & Score Board), Flatmates & Roommates, and Tour / Trip Groups**.

---

## 🌐 Live Production Links
- 💻 **Live Web Application**: [https://hostel-expense-calculation-2.onrender.com](https://hostel-expense-calculation-2.onrender.com)
- ⚙️ **Live Backend API**: [https://hostel-expense-calculation-2.onrender.com](https://hostel-expense-calculation-2.onrender.com)
- 📑 **Interactive API Docs (Swagger UI)**: [https://hostel-expense-calculation-2.onrender.com/api/v1/docs](https://hostel-expense-calculation-2.onrender.com/api/v1/docs)
- 📜 **OpenAPI Specification (JSON)**: [https://hostel-expense-calculation-2.onrender.com/api/v1/openapi.json](https://hostel-expense-calculation-2.onrender.com/api/v1/openapi.json)
- 📖 **Alternative API Docs (Redoc)**: [https://hostel-expense-calculation-2.onrender.com/api/v1/redoc](https://hostel-expense-calculation-2.onrender.com/api/v1/redoc)

---

## 🔑 Login & Demo Credentials

The platform features **Unified Authentication** with automatic role recognition. Log in with admin credentials to access superadmin privileges, or as any member to manage group expenses.

| Account Type | Email | Password | Role & Scope |
| :--- | :--- | :--- | :--- |
| 👑 **Super Admin** | `admin@hostel.com` | `admin123` | Full access across all mess groups, User Directory, platform metrics & audit reports |
| 👤 **Mess Manager / Admin** | `mahadeb@example.com` | `password123` | Manager of *Vivekananda Mess 2026* & Flatmates Group |
| 👥 **Candidate / Member** | `rahul@example.com` | `password123` | Standard member access |

---

## 🌟 Core System Modules

```
 ┌──────────────────────────────────────────────────────────────────────────────────────────┐
 │                                HOSTEL EXPENSE MANAGER                                    │
 ├────────────────────────────┬─────────────────────────────┬───────────────────────────────┤
 │   🏨 TRADITIONAL MESS      │      🏠 FLATMATES DIARY     │     ✈️ TOUR & TRIP PLANNER    │
 │   • Establishment Sheet    │      • Monthly Flat Rent    │     • Hotel & Resort Stay     │
 │   • Variable Meal Pool     │      • Groceries & Dairy    │     • Flight/Train/Bus Tickets│
 │   • Guest Meal Billing     │      • Gas, Water & WiFi    │     • Cab, Fuel & Toll        │
 │   • Score Board Table      │      • Maid / Cook Salary   │     • Group Meals & Drinks    │
 │   • Freeze Month Archive   │      • 1-Click UPI Settle   │     • Activity & Sightseeing  │
 └────────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

---

### 1. 🏨 Traditional Mess Khatabook & Score Board System
Replicates the exact calculations and ledger structure of college and hostel mess managers:

- **🏢 Establishment Charges (Fixed per Candidate)**:
  - Aggregates fixed monthly mess running costs: **Cook/Masi Salary** (`₹3,450`), **Gas Cylinder Refills** (`₹850`), **Special Meat Feast** (`₹3,448`), **Egg Crate** (`₹860`), **Monthly Newspaper/Paper** (`₹170`), and **Others/Cleaning** (`₹485`) $\rightarrow$ Total: **₹9,260**.
  - **Per Candidate Formula**:
    $$\text{Establishment per Head} = \frac{\text{Total Establishment Charges}}{\text{Total Candidates}} = \frac{₹9,260}{15} = \mathbf{₹617.33 \text{ / candidate}}$$

- **🍲 Meal Charge Pool & Dynamic Meal Rate**:
  - Aggregates daily marketing/bazar (`₹5,438`), rice sacks (`₹4,210`), grocery & spices (`₹3,193`), and potato sacks (`₹1,150`) $\rightarrow$ Gross Pool: **₹13,991**.
  - **Guest Meal Deduction**: Guest meal revenues (e.g. Subhankar Da: 1 Fish [₹50] + 1 Veg [₹40] + 5 Meat [₹375] = `₹465`) are deducted directly from the gross marketing pool:
    $$\text{Net Meal Pool} = \text{Gross Marketing} - \text{Guest Revenue} = ₹13,991 - ₹465 = \mathbf{₹13,526}$$
  - **Dynamic Meal Rate Calculation**:
    $$\text{Meal Rate} = \frac{\text{Net Meal Pool}}{\text{Total Member Meals}} = \frac{₹13,526}{700} = \mathbf{₹19.32 \text{ / meal}}$$

- **📜 Candidate Score Board Table (Ledger Output)**:
  $$\text{Total Bill} = (\text{Meals Consumed} \times \text{Meal Rate}) + \text{Establishment} + \text{Guest Meal Charge}$$
  $$\text{Net Due / Refund} = \text{Total Bill} - \text{Total Paid (Advance Deposit + Direct Out-of-Pocket Bazar)}$$

  | Sl | Candidate Name | Live Formula `(Meals × Rate) + Est` | Guest | Total Bill | Paid In | Net Status |
  | :-: | :--- | :--- | :-: | :-: | :-: | :-: |
  | 1 | **Biswajit Da** | `(19.32 × 54) + 617.33` | — | ₹1,661 | ₹1,270 | 🔴 **₹391 Due** |
  | 2 | **Atanu Da** | `(19.32 × 55) + 617.33` | — | ₹1,680 | ₹770 | 🔴 **₹910 Due** |
  | 3 | **Samar Da** | `(19.32 × 49) + 617.33` | — | ₹1,564 | ₹1,530 | 🔴 **₹34 Due** |
  | 4 | **Mahadeb** | `(19.32 × 40) + 617.33` | — | ₹1,390 | ₹860 | 🔴 **₹530 Due** |
  | 8 | **Sankhadip** | `(19.32 × 41) + 617.33` | — | ₹1,409 | ₹2,185 | 🟢 **₹775 Refund (R)** |
  | 10 | **Subhankar Da** | `(19.32 × 55) + 617.33` | +₹465 | ₹2,145 | ₹905 | 🔴 **₹1,240 Due** |

- **💾 Freeze & Archive Month to Khatabook**:
  - Save permanent monthly snapshots (*"May Score Board"*, *"June Score Board"*).
  - Review historical records, audit past calculations, and export tamper-proof PDF audit statements.

---

### 2. 🏠 Flatmates Shared Living Mode
- Built for friends and flatmates sharing an apartment.
- Pre-configured categories: **Flat Rent**, **Supermarket Grocery & Dairy**, **Indane/HP Gas**, **20L Drinking Water**, **300Mbps WiFi**, **Cook/Maid**, and **Electricity Bill**.
- Flexible splitting: Split equally, select custom participating roommates, or enter exact amounts.

---

### 3. ✈️ Tour & Trip Planner Mode
- Built for vacation groups, weekend getaways, and long road trips.
- Pre-configured categories: **Hotel & Resort Stay**, **Flight / Train / Bus Tickets**, **Cab, Fuel & Toll**, **Group Restaurant Meals & Drinks**, and **Sightseeing Passes**.
- Instant on-the-go settle-up with peer debt minimization.

---

### 4. 👥 Virtual / Non-Registered Member Support
- Add flatmates or mess candidates **instantly by entering their name** (e.g. *Biswajit Da*, *Atanu Da*, *Samar Da*).
- **No mandatory user registration, email, or login credentials required**.
- Virtual members fully support advance deposits, daily meal attendance, expense splitting, and UPI settlements.

---

### 5. 💳 Smart Debt Minimization & Instant UPI Payments
- **Greedy Min-Cashflow Graph Solver ($O(N \log N)$)** reduces complicated multi-party debt webs into the minimum possible transactions.
- **Dynamic NPCI UPI QR Codes & Deep Links** (`upi://pay?pa=...&pn=...&am=...`) for instant settlement via Google Pay, PhonePe, Paytm, and BHIM.

---

### 6. 📄 Professional PDF Statement Generator
- Generates formatted audit statements with executive summary cards, breakdown charts, candidate formula tables, and settlement instructions using **ReportLab**.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend Framework** | **Python (FastAPI)** |
| **Database & ORM** | **PostgreSQL (Neon / Render) / SQLite + SQLAlchemy 2.0** |
| **Data Validation** | **Pydantic v2 & Pydantic Settings** |
| **Frontend Framework** | **React 19 + Vite** |
| **Icons & Visuals** | **Lucide Icons + Chart.js / Recharts** |
| **Styling & UI** | **Custom Glassmorphic Vanilla CSS (Responsive & Mobile-Ready)** |
| **PDF Generation** | **ReportLab Engine** |
| **Authentication** | **Stateless JWT Tokens + Bcrypt Password Hashing** |
| **Testing** | **Pytest + Pytest-AnyIO** |

---

## 💻 Local Development Setup

### 1. Clone Repository
```powershell
git clone https://github.com/Mahadebmaity/Hostel-Expense-Calculation.git
cd Hostel-Expense-Calculation
```

### 2. Backend Setup
```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# Populate realistic demo mess dataset (15 candidates, Vivekananda Mess 2026)
python seed_demo_data.py

# Run FastAPI development server
python -m uvicorn app.main:app --reload --port 8000
```
- API Documentation: `http://127.0.0.1:8000/api/v1/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/api/v1/openapi.json`

### 3. Frontend Setup
```powershell
cd ../frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4. Running Backend Tests
```powershell
cd backend
pytest -v
```

---

## 👤 Author & Maintainer
- **Mahadeb Maity** — [GitHub Profile](https://github.com/Mahadebmaity)
- Repository: [Mahadebmaity/Hostel-Expense-Calculation](https://github.com/Mahadebmaity/Hostel-Expense-Calculation)
