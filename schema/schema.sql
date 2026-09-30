PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS company;
DROP TABLE IF EXISTS applications;

CREATE TABLE company (
    company_id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL UNIQUE,
    contact_info TEXT
);

CREATE TABLE applications (
    application_id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    position_title TEXT NOT NULL,
    location TEXT,
    used_resume BOOLEAN NOT NULL DEFAULT 0,
    used_cover_letter BOOLEAN NOT NULL DEFAULT 0,
    interest_rating INTEGER CHECK (interest_rating BETWEEN 1 AND 5),
    notes TEXT DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Declined', 'Interview', 'Offered', 'Accepted')),
    applied_date TEXT DEFAULT (date('now')),
    FOREIGN KEY (company_id) REFERENCES company(company_id)
        ON DELETE CASCADE
);