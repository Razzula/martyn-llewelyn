import { createHash } from 'crypto';

import { BankAccount, Transaction } from "src/types/Bagel";
import { toYYYYMMDDFromISO } from "./utils";

export type TransactionNoID =
    Omit<Transaction, 'transactionID'> & {
        transactionID?: string;
    };

/**
 * Fuzzy matcher:
 * Used to detect "probably the same real-world transaction".
 */
export function generateTransactionFingerprint(transaction: Partial<Transaction>, account: Partial<BankAccount>): string | null {
    if (transaction?.accountID !== account.id) {
        console.error('Transaction not linked to provided Account.');
        return null;
    }
    if (account.number === undefined) {
        console.error('Account data insufficient.');
        return null;
    }
    if (
        transaction?.timestamp == undefined
        || transaction?.amount == undefined
    ) {
        console.error('Transaction data insufficient.');
        return null;
    }
    const parts = [
        account.number.accountNumber,
        toYYYYMMDDFromISO(transaction.timestamp),
        transaction.amount.toFixed(2),
        transaction.runningBalance?.toFixed?.(2) ?? 'NIL',
    ];
    return hash(parts.join('|'));
}

/**
 * Stable DB identity seed.
 */
export function generateTransactionID(transaction: Partial<Transaction>, account: Partial<BankAccount>): string | null {
    if (transaction?.accountID !== account.id) {
        console.error('Transaction not linked to provided Account.');
        return null;
    }
    if (account.number === undefined) {
        console.error('Account data insufficient.');
        return null;
    }
    if (
        transaction?.timestamp == undefined
        || transaction?.amount == undefined
    ) {
        console.error('Transaction data insufficient.');
        return null;
    }
    const parts = [
        account.number.accountNumber,
        toYYYYMMDDFromISO(transaction.timestamp),
        transaction.amount.toFixed(2),
        transaction.runningBalance?.toFixed?.(2) ?? 'NIL',
        normaliseDescription(transaction.description),
    ];
    const tempID = parts.join('|');
    return hash(tempID);
}

/**
 * Stable DB identity seed:
 * Used to generate unique IDs *within a day*, using occurence index.
 */
export function generateTransactionIDs(transactions: Partial<Transaction>[], account: Partial<BankAccount>): string[] {
    // XXX: this is terrible
    const idsMap: Record<string, true> = {};
    const ids: string[] = [];
    for (const transaction of transactions) {
        const transactionID = generateTransactionID(transaction, account);
        if (transactionID) {
            let tempID = transactionID;
            let collision = idsMap[tempID];
            let index = 0;
            while (collision) { // XXX naive method
                collision = idsMap[tempID];
                index++;
                tempID = `${transactionID}${tempID}` // XXX this is a terrbible method, should re-hash
            }
            idsMap[tempID] = true;
            ids.push(tempID); // XXX ignores nulls, desyncing arrays
        }
    }
    return ids;
}

function normaliseDescription(desc?: string): string {
    return (desc ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

function hash(input: string): string {
    return createHash('sha256')
        .update(input)
        .digest('hex');
}
