CREATE TABLE IF NOT EXISTS accounts(
    id TEXT PRIMARY KEY,
    type TEXT, -- BankAccountType
    providerID TEXT,
    source TEXT NOT NULL, -- 'TrueLayer' | 'Bagel'
    recordTimestamp TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')) -- when stub inserted
);
