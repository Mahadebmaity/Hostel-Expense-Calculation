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

    db = SessionLocal()
    try:
        # Check SQLite table columns
        with engine.connect() as conn:
            columns = [row[1] for row in conn.execute(text("PRAGMA table_info(users)")).fetchall()]
            if columns and "is_admin" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0"))
                conn.commit()

        # Ensure default Admin account exists
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

        # Ensure mahadeb also has admin privileges
        mahadeb = db.query(User).filter(User.email == "mahadeb@example.com").first()
        if mahadeb and not mahadeb.is_admin:
            mahadeb.is_admin = True
            db.commit()
    except Exception as e:
        print(f"[!] Startup DB init error (non-fatal): {e}")
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
