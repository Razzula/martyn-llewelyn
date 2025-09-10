import Database from '@tauri-apps/plugin-sql';

import { getSQL } from '../sql/SQLRegistry.js';

/**
 * Singleton instance of the database manager.
 */
let instance: DatabaseManager | null = null;

/**
 * Get singleton instance of the database manager, creating and initialising it if needed.
 * @returns DatabaseManager instance
 */
export async function getDatabaseManager(): Promise<DatabaseManager> {
    if (instance) {
        return instance;
    }

    instance = new DatabaseManager();
    await instance.init();
    return instance;
}

/**
 * Class to manage the SQLite database connection and operations.
 */
export class DatabaseManager {
    private db!: Database;
    private initialised = false;

    /**
     * Initialise the database connection and create tables if needed.
     * @returns 
     */
    async init() {
        if (this.initialised) {
            return;
        }

        this.db = await Database.load('sqlite:bagel.db');
        await this.db.execute(`PRAGMA journal_mode=WAL;`);
        await this.db.execute(getSQL('init_test'));
        this.initialised = true;
        console.log('Database initialised');
    }

    async close() {
        /* no close API; allow GC; keep for symmetry */
        this.initialised = false;
        instance = null as any;
    }
}
