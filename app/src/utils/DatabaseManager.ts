import Database, { QueryResult } from '@tauri-apps/plugin-sql';
import { appDataDir } from '@tauri-apps/api/path';

import { getSQL } from '../sql/SQLRegistry.js';

import { defaultChannels, defaultExpenditures, defaultIncomes } from '../data/categories.js';
import { Channel, Transaction, TransactionCategory } from '../types/Bagel.js';
import { newOrderedDateTreeFromList, OrderedDateTree } from '../types/OrderedDateTree.js';
import { toYYYYMMDD } from './utils.js';

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
        const rows: unknown[] = await this.db.select('SELECT * FROM channels');
        const channels: Channel[] = [];
        rows?.forEach((element: any) => {
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
        const rows: unknown[] = await this.db.select('SELECT * FROM categories');
        const categories: TransactionCategory[] = [];
        rows?.forEach((element: any) => {
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

    async insertTransactions(transactions: OrderedDateTree<Transaction>) {
        const tree = transactions.getTree();
        const inserts: any[] = [];

        const sql = `
            INSERT OR IGNORE INTO transactions
            (id, accountID, amount, currency, description, transactionType, transactionCategory, timestamp, source, recordTimestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        // flatten tree
        for (const year in tree) {
            for (const month in tree[year]) {
                for (const day in tree[year][month]) {
                    for (const tx of tree[year][month][day]) {
                        inserts.push([
                            tx.transactionID,
                            tx.accountID,
                            tx.amount,
                            tx.currency,
                            tx.description ?? '',
                            tx.transactionType ?? '',
                            tx.transactionCategory ?? '',
                            tx.timestamp,
                            tx.source,
                            new Date().toISOString(), // recordTimestamp
                        ]);
                    }
                }
            }
        }

        // batch insert
        for (const params of inserts) {
            await this.db.execute(sql, params);
        }
        console.log(`Inserted* ${inserts.length} transactions.`);
    }

    async getTransactions(from: string, to: string): Promise<OrderedDateTree<Transaction>> {
        
        // XXX: this is bit hacky, but since `to` will alwaysbe 00:00:00, we use the next day as the bound
        const toUpperBound = new Date(to);
        toUpperBound.setDate(toUpperBound.getDate() + 1); // move to next day
        const toUpper = toYYYYMMDD(toUpperBound);

        const rows: any[] = await this.db.select(
            `SELECT t.*, 
                GROUP_CONCAT(c.id) AS categoryIDs
            FROM transactions t
            LEFT JOIN transaction2category tc ON t.id = tc.transactionID
            LEFT JOIN categories c ON tc.categoryID = c.id
            WHERE t.timestamp >= ? AND t.timestamp <= ?
            GROUP BY t.id`,
            [from, toUpper]
        );

        // map DB rows to Transaction objects
        const transactions: Transaction[] = rows.map(row => ({
            transactionID: row.id,
            accountID: row.accountID,
            amount: row.amount,
            currency: row.currency,
            description: row.description,
            transactionType: row.transactionType,
            transactionCategory: row.transactionCategory,
            timestamp: row.timestamp,
            source: row.source,
            recordTimestamp: row.recordTimestamp,
            annotation: row.categoryIDs?.split(',') || [], // array of category names
        }));

        // rebuild the OrderedDateTree
        return newOrderedDateTreeFromList(transactions, tx => new Date(tx.timestamp));
    }

    async annotateTransaction(transactionID: string, categoryID: string) {
        const sql = `
            INSERT OR IGNORE INTO transaction2category
            (transactionID, categoryID)
            VALUES (?, ?)
        `;
        await this.execute(sql, [transactionID, categoryID]);
        console.log('Inserted 1 annotation');
    }

    async getCategoryStats() {
        const rows: any[] = await this.db.select(
            `SELECT c.id AS categoryID, c.channel AS channelID, COUNT(t.id) AS transactionCount, SUM(t.amount) AS totalAmount
            FROM categories c
            LEFT JOIN transaction2category tc ON c.id = tc.categoryID
            LEFT JOIN transactions t ON t.id = tc.transactionID
            GROUP BY c.id, c.name`
        );
        return rows;
    }

}
