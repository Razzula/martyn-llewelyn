CREATE TABLE IF NOT EXISTS categories(
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    channel TEXT NOT NULL,
    builtin INTEGER DEFAULT 0,
    FOREIGN KEY(channel) REFERENCES channels(id)
);
