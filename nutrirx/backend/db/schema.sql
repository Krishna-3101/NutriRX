-- Intake snapshots
CREATE TABLE IF NOT EXISTS intakes (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    data TEXT NOT NULL
);

-- Generated weekly plans
CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    intake_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    data TEXT NOT NULL,
    FOREIGN KEY (intake_id) REFERENCES intakes(id)
);

-- Receipt grades
CREATE TABLE IF NOT EXISTS receipt_grades (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    graded_at TEXT NOT NULL,
    data TEXT NOT NULL,
    FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- Week history (denormalized for fast reads)
CREATE TABLE IF NOT EXISTS week_history (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    week_number INTEGER NOT NULL,
    adherence_score REAL,
    avg_glycemic_load REAL,
    avg_sodium_mg REAL,
    avg_iron_mg REAL,
    created_at TEXT NOT NULL
);
