"""Master registry: SQLite is the source of truth. The Amazon flat file is
GENERATED per batch from this DB - the xlsm never becomes the growing master."""
import sqlite3, os, datetime

SCHEMA = """
CREATE TABLE IF NOT EXISTS images (
    phash        TEXT PRIMARY KEY,      -- perceptual hash (dedupe key)
    sha1         TEXT,                  -- exact-bytes hash
    src_path     TEXT,                  -- original file location
    lib_path     TEXT,                  -- normalized copy in library/
    batch_date   TEXT,                  -- YYYY-MM-DD intake batch
    qa_status    TEXT DEFAULT 'pending',-- pass / fail / manual_review
    qa_reasons   TEXT DEFAULT '',
    item_type    TEXT DEFAULT '',       -- saree / dress_material / lehenga / other / ?
    ai_meta      TEXT DEFAULT '',       -- JSON: color, fabric, occasion (from vision)
    sku          TEXT DEFAULT '',       -- assigned SKU ('' = unassigned)
    slot         TEXT DEFAULT '',       -- MAIN / OTHER1..8 / SWATCH
    uploaded     INTEGER DEFAULT 0,     -- exported into a flat file already?
    ai_checked   INTEGER DEFAULT 0      -- vision API already spent on this? (cache)
);
CREATE TABLE IF NOT EXISTS skus (
    sku        TEXT PRIMARY KEY,
    item_name  TEXT,
    item_type  TEXT,
    created    TEXT
);
CREATE INDEX IF NOT EXISTS idx_sku ON images(sku);
CREATE INDEX IF NOT EXISTS idx_batch ON images(batch_date);
"""

def connect(db_path="registry.db"):
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA)
    return con

def today():
    return datetime.date.today().isoformat()
