from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Normalize PostgreSQL URL if provided as postgres:// (common in Render / Supabase / Heroku)
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# SQLite connection args for multithreaded support
connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def ensure_schema_migrations(eng):
    from sqlalchemy import text
    try:
        with eng.connect() as conn:
            if eng.dialect.name == "sqlite":
                gm_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(group_members)")).fetchall()]
                if gm_cols and "previous_balance" not in gm_cols:
                    conn.execute(text("ALTER TABLE group_members ADD COLUMN previous_balance FLOAT DEFAULT 0.0"))
                    conn.commit()
    except Exception:
        pass

ensure_schema_migrations(engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
