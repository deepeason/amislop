-- AmISlop.io D1 Schema (MVP)

-- 检测主表
CREATE TABLE IF NOT EXISTS detections (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    content_hash TEXT NOT NULL,
    text_preview TEXT,
    slop_score INTEGER NOT NULL,
    l1_score INTEGER,
    l3_score INTEGER,
    features TEXT,
    roasted_comment TEXT,
    highlights TEXT,
    source_type TEXT NOT NULL DEFAULT 'text',
    source_url TEXT,
    vote_accurate INTEGER DEFAULT 0,
    vote_inaccurate INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_detections_hash ON detections(content_hash);
CREATE INDEX IF NOT EXISTS idx_detections_user ON detections(user_id);

-- 用户表 (阶段二启用)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    tier TEXT DEFAULT 'free',
    daily_usage INTEGER DEFAULT 0,
    usage_reset_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 投票记录表 (阶段二启用)
CREATE TABLE IF NOT EXISTS votes (
    id TEXT PRIMARY KEY,
    detection_id TEXT NOT NULL,
    user_id TEXT,
    voter_fingerprint TEXT,
    vote_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (detection_id) REFERENCES detections(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_user ON votes(detection_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_fp ON votes(detection_id, voter_fingerprint);

-- 向量指纹表 (MVP 仅写入)
CREATE TABLE IF NOT EXISTS slop_fingerprints (
    vector_id TEXT PRIMARY KEY,
    detection_id TEXT NOT NULL,
    confidence_score REAL,
    text_snippet TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (detection_id) REFERENCES detections(id)
);
