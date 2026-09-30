from contextlib import asynccontextmanager
from pathlib import Path
import sqlite3
from fastapi import FastAPI, HTTPException, status, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from typing import Literal, Optional
from pydantic import BaseModel, Field
from fastapi.staticfiles import StaticFiles

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
    status: Literal['Pending', 'Declined', 'Interview', 'Offered', 'Accepted'] = 'Pending'
    contact_info: Optional[str] = None


class ApplicationUpdate(BaseModel):
    position_title: Optional[str] = Field(default=None, min_length=1)
    company_name: Optional[str] = Field(default=None, min_length=1)
    location: Optional[str] = None
    used_resume: Optional[bool] = None
    used_cover_letter: Optional[bool] = None
    interest_rating: Optional[int] = Field(default=None, ge=1, le=5)
    notes: Optional[str] = None
    status: Optional[Literal["Pending", "Declined", "Interview", "Offered", "Accepted"]] = None


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    if not SCHEMA_PATH.exists():
        raise FileNotFoundError(f"Could not find schema file at: {SCHEMA_PATH.resolve()}")

    if not DB_PATH.exists():
        with get_db() as conn:
            with open(SCHEMA_PATH, "r") as f:
                schema_script = f.read()
            conn.executescript(schema_script)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(lifespan=lifespan)

api_router = APIRouter(prefix="/coop-tracker/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://austindehaan.com",
        "https://www.austindehaan.com",
        "http://ff4:8001",
        "http://localhost:8001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@api_router.get("/applications")
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
                a.status,
                a.applied_date,
                c.company_name,
                c.contact_info
            FROM applications a
            JOIN company c USING (company_id)
            ORDER BY a.application_id ASC;
        """

        rows = cursor.execute(query).fetchall()

        return [dict(row) for row in rows]


@api_router.post("/applications", status_code=status.HTTP_201_CREATED)
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
                notes,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                company_id,
                payload.position_title,
                payload.location,
                payload.used_resume,
                payload.used_cover_letter,
                payload.interest_rating,
                payload.notes,
                payload.status,
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
            "contact_info": payload.contact_info,
            "position_title": payload.position_title,
            "location": payload.location,
            "used_resume": payload.used_resume,
            "used_cover_letter": payload.used_cover_letter,
            "interest_rating": payload.interest_rating,
            "notes": payload.notes,
            "status": payload.status,
            "applied_date": applied_date
        }


@api_router.delete("/applications/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
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


@api_router.patch("/applications/{application_id}")
def update_application(application_id: int, payload: ApplicationUpdate):
    """
    Updates the changed fields of an application.
    """
    updates = payload.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No fields to update.")

    with get_db() as conn:
        cursor = conn.cursor()

        existing = cursor.execute(
            "SELECT application_id FROM applications WHERE application_id = ?",
            (application_id,),
        ).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Application with ID {application_id} not found.",
            )

        if "position_title" in updates:
            updates["position_title"] = updates["position_title"].strip()
            if not updates["position_title"]:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Position is required.")

        if "company_name" in updates:
            company_name = updates.pop("company_name").strip()

            if not company_name:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Company is required.")
            
            company = cursor.execute(
                "SELECT company_id FROM company WHERE LOWER(company_name) = LOWER(?)",
                (company_name,),
            ).fetchone()

            if company is None:
                cursor.execute(
                    "INSERT INTO company (company_name, contact_info) VALUES (?, NULL)",
                    (company_name,),
                )

                company_id = cursor.lastrowid
            else:
                company_id = company["company_id"]
            updates["company_id"] = company_id

        allowed_fields = {
            "position_title",
            "location",
            "used_resume",
            "used_cover_letter",
            "interest_rating",
            "notes",
            "status",
            "company_id",
        }
        assignments = ", ".join(f"{field} = ?" for field in updates if field in allowed_fields)
        values = [value for field, value in updates.items() if field in allowed_fields]

        cursor.execute(
            f"UPDATE applications SET {assignments} WHERE application_id = ?",
            (*values, application_id),
        )
        conn.commit()

        updated = cursor.execute(
            """
            SELECT a.application_id, a.position_title, a.location, a.used_resume,
                   a.used_cover_letter, a.interest_rating, a.notes, a.status,
                   a.applied_date, c.company_name, c.contact_info
            FROM applications a
            JOIN company c USING (company_id)
            WHERE a.application_id = ?
            """,
            (application_id,),
        ).fetchone()

    return dict(updated)


@api_router.get("/health")
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


app.include_router(api_router)

if FRONTEND_DIST.exists():
    app.mount("/coop-tracker", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")