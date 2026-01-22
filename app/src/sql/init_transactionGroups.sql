CREATE TABLE IF NOT EXISTS transactionGroups(
    id TEXT PRIMARY KEY,
    transactionA TEXT NOT NULL,
    transactionB TEXT NOT NULL,

    CHECK (transactionA <> transactionB),
    FOREIGN KEY (transactionA) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (transactionB) REFERENCES transactions(id) ON DELETE CASCADE
);
