from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
import app.models  # Ensure all models are loaded before table creation
from app.api.router import api_router

# Auto-create tables on startup (works seamlessly for SQLite / PostgreSQL)
Base.metadata.create_all(bind=engine)

def init_db_and_admin():
    from sqlalchemy import text
    from app.core.database import SessionLocal
    from app.models.user import User
    from app.core.security import get_password_hash

    # 1. Check and add columns if missing (Works on PostgreSQL and SQLite)
    try:
        with engine.connect() as conn:
            if engine.dialect.name == "sqlite":
                # Users table
                user_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(users)")).fetchall()]
                if user_cols and "is_admin" not in user_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0"))
                    conn.commit()

                # Group Members table
                gm_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(group_members)")).fetchall()]
                if gm_cols:
                    if "name" not in gm_cols:
                        conn.execute(text("ALTER TABLE group_members ADD COLUMN name VARCHAR(120)"))
                    if "email" not in gm_cols:
                        conn.execute(text("ALTER TABLE group_members ADD COLUMN email VARCHAR(150)"))
                    if "phone" not in gm_cols:
                        conn.execute(text("ALTER TABLE group_members ADD COLUMN phone VARCHAR(25)"))
                    if "upi_id" not in gm_cols:
                        conn.execute(text("ALTER TABLE group_members ADD COLUMN upi_id VARCHAR(100)"))
                    if "is_virtual" not in gm_cols:
                        conn.execute(text("ALTER TABLE group_members ADD COLUMN is_virtual VARCHAR(10) DEFAULT 'true'"))
                    conn.commit()

                # Expenses table
                exp_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(expenses)")).fetchall()]
                if exp_cols:
                    if "paid_by_member_id" not in exp_cols:
                        conn.execute(text("ALTER TABLE expenses ADD COLUMN paid_by_member_id VARCHAR(36)"))
                    conn.commit()

                # Expense Splits table
                es_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(expense_splits)")).fetchall()]
                if es_cols:
                    if "member_id" not in es_cols:
                        conn.execute(text("ALTER TABLE expense_splits ADD COLUMN member_id VARCHAR(36)"))
                    conn.commit()

                # Meal Attendance table
                meal_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(meal_attendance)")).fetchall()]
                if meal_cols:
                    if "member_id" not in meal_cols:
                        conn.execute(text("ALTER TABLE meal_attendance ADD COLUMN member_id VARCHAR(36)"))
                    if "guest_veg_count" not in meal_cols:
                        conn.execute(text("ALTER TABLE meal_attendance ADD COLUMN guest_veg_count FLOAT DEFAULT 0.0"))
                    if "guest_fish_count" not in meal_cols:
                        conn.execute(text("ALTER TABLE meal_attendance ADD COLUMN guest_fish_count FLOAT DEFAULT 0.0"))
                    if "guest_meat_count" not in meal_cols:
                        conn.execute(text("ALTER TABLE meal_attendance ADD COLUMN guest_meat_count FLOAT DEFAULT 0.0"))
                    if "guest_charge" not in meal_cols:
                        conn.execute(text("ALTER TABLE meal_attendance ADD COLUMN guest_charge FLOAT DEFAULT 0.0"))
                    conn.commit()

                # Settlements table
                st_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(settlements)")).fetchall()]
                if st_cols:
                    if "payer_member_id" not in st_cols:
                        conn.execute(text("ALTER TABLE settlements ADD COLUMN payer_member_id VARCHAR(36)"))
                    if "payee_member_id" not in st_cols:
                        conn.execute(text("ALTER TABLE settlements ADD COLUMN payee_member_id VARCHAR(36)"))
                    conn.commit()

            elif engine.dialect.name == "postgresql":
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE"))
                conn.commit()
    except Exception as e:
        print(f"[!] Migration notice: {e}")

    # 2. Ensure Admin and Demo accounts are configured
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == "admin@hostel.com").first()
        if not admin:
            admin = User(
                name="System Administrator",
                email="admin@hostel.com",
                phone="9876540000",
                upi_id="admin@okhdfc",
                is_admin=True,
                password_hash=get_password_hash("admin123")
            )
            db.add(admin)
            db.commit()
        else:
            if not admin.is_admin:
                admin.is_admin = True
                db.commit()

        mahadeb = db.query(User).filter(User.email == "mahadeb@example.com").first()
        if mahadeb:
            if not mahadeb.is_admin:
                mahadeb.is_admin = True
                db.commit()
        else:
            mahadeb = User(
                name="Mahadeb Maity",
                email="mahadeb@example.com",
                phone="9876543210",
                upi_id="mahadeb@oksbi",
                is_admin=True,
                password_hash=get_password_hash("password123")
            )
            db.add(mahadeb)
            db.commit()

        # If database has no groups, auto seed demo mess data
        from app.models.group import Group
        if db.query(Group).count() == 0:
            from seed_demo_data import seed_data
            seed_data()
    except Exception as e:
        print(f"[!] Startup admin/seed error: {e}")
    finally:
        db.close()

init_db_and_admin()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": "Welcome to Universal Expense & Mess Management API",
        "docs_url": f"{settings.API_V1_STR}/docs",
        "version": settings.VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
