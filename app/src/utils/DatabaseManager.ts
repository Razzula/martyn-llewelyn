import Database, { QueryResult } from '@tauri-apps/plugin-sql';
import { appDataDir } from '@tauri-apps/api/path';

import { getSQL } from '../sql/SQLRegistry.js';

import { defaultChannels, defaultExpenditures, defaultIncomes } from '../data/categories.js';
import { Channel, TransactionCategory } from 'src/types/Bagel.js';

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
        const dir = await appDataDir();
        const path = `sqlite:${dir}/bagel.db`;

        this.db = await Database.load(path);
        await this.db.execute(`PRAGMA journal_mode=WAL;`);

        // dummy
        await this.executeScript('init_test');

        // initialise tables
        await this.executeScript('init_accounts');
        await this.executeScript('init_transactions');
        await this.executeScript('init_channels');
        await this.executeScript('init_categories');
        await this.executeScript('init_transaction2category');

        // default channels/categories
        await this.insertDefaults()

        this.initialised = true;
        console.log(`Database initialised (${path})`);
    }

    async close() {
        /* no close API; allow GC; keep for symmetry */
        this.initialised = false;
        instance = null as any;
    }

    async execute(query: string, bindValues?: unknown[]): Promise<QueryResult> {
        return await this.db.execute(query, bindValues);
    }

    async executeScript(script: string, bindValues?: unknown[]): Promise<QueryResult | null> {
        try {
            return await this.execute(getSQL(script), bindValues);
        }
        catch {
            console.error(script);
        }
        return null;
    }

    async insertDefaults() {
        // Insert channels
        for (const channel of defaultChannels) {
            await this.db.execute(
                `INSERT OR IGNORE INTO channels (id, name, isIncome, colour) VALUES (?, ?, ?, ?)`,
                [channel.id, channel.name, channel.isIncome ? 1 : 0, channel.colour,]
            );
        }
        // Insert categories
        const allCategories = [...defaultExpenditures, ...defaultIncomes];
        for (const category of allCategories) {
            await this.db.execute(
                `INSERT OR IGNORE INTO categories (id, name, icon, channel, builtin) VALUES (?, ?, ?, ?, ?)`,
                [
                    category.id,
                    category.name,
                    category.icon,
                    category.channelID,
                    category.builtin ? 1 : 0,
                ]
            );
        }
        console.log('Default channels and categories inserted.');
    }

    async getChannels(): Promise<Channel[]> {
        const res: unknown[] = await this.db.select('SELECT * FROM channels');
        const channels: Channel[] = [];
        res?.forEach((element: any) => {
            channels.push({
                id: element.id,
                name: element.name,
                isIncome: element.isIncome === 1,
                colour: element.colour,
            });
        });
        return channels;
    }

    async getCategories(): Promise<TransactionCategory[]> {
        const res: unknown[] = await this.db.select('SELECT * FROM categories');
        const categories: TransactionCategory[] = [];
        res?.forEach((element: any) => {
            categories.push({
                id: element.id,
                name: element.name,
                icon: element.icon,
                channelID: element.channel,
                builtin: element.builtin,
            });
        });
        return categories;
    }

}
