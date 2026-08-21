import os
from contextlib import asynccontextmanager
import threading
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
import app.models  # Ensure all models are loaded before table creation
from app.api.router import api_router

def init_db_and_admin():
    # 1. Create tables if missing
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[!] Table creation note: {e}")

    from sqlalchemy import text
    from app.core.database import SessionLocal
    from app.models.user import User
    from app.core.security import get_password_hash

    # 2. Check and add columns if missing (Works on PostgreSQL and SQLite)
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
                    if "marketing_amount" not in gm_cols:
                        conn.execute(text("ALTER TABLE group_members ADD COLUMN marketing_amount FLOAT DEFAULT 0.0"))
                    if "marketing_days" not in gm_cols:
                        conn.execute(text("ALTER TABLE group_members ADD COLUMN marketing_days FLOAT DEFAULT 0.0"))
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
                    if "guest_egg_count" not in meal_cols:
                        conn.execute(text("ALTER TABLE meal_attendance ADD COLUMN guest_egg_count FLOAT DEFAULT 0.0"))
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
                conn.execute(text("ALTER TABLE group_members ADD COLUMN IF NOT EXISTS name VARCHAR(120)"))
                conn.execute(text("ALTER TABLE group_members ADD COLUMN IF NOT EXISTS email VARCHAR(150)"))
                conn.execute(text("ALTER TABLE group_members ADD COLUMN IF NOT EXISTS phone VARCHAR(25)"))
                conn.execute(text("ALTER TABLE group_members ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100)"))
                conn.execute(text("ALTER TABLE group_members ADD COLUMN IF NOT EXISTS is_virtual VARCHAR(10) DEFAULT 'true'"))
                conn.execute(text("ALTER TABLE group_members ADD COLUMN IF NOT EXISTS marketing_amount FLOAT DEFAULT 0.0"))
                conn.execute(text("ALTER TABLE group_members ADD COLUMN IF NOT EXISTS marketing_days FLOAT DEFAULT 0.0"))
                conn.execute(text("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_by_member_id VARCHAR(36)"))
                conn.execute(text("ALTER TABLE expense_splits ADD COLUMN IF NOT EXISTS member_id VARCHAR(36)"))
                conn.execute(text("ALTER TABLE meal_attendance ADD COLUMN IF NOT EXISTS member_id VARCHAR(36)"))
                conn.execute(text("ALTER TABLE meal_attendance ADD COLUMN IF NOT EXISTS guest_veg_count FLOAT DEFAULT 0.0"))
                conn.execute(text("ALTER TABLE meal_attendance ADD COLUMN IF NOT EXISTS guest_fish_count FLOAT DEFAULT 0.0"))
                conn.execute(text("ALTER TABLE meal_attendance ADD COLUMN IF NOT EXISTS guest_meat_count FLOAT DEFAULT 0.0"))
                conn.execute(text("ALTER TABLE meal_attendance ADD COLUMN IF NOT EXISTS guest_egg_count FLOAT DEFAULT 0.0"))
                conn.execute(text("ALTER TABLE meal_attendance ADD COLUMN IF NOT EXISTS guest_charge FLOAT DEFAULT 0.0"))
                conn.execute(text("ALTER TABLE settlements ADD COLUMN IF NOT EXISTS payer_member_id VARCHAR(36)"))
                conn.execute(text("ALTER TABLE settlements ADD COLUMN IF NOT EXISTS payee_member_id VARCHAR(36)"))
                conn.commit()
    except Exception as e:
        print(f"[!] Migration notice: {e}")

    # 3. Ensure Admin and Demo accounts are configured
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

        # If SQLite and database has no groups, auto seed demo mess data
        if engine.dialect.name == "sqlite":
            from app.models.group import Group
            if db.query(Group).count() == 0:
                from seed_demo_data import seed_data
                seed_data()
    except Exception as e:
        print(f"[!] Startup admin/seed error: {e}")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB in background thread so Uvicorn binds to port instantly
    threading.Thread(target=init_db_and_admin, daemon=True).start()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
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
    frontend_index = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist", "index.html"))
    if os.path.exists(frontend_index):
        from fastapi.responses import FileResponse
        return FileResponse(frontend_index)
    return {
        "message": "Welcome to Universal Expense & Mess Management API",
        "docs_url": f"{settings.API_V1_STR}/docs",
        "version": settings.VERSION
    }

# Check for static frontend build (supports single-service fullstack deployment on Render/Railway/Docker)
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist) and os.path.isdir(frontend_dist):
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_spa_frontend(full_path: str):
        # Don't intercept API or Swagger docs
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path.startswith("openapi.json"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="API endpoint not found")
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
