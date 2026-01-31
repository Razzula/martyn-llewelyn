import { compare } from 'semver-ts';
import Database, { QueryResult } from '@tauri-apps/plugin-sql';
import { appDataDir } from '@tauri-apps/api/path';

import { defaultChannels, defaultExpenditures, defaultIncomes } from '../data/categories.js';
import { Channel, Transaction, TransactionAnnotation, TransactionCategory } from '../types/Bagel.js';
import { newOrderedDateTreeFromList, OrderedDateTree } from '../types/OrderedDateTree.js';
import { toYYYYMMDDFromDate } from './utils.js';
import { TrueLayerTransactionCategory } from '../types/TrueLayer.js';

import { getSQL, SCHEMA_VERSION } from '../sql/SQLRegistry.js';

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

        const liveSchemaVersion = await this.getSchemaVersion();
        console.log(`Live schema version: ${liveSchemaVersion}`);
        if (liveSchemaVersion === null) {
            // dummy
            await this.executeScript('init_test');

            // initialise meta
            await this.executeScript('init__schema');
            await this.executeScript('init__schemaGuard');
            // initialise tables
            await this.executeScript('init_accounts');
            await this.executeScript('init_transactions');
            await this.executeScript('init_channels');
            await this.executeScript('init_categories');
            await this.executeScript('init_transaction2category');
            await this.executeScript('init_transactionGroups');
            // initialise indexes
            // TODO

            // default channels/categories
            await this.insertDefaults()

            await this.writeSchemaVersion(SCHEMA_VERSION);
            console.log(`Database initialised (${path})`);
        }
        else if (liveSchemaVersion !== SCHEMA_VERSION) {
            // TODO: migration updates
            await this.update(liveSchemaVersion);
            await this.writeSchemaVersion(SCHEMA_VERSION);
            console.log(`Database updated (${path})`);
        }
        console.log(`Database connected (${path})`);
        this.initialised = true;
    }

    /**
     * Migrate a database initialised from an older version of the schema.
     */
    private async update(liveSchemaVersion: string) {
        if (compare(liveSchemaVersion, '0.0.2') < 0) {
            // TODO: currently nothing to migrate
        }
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
        catch (err) {
            console.error(script, err);
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

    async getSchemaVersion(): Promise<string | null> {
        try {
            const rows: unknown[] = await this.db.select('SELECT * FROM _schema');
            if (rows.length === 0) {
                return null;
            }
            const row: any = rows[0];
            return row.version;
        }
        catch (err) {
            console.error('Error checking schema version:', err);
            return null;
        }
    }

    async writeSchemaVersion(version: string) {
        await this.db.execute(`
            INSERT INTO _schema(version)
            VALUES (?)
            ON CONFLICT(rowid) DO UPDATE SET version = excluded.version;
        `, [version]);
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
            (id, accountID, amount, currency, description, transactionType, transactionCategory, timestamp, runningBalance, source, recordTimestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                            tx.runningBalance ?? null,
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
        // XXX: this is bit hacky, but since `to` will always be time 00:00:00, we use the next day as the bound
        const toUpperBound = new Date(to);
        toUpperBound.setDate(toUpperBound.getDate() + 1); // move to next day
        const toUpper = toYYYYMMDDFromDate(toUpperBound);

        const rows: any[] = await this.db.select(
            `SELECT t.*, 
                GROUP_CONCAT(c.id) AS categoryIDs,
                GROUP_CONCAT(t2c.amount) AS categoryAmounts,
                g.id AS groupID
            FROM transactions t
            LEFT JOIN transaction2category t2c
                ON t.id = t2c.transactionID
            LEFT JOIN categories c
                ON t2c.categoryID = c.id
            LEFT JOIN transactionGroups g 
                ON t.id = g.transactionA OR t.id = g.transactionB
            WHERE t.timestamp >= ? AND t.timestamp <= ?
            GROUP BY t.id`,
            [from, toUpper]
        );

        // map DB rows to Transaction objects
        const transactions: Transaction[] = [];
        const transactionGroups: Record<string, Transaction> = {};
        rows.forEach(row => {
            const transactionAmount: number = row.amount;
            // HANDLE MICRO SPLITS
            const categoryIDs: string[] = row.categoryIDs ? row.categoryIDs.split(',') : [];
            const categoryAmounts: string[] = row.categoryAmounts ? row.categoryAmounts.split(',') : [];
            const annotations: TransactionAnnotation[] =
                categoryIDs.length > 0
                    ? categoryIDs.map((id, i) => ({
                        categoryID: id,
                        amount: categoryAmounts[i] ? Number(categoryAmounts[i]) : transactionAmount,
                    }))
                    : [];
            // HANDLE TRANSACTION
            const transaction: Transaction = {
                transactionID: row.id,
                accountID: row.accountID,
                amount: row.amount,
                currency: row.currency,
                description: row.description,
                transactionType: row.transactionType,
                transactionCategory: row.transactionCategory,
                timestamp: row.timestamp,
                runningBalance: row.runningBalance,
                source: row.source,
                // recordTimestamp: row.recordTimestamp,
                annotations: annotations,
            };
            // HANDLE MACRO GROUPS
            const txGroupID: string | null = row.groupID || null;
            if (txGroupID) {
                // handle group
                if (!transactionGroups[txGroupID]) {
                    const transactionGroup: Transaction = {
                        transactionID: txGroupID,
                        amount: 0,
                        timestamp: transaction.timestamp,
                        runningBalance: row.runningBalance,
                        source: 'GROUP',
                        children: [transaction],
                        // XXX: dummy values
                        description: '',
                        currency: '',
                        transactionType: 'TRANSFER',
                        transactionCategory: TrueLayerTransactionCategory.TRANSFER
                    };
                    transactionGroups[txGroupID] = transactionGroup;
                }
                else {
                    transactionGroups[txGroupID].children!.push(transaction);
                }
            }
            else {
                // insert normal transaction
                transactions.push(transaction);
            }
        });
        // insert grouped transactions
        Object.values(transactionGroups).forEach(group => {
            if (group.children) {
                if (group.children?.length === 2) {
                    transactions.push(group);
                }
                else {
                    // insufficient children
                    // just insert the children as normal transaction
                    group.children.forEach(child => transactions.push(child));
                }
            }
            else {
                // group is empty, should not happen
                // return;
            }
        });

        // rebuild the OrderedDateTree
        return newOrderedDateTreeFromList(transactions, tx => new Date(tx.timestamp));
    }

    async createTransactionAnnotation(transactionID: string, annotation: TransactionAnnotation) {
        const sql = `
            INSERT OR IGNORE INTO transaction2category
            (transactionID, categoryID, amount)
            VALUES (?, ?, ?)
        `;
        await this.execute(sql, [transactionID, annotation.categoryID, annotation.amount]);
        console.log('Inserted 1 annotation');
    }

    async updateTransactionAnnotation(transactionID: string, categoryID: string, newAnnotation: TransactionAnnotation) {
        const sql = `
            UPDATE transaction2category
            SET categoryID = ?, 
                amount = ?
            WHERE transactionID = ? AND categoryID = ?;
        `;
        await this.execute(sql, [
            newAnnotation.categoryID, newAnnotation.amount,
            transactionID, categoryID
        ]);
        console.log('Updated 1 annotation');
    }

    async clearTransactionAnnotations(transactionID: string) {
        const sql = `
            DELETE FROM transaction2category
            WHERE transactionID = ?;
        `;
        await this.execute(sql, [transactionID]);
        console.log('Cleared annotations for transaction', transactionID);
    }

    async getCategoryStats() {
        const rows: any[] = await this.db.select(
            `SELECT
                c.id AS categoryID,
                c.channel AS channelID,
                COUNT(t.id) AS transactionCount,
                SUM(t2c.amount) AS totalAmount
            FROM categories c
            LEFT JOIN transaction2category t2c
                ON c.id = t2c.categoryID
            LEFT JOIN transactions t
                ON t.id = t2c.transactionID
            GROUP BY c.id, c.name`
        );
        return rows;
    }

}
