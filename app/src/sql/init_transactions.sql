CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY, -- TrueLayer transaction_id
    amount REAL NOT NULL, -- encrypted
    currency TEXT NOT NULL,
    description TEXT,
    transactionType TEXT,
    transactionCategory TEXT,
    timestamp TEXT NOT NULL,
    source TEXT NOT NULL,
    recordTimestamp TEXT NOT NULL
);
