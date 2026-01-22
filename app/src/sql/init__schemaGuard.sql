CREATE TRIGGER enforce_single_schema_version
BEFORE INSERT ON _schema
WHEN (SELECT COUNT(*) FROM _schema) >= 1
BEGIN
    SELECT RAISE(ABORT, 'Only one schema version row allowed');
END;
