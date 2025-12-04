CREATE TABLE IF NOT EXISTS transaction2category(
    transactionID TEXT NOT NULL,
    categoryID TEXT NOT NULL,
    PRIMARY KEY(transactionID, categoryID),
    FOREIGN KEY(transactionID) REFERENCES transactions(id),
    FOREIGN KEY(categoryID) REFERENCES categories(id)
);
