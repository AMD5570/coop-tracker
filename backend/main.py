from contextlib import asynccontextmanager
from pathlib import Path
import sqlite3
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "schema.db"
SCHEMA_PATH = BASE_DIR.parent / "schema" / "schema.sql"
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"

class ApplicationCreate(BaseModel):
    company_name: str
    position_title: str
    location: Optional[str] = None
    used_resume: bool = False
    used_cover_letter: bool = False
    interest_rating: int = Field(default=3, ge=1, le=5)
    notes: Optional[str] = ""
    contact_info: Optional[str] = None


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    if not SCHEMA_PATH.exists():
        raise FileNotFoundError(f"Could not find schema file at: {SCHEMA_PATH.resolve()}")

    with get_db() as conn:
        with open(SCHEMA_PATH, "r") as f:
            schema_script = f.read()
        conn.executescript(schema_script)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/applications")
def get_applications():
    """
    Fetches all internship applications with their company details.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        query = """
            SELECT
                a.application_id,
                a.position_title,
                a.location,
                a.used_resume,
                a.used_cover_letter,
                a.interest_rating,
                a.notes,
                a.applied_date,
                c.company_name,
                c.contact_info
            FROM applications a
            JOIN company c USING (company_id)
            ORDER BY a.application_id DESC;
        """

        rows = cursor.execute(query).fetchall()

        return [dict(row) for row in rows]


@app.post("/api/applications", status_code=status.HTTP_201_CREATED)
def create_new_application(payload: ApplicationCreate):
    """
    Creates a new application.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        stripped_company_name = payload.company_name.strip()
        cursor.execute(
            "SELECT company_id FROM company WHERE LOWER(company_name) = LOWER(?)",
            (stripped_company_name,)
        )
        company_row = cursor.fetchone()

        if company_row:
            company_id = company_row["company_id"]
        else:
            cursor.execute(
                "INSERT INTO company (company_name, contact_info) VALUES (?, ?)",
                (stripped_company_name, payload.contact_info)
            )
            company_id = cursor.lastrowid

        cursor.execute(
            """
            INSERT INTO applications (
                company_id,
                position_title,
                location,
                used_resume,
                used_cover_letter,
                interest_rating,
                notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                company_id,
                payload.position_title,
                payload.location,
                payload.used_resume,
                payload.used_cover_letter,
                payload.interest_rating,
                payload.notes,
            )
        )

        application_id = cursor.lastrowid

        cursor.execute(
            "SELECT applied_date FROM applications WHERE application_id = ?", 
            (application_id,)
        )
        applied_date = cursor.fetchone()["applied_date"]

        return {
            "application_id": application_id,
            "company_id": company_id,
            "company_name": stripped_company_name,
            "position_title": payload.position_title,
            "location": payload.location,
            "used_resume": payload.used_resume,
            "used_cover_letter": payload.used_cover_letter,
            "interest_rating": payload.interest_rating,
            "notes": payload.notes,
            "applied_date": applied_date
        }



@app.delete("/api/applications/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_application(application_id: int):
    """
    Removes an application from the database.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("DELETE FROM applications WHERE application_id = ?", (application_id,))

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Application with ID {application_id} not found."
            )

        conn.commit()

    return None


@app.get("/api/health")
def server_health_check():
    """
    Checks to see if the table(s) were successfully created.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        tables = cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table';"
        ).fetchall()
        table_names = [row["name"] for row in tables if not row["name"].startswith("sqlite_")]
        return {"status": "ok", "tables": table_names}