# 🏨 Universal Expense & Mess Management Web Application
> **Comprehensive System Architecture & Implementation Blueprint**

---

## 📌 Executive Summary & Problem Statement

### The Problem
During 3+ years of hostel/mess life or group living (flatmates, trips, family outings), tracking and calculating monthly or shared expenses manually leads to:
1. **Mess/Hostel Calculation Complexity**: Handling varying meal counts (breakfast/lunch/dinner), individual deposits, and shared fixed costs (cook salary, gas, electricity, rent) vs variable grocery expenses.
2. **Disputes & Calculation Errors**: Complex debt chains where $A \rightarrow B \rightarrow C$, causing confusion on who owes how much to whom.
3. **Lack of Transparency**: Receipts getting lost, lack of real-time visibility, and delayed end-of-month reconciliation.
4. **Manual Ledger/Console Limitations**: Difficult to share, lacks mobile/web access, and missing instant visual breakdowns and professional downloadable PDF statements.

### The Solution
A modern, scalable **Universal Expense & Mess Management Platform** that supports:
- **Mess & Hostel Mode**: Daily meal attendance tracking with customizable meal units (e.g. Breakfast = 0.5, Lunch = 1, Dinner = 1), dynamic meal rate calculation, manager rotation, deposit tracking, and monthly summary balance sheets.
- **Trip / Tour Mode**: Instant multi-currency/multi-person expense splitting with uneven shares, percentages, or exact amounts.
- **Flatmate / Shared Living Mode**: Recurring utility bills (Wi-Fi, Maid, Electricity, Groceries) with automated debt simplification algorithm (Cashflow Minimization).
- **Instant UPI Settle-up**: Dynamic UPI QR codes and deep links (`upi://pay?pa=...&pn=...&am=...`) for one-tap payments on Google Pay, PhonePe, and Paytm.
- **Automated PDF Statements**: Detailed monthly audit reports with tables, category charts, and settlement breakdowns.

---

## 🏛️ System Architecture

```mermaid
graph TD
    subgraph ClientLayer ["Client Layer (Frontend)"]
        WebUI["React + Vite (Modern Glassmorphic UI & Charts)"]
        UPIModal["Dynamic UPI QR & Deep-link Modal"]
    end

    subgraph APILayer ["Backend API Gateway (FastAPI / Python)"]
        AuthMiddleware["JWT Auth & Role Check"]
        APIRouter["REST Endpoints / API Router"]
    end

    subgraph ServiceLayer ["Business Logic & Engines"]
        MealEngine["Mess & Meal Rate Engine (Custom Meal Units)"]
        SplitEngine["Debt Simplification (Min-Cashflow Graph Algorithm)"]
        UPIService["UPI URI & QR Code Generator"]
        ExpenseService["Expense & Category Service"]
        PDFEngine["PDF Generator (ReportLab / WeasyPrint)"]
    end

    subgraph DataLayer ["Data & Storage Layer"]
        DB[(Relational DB: SQLite / PostgreSQL)]
        FileStore["Receipts & PDF Reports Storage"]
    end

    WebUI -->|HTTPS / JSON REST API| AuthMiddleware
    AuthMiddleware --> APIRouter
    APIRouter --> ExpenseService
    APIRouter --> MealEngine
    APIRouter --> SplitEngine
    APIRouter --> UPIService
    APIRouter --> PDFEngine
    ExpenseService --> DB
    MealEngine --> DB
    SplitEngine --> DB
    PDFEngine --> FileStore
```

---

## 🧮 Core Algorithms & Calculation Engines

### 1. Mess / Hostel Monthly Calculation Engine
In a typical mess system with customizable weights ($W_{\text{breakfast}}=0.5, W_{\text{lunch}}=1.0, W_{\text{dinner}}=1.0$):
$$\text{Individual Meals} = \sum_{\text{days}} (B \times W_B + L \times W_L + D \times W_D)$$
$$\text{Total Meals Consumed} = \sum_{\text{all members}} \text{Individual Meals}$$
$$\text{Meal Rate} = \frac{\text{Total Variable Grocery Expense}}{\text{Total Meals Consumed}}$$

$$\text{Individual Due} = (\text{Individual Meals} \times \text{Meal Rate}) + \frac{\text{Fixed Shared Expenses}}{\text{Total Members}}$$
$$\text{Final Balance (Refund / Due)} = \text{Individual Deposit} - \text{Individual Due}$$

### 2. Debt Simplification (Minimum Cash Flow Graph Algorithm)
Computes net balance for each person ($Balance = TotalPaid - TotalOwed$) and simplifies transactions down to at most $N-1$ using a Greedy Two-Pointer Heap.

### 3. Dynamic UPI String & QR Generation
$$\text{URI} = \texttt{upi://pay?pa=}\langle\text{payee\_upi\_id}\rangle\texttt{\&pn=}\langle\text{payee\_name}\rangle\texttt{\&am=}\langle\text{amount}\rangle\texttt{\&cu=INR\&tn=Mess\_Settlement}$$

---

## 🗄️ Database Schema Design (Entity Relationship)

```mermaid
erDiagram
    USERS ||--o{ GROUP_MEMBERS : "belongs to"
    GROUPS ||--o{ GROUP_MEMBERS : "has"
    GROUPS ||--o{ EXPENSES : "contains"
    GROUPS ||--o{ MEAL_ATTENDANCE : "tracks"
    GROUPS ||--o{ SETTLEMENTS : "settles"
    USERS ||--o{ EXPENSES : "paid by"
    EXPENSES ||--o{ EXPENSE_SPLITS : "split into"
    USERS ||--o{ EXPENSE_SPLITS : "owes share"
    USERS ||--o{ MEAL_ATTENDANCE : "logged for"

    USERS {
        uuid id PK
        string name
        string email
        string upi_id "e.g. username@okhdfcbank"
        string password_hash
        datetime created_at
    }

    GROUPS {
        uuid id PK
        string name
        enum type "MESS | TRIP | FLATMATES | PERSONAL"
        uuid created_by FK
        string currency
        json settings "breakfast_weight, lunch_weight, dinner_weight, fixed_costs"
        datetime created_at
    }

    GROUP_MEMBERS {
        uuid id PK
        uuid group_id FK
        uuid user_id FK
        enum role "ADMIN | MANAGER | MEMBER"
        decimal initial_deposit
        datetime joined_at
    }

    EXPENSES {
        uuid id PK
        uuid group_id FK
        uuid paid_by FK
        string title
        decimal amount
        enum category "GROCERY | RENT | GAS | ELECTRICITY | OUTING | OTHER"
        enum split_type "EQUAL | EXACT | PERCENTAGE | MEAL_BASED"
        boolean is_fixed_cost
        string receipt_url
        date expense_date
    }

    EXPENSE_SPLITS {
        uuid id PK
        uuid expense_id FK
        uuid user_id FK
        decimal share_amount
        decimal percentage
    }

    MEAL_ATTENDANCE {
        uuid id PK
        uuid group_id FK
        uuid user_id FK
        date record_date
        float breakfast_count
        float lunch_count
        float dinner_count
        float total_units
    }

    SETTLEMENTS {
        uuid id PK
        uuid group_id FK
        uuid payer_id FK
        uuid payee_id FK
        decimal amount
        enum status "PENDING | COMPLETED"
        date settled_date
    }
```

---

## 🛠️ Chosen Technology Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Backend** | **Python (FastAPI)** | Blazing fast ASGI performance, native asynchronous support, auto-generated OpenAPI docs at `/docs`. |
| **Database** | **SQLAlchemy 2.0 + SQLite / PostgreSQL** | Full transactional integrity, high-precision numeric calculations. |
| **Frontend** | **React (Vite) + Tailwind & Glassmorphic CSS** | Ultra-responsive, interactive meal matrix grid, dynamic balance graph animations, and offline-friendly. |
| **PDF Generation** | **ReportLab / WeasyPrint** | Structured table formatting and clean printable PDF balance sheets. |
| **Payment Integration** | **Dynamic UPI Deep-link & QR Code** | Seamless settlement directly through PhonePe, Google Pay, and Paytm. |

---

## ⚙️ What You Need To Do Manually (Checklist & Guide)

### 1. 🐙 Git Repository Setup (One-time)
When you want to turn this project into a Git repository and push to GitHub:
```powershell
# Inside the HostelExpenseManager directory:
git init
git add .
git commit -m "Initial commit: Universal Hostel and Expense Manager"

# Create a repo on github.com, then connect:
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/HostelExpenseManager.git
git branch -M main
git push -u origin main
```

### 2. 🔑 Environment Variables (`.env`)
Create a `.env` file in the backend directory (a `.env.example` template will be provided):
```env
SECRET_KEY=your-super-secret-random-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
DATABASE_URL=sqlite:///./hostel_expense.db
ENVIRONMENT=development
FRONTEND_URL=http://localhost:5173
```

### 3. 🚀 Local Running (When developing)
- **Backend**:
  ```powershell
  cd backend
  python -m venv .venv
  .venv\Scripts\activate
  pip install -r requirements.txt
  uvicorn app.main:app --reload --port 8000
  ```
- **Frontend**:
  ```powershell
  cd frontend
  npm install
  npm run dev
  ```

### 4. 🌐 Cloud Deployment (When launching live online - 100% Free Tiers)
1. **Backend & Database**: Deploy on **Render.com** or **Railway.app** (Free Python Web Service + Free PostgreSQL).
   - Set environment variables in Render/Railway dashboard (`SECRET_KEY`, `DATABASE_URL`, `FRONTEND_URL`).
2. **Frontend**: Deploy on **Vercel** or **Netlify** (Connect your GitHub repo, set build command `npm run build`, and add backend API URL in environment variables).
