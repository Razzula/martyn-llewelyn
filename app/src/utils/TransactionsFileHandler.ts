import Papa from 'papaparse';

import { BankAccount, InstrumentType, Transaction } from "../types/Bagel";
import { hasValue, isEmptyString, isString, parseDateStringToISO } from './utils';
import { asSortCode, getCurrencyFromSymbol, parseFinancialToNumeric } from './finance';
import { getCategoryfromMidataType, getTypefromMidataType } from '../types/MidataAdapter';
import { TrueLayerTransactionCategory } from '../types/TrueLayer';

const KNOWN_EXPORT_HEADERS: Record<string, Record<string, string>> = {
    'MIDATA': {
        Date: 'timestamp',
        Type: 'transactionCategory',
        'Merchant/Description': 'description',
        'Debit/Credit': 'amount',
        Balance: 'runningBalance',
    },
    'MIDATA(2)': {
        // XXX this is hacky
        Type: 'transactionType',
    },
    'FIRST DIRECT (JSON)': {
        date: 'timestamp',
        description: 'description',
        amount: 'amount',
        balance: 'runningBalance'
    },
    'FIRST DIRECT (CSV)': {
        Date: 'timestamp',
        Description: 'description',
        Amount: 'amount',
        Balance: 'runningBalance'
    },
    'NATWEST (CSV)': {
        Date: 'timestamp',
        Type: 'transactionCategory',
        // Type: 'transactionType',
        Description: 'description',
        Value: 'amount',
        Balance: 'runningBalance',
        "Account Name": 'accountName',
        "Account Number": 'accountNumber',
    },
    'KINGDOM BANK (MANUAL as CSV)': {
        Date: 'timestamp',
        Type: 'transactionCategory',
        // Type: 'transactionType',
        Credit: 'amount',
        Debit: 'amount',
        Balance: 'runningBalance',
    },
    'CAHOOT (TXT)': {
        // From: ,
        Account: 'accountNumber',
        Date: 'timestamp',
        Description: 'description',
        Amount: 'amount',
        Balance: 'runningBalance'
    },
}

/**
 * Automatically generated from `KNOWN_EXPORT_HEADERS`
 */
const HEADERS: Record<string, {
    sourceField: string;
    sources: string[]; // for debugging
}[]> = (() => {
    const result: Record<string, { sourceField: string; sources: string[] }[]> = {};

    for (const [source, mapping] of Object.entries(KNOWN_EXPORT_HEADERS)) {
        for (const [fileField, txField] of Object.entries(mapping)) {
            if (!txField) {
                continue;
            }
            if (!result[txField]) {
                result[txField] = [];
            }

            const existing = result[txField].find(e => e.sourceField === fileField);
            if (existing) {
                existing.sources.push(source);
            }
            else {
                result[txField].push({ sourceField: fileField, sources: [source] });
            }
        }
    }

    return result;
})();
console.debug(HEADERS);

interface ProcessedFile {
    account: Partial<BankAccount>,
    transactions: Partial<Transaction>[],
}

class TransactionsFileHandler {

    /**
     * Generate BankAccount and Transactions data from raw CSV input
     * @param input raw CSV input string
     * @returns ProcessedFile
     */
    public static parseFromCSV(input: string): ProcessedFile {
        const processedFile: ProcessedFile = {
            account: {},
            transactions: [],
        };
        try {
            const { data } = Papa.parse<Record<string, string>>(input, {
                header: true,
                skipEmptyLines: true,
            });
            processedFile.transactions = this.transactionsFromObjects(data);
            processedFile.account = this.accountFromObjects(data);
        }
        catch (err) {
            console.error('Cannot parse CSV:', err);
        }
        return processedFile;
    }

    /**
     * Generate BankAccount and Transactions data from raw JSON input
     * @param input raw JSON input string
     * @returns ProcessedFile
     */
    public static parseFromJSON(input: string): ProcessedFile {
        const processedFile: ProcessedFile = {
            account: {},
            transactions: [],
        };
        try {
            const formatted = JSON.parse(input);
            if (Array.isArray(formatted)) {
                processedFile.transactions = this.transactionsFromObjects(formatted);
                processedFile.account = this.accountFromObjects(formatted);
            }
        }
        catch (err) {
            console.error('Cannot parse JSON:', err);
        }
        return processedFile;
    }

    /**
     * Generate BankAccount and Transactions data from raw TXT input
     * @param input raw TXT input string
     * @returns ProcessedFile
     */
    public static parseFromTXT(input: string): ProcessedFile {
        const processedFile: ProcessedFile = {
            account: {},
            transactions: [],
        };
        try {
            const normalised = input
                .replace(/\r\n/g, '\n')
                .replace(/\uFFFD/g, '') // � replacement chars
            const blocks = normalised.split(/\n\s*\n+/);
            const objects: Record<string, string>[] = [];
            for (const block of blocks) {
                const object: Record<string, string> = {};
                for (const line of block.split('\n')) {
                    const match = /^([^:]+):\s*(.+)$/.exec(line.trim());
                    if (!match) {
                        continue;
                    }
                    const [, key, value] = match;
                    object[key.trim()] = value.trim();
                }
                objects.push(object);
            }
            processedFile.transactions = this.transactionsFromObjects(objects);
            processedFile.account = this.accountFromObjects(objects);
        }
        catch (err) {
            console.error('Cannot parse plaintext:', err);
        }
        return processedFile;
    }

    /**
     * Generate BankAccount and Transactions data from raw PDF input
     * @param input raw PDF input string
     * @returns ProcessedFile
     */
    public static parseFromPDF(_input: string): ProcessedFile {
        const processedFile: ProcessedFile = {
            account: {},
            transactions: [],
        };
        console.error('parseFromPDF not yet implemented...');
        // processedFile.transactions = this.transactionsFromObjects(input);
        // processedFile.account = this.accountFromObjects(input);
        return processedFile;
    }

    /**
     * Extract all possible account information from transactions file
     * @param input formatted transactions file
     * @returns BankAccount
     */
    public static accountFromObjects(inputs: Record<string, string | number>[]): Partial<BankAccount> {
        // console.log(input);
        const account: Partial<BankAccount> = {};

        for (const input of inputs) {
            // format data
            // # ESSENTIAL FIELDS
            // ## account name
            if (HEADERS?.accountName) {
                for (const header of HEADERS.accountName) {
                    const data = input?.[header.sourceField];
                    if (hasValue(data)) {
                        if (
                            !isEmptyString(account.name)
                            && account.name !== String(data)
                        ) {
                            console.warn('Conflicting Account Names found. Defaulting to', data);
                        }
                        account.name = String(data);
                        break;
                    }
                }
            }
            // ## account number
            if (HEADERS?.accountNumber) {
                for (const header of HEADERS.accountNumber) {
                    const data = input?.[header.sourceField];
                    if (hasValue(data)) {
                        const accountNumber: Partial<BankAccount['number']> = {};
                        if (isString(data)) {
                            // SRTCOD-ACNUMBER
                            const match = /^(\d{6})-(\d{8})$/.exec(data);
                            if (match) {
                                accountNumber.bankNumber = asSortCode(match[1]);
                                accountNumber.accountNumber = match[2];
                            }
                            else {
                                // **** dddd
                                const match = /[\*Xx]{4}\s+(\d{4})/.exec(data);
                                if (match) {
                                    const formatted = match[1].replace(/[\*Xx]/g, '*');
                                    accountNumber.accountNumber = formatted;
                                }
                                else {
                                    // *...*CARD
                                    const match = /^\d*\**(\d{4})$/.exec(data);
                                    if (match) {
                                        accountNumber.accountNumber = match[1];
                                        account.instrumentType = InstrumentType.CARD;
                                    }
                                    else {
                                        accountNumber.accountNumber = data;
                                    }
                                }
                            }
                        }

                        if (
                            !isEmptyString(account.number?.accountNumber)
                            && account.number?.accountNumber !== accountNumber.accountNumber
                        ) {
                            console.warn('Conflicting Account Number found. Defaulting to', data);
                        }
                        if (
                            !isEmptyString(account.number?.bankNumber)
                            && account.number?.bankNumber !== accountNumber.bankNumber
                        ) {
                            console.warn('Conflicting Bank Number found. Defaulting to', data);
                        }

                        if (accountNumber.accountNumber) {
                            account.number = {
                                ...account.number,
                                accountNumber: accountNumber.accountNumber,
                                ...(accountNumber.bankNumber
                                    ? { bankNumber: accountNumber.bankNumber }
                                    : {}),
                            };
                        }
                        break;
                    }
                }
            }
        }

        return account;
    }

    /**
     * Extract all possible transactions from transactions file
     * @param input formatted transactions file
     * @returns Transaction array
     */
    public static transactionsFromObjects(inputs: Record<string, string | number>[]): Transaction[] {
        // console.log(inputs);
        const transactions: Transaction[] = [];

        let seenCurrency: string | null = null;

        for (const input of inputs) {
            const transaction: Partial<Transaction> = {};
            // handle special quirks
            // # MIDATA
            // ## Midata exports have extra row
            const date = input?.Date;
            if (date === 'Arranged overdraft limit') {
                // Midata includes "Arranged overdraft limit" row
                continue;
            }

            // format data
            // # ESSENTIAL FIELDS
            // ## transactionID
            transaction.transactionID = 'TODO';
            // ## timestamp
            if (HEADERS?.timestamp) {
                for (const header of HEADERS.timestamp) {
                    const data = input?.[header.sourceField];
                    if (data && isString(data)) {
                        const date = parseDateStringToISO(data);
                        if (date) {
                            transaction.timestamp = date;
                        }
                        break;
                    }
                }
            }
            // ## description
            if (HEADERS?.description) {
                for (const header of HEADERS.description) {
                    const data = input?.[header.sourceField];
                    if (hasValue(data)) {
                        transaction.description = String(data);
                        break;
                    }
                }
            }
            // ## amount
            if (HEADERS?.amount) {
                for (const header of HEADERS.amount) {
                    const data = input?.[header.sourceField];
                    if (hasValue(data)) {
                        const amount = parseFinancialToNumeric(String(data));
                        // amount
                        if (!Number.isNaN(amount.value)) {
                            if (header.sourceField.toLowerCase() === 'debit') {
                                // ensure value is negative
                                amount.value = -1 * Math.abs(amount.value);
                            }
                            else if (header.sourceField.toLowerCase() === 'credit') {
                                // ensure value is positive
                                amount.value = Math.abs(amount.value);
                            }
                            transaction.amount = amount.value;
                        }
                        // currency
                        if (amount.currencySymbol) {
                            const data = amount.currencySymbol;
                            if (data && seenCurrency) {
                                if (data !== seenCurrency) {
                                    console.error('Parser found conflicting currencies. Defaulting to ', data);
                                }
                            }
                            seenCurrency = data;
                        }
                        break;
                    }
                }
            }
            // ## transactionType
            if (HEADERS?.transactionType) {
                for (const header of HEADERS.transactionType) {
                    const data = input?.[header.sourceField];
                    if (data && isString(data)) {
                        transaction.transactionType = getTypefromMidataType(data);
                        break;
                    }
                }
            }
            // ## transactionCategory
            if (HEADERS?.transactionCategory) {
                for (const header of HEADERS.transactionCategory) {
                    const data = input?.[header.sourceField];
                    if (data && isString(data)) {
                        transaction.transactionCategory = getCategoryfromMidataType(data);
                        break;
                    }
                }
            }

            // # NON-ESSENTIAL FIELDS
            // ## runningBalance
            if (HEADERS?.runningBalance) {
                for (const header of HEADERS.runningBalance) {
                    const data = input?.[header.sourceField];
                    if (hasValue(data)) {
                        const balance = parseFinancialToNumeric(String(data));
                        // amount
                        if (!Number.isNaN(balance.value)) {
                            transaction.runningBalance = balance.value;
                        }
                        // currency
                        if (balance.currencySymbol) {
                            const data = balance.currencySymbol;
                            if (data && seenCurrency) {
                                if (data !== seenCurrency) {
                                    console.error('Parser found conflicting currencies. Defaulting to ', data);
                                }
                            }
                            seenCurrency = data;
                        }
                        break;
                    }
                }
            }

            // # ESSENTIAL (but need to be last)
            // ## currency
            if (HEADERS?.currency) {
                for (const header of HEADERS.currency) {
                    const data = input?.[header.sourceField];
                    if (data && isString(data) && !isEmptyString(data)) {
                        if (seenCurrency && data !== seenCurrency) {
                            console.error('Parser found conflicting currencies. Defaulting to ', data);
                        }
                        seenCurrency = data;
                    }
                    break;
                }
            }
            if (seenCurrency) {
                const data = getCurrencyFromSymbol(seenCurrency);
                if (data) {
                    // use Transactions data
                    transaction.currency = data;
                }
                else {
                    // TODO use account information
                }
            }
            else {
                transaction.currency = 'UNKNOWN';
            }

            // TODO validate validity as a full Transaction
            if (!hasValue(transaction?.amount)) {
                // console.warn(input, transaction);
                continue;
            }
            if (isEmptyString(transaction?.description)) {
                transaction.description = 'No description';
            }
            if (isEmptyString(transaction?.currency)) {
                transaction.currency = 'UNKNOWN';
            }
            if (isEmptyString(transaction?.transactionType)) {
                transaction.transactionType = 'UNKNOWN';
            }
            if (isEmptyString(transaction?.transactionCategory)) {
                transaction.transactionCategory = TrueLayerTransactionCategory.UNKNOWN;
            }
            transactions.push(transaction as Transaction);
        }

        // TODO handle case where seenCurrency first set after some values

        return transactions;
    }

}

export default TransactionsFileHandler;
