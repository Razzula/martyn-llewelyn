import { OrderedDateTree } from "./OrderedDateTree";
import { TrueLayerProvider, TrueLayerTransactionCategory, TrueLayerTransactionType } from "./TrueLayer";

export interface BankAccount {
    // unified TrueLayerAccount | TrueLayerCard
    id: string;
    name: string;
    instrumentType: InstrumentType;
    type: BankAccountType;
    number: {
        number: string;
        // TrueLayerAccount
        iban?: string;
        swiftBIC?: string;
        sortCode?: string;
    }
    cardNetwork?: CardNetworkKey; // TrueLayerCard
    provider: {
        id: string;
        // TrueLayerAccount
        name?: string;
        logoURI?: string;
    }

    updateTimestamp: string; // ISO timestamp

    // BAGEL
    users: UserSignature[];
    source: 'TrueLayer' | 'Bagel';

    balance?: BankAccountBalance;
    transactions?: OrderedDateTree<Transaction>;

    last?: { // the true last known balance
        // this essentially ensures the data is stored,
        // but without overwriting the cached data instantly
        balance: BankAccountBalance;
        retrievedAt?: string; // ISO timestamp
    }
    cached?: { // the last value, for display purposes
        balance: BankAccountBalance;
        retrievedAt?: string; // ISO timestamp
    }

    interest?: {
        rate?: number;
        type?: InterestType;
        interval?: number; // months
        lastApplied?: string; // YYYY-MM-DD
    };

    url?: string; // URL to the bank's website or app
}

export enum InstrumentType {
    ACCOUNT = 'ACCOUNT',
    CARD = 'CARD',
    PENSION = 'PENSION',
    GIFTCARD = 'GIFTCARD',
}

export enum BankAccountType {
    NULL = '',
    TRANSACTION = 'TRANSACTION',
    SAVINGS = 'SAVINGS',
    CREDIT = 'CREDIT',
    // CHARGE = 'CHARGE',
}

export enum InterestType {
    FIXED = 'FIXED',
    VARIABLE = 'VARIABLE',
}

export const CardNetwork = {
    VISA: {
        name: 'Visa',
        logo: './Finance/CardNetworks/VisaLogo_Blue.svg',
    },
    MASTERCARD: {
        name: 'Mastercard',
        logo: './Finance/CardNetworks/MastercardLogo.svg',
    },
} as const;

export type CardNetworkKey = keyof typeof CardNetwork;

export interface BankAccountBalance {
    current: number;
    available: number;
    currency: string;
    updateTimestamp: string; // ISO timestamp

    // TrueLayerAccountBalance
    overdraft?: number;
    // TrueLayerCardBalance
    creditLimit?: number;
    lastStatementBalance?: number;
    lastStatementDate?: string; // YYYY-MM-DD
    paymentDue?: number;
    paymentDueDate?: string; // YYYY-MM-DD
}

export interface BankAccountPatch {
    id: string; // this is the ID of the account to patch; not a patch of the ID

    name?: string;
    // type: 'TRANSACTION' | 'SAVINGS' | 'CREDIT' | 'CHARGE' | string; // one day it might be useful to patch the type

    users?: UserSignature[];

    interestRate?: number;
}

export interface User {
    id: string;
    name: string;
    email: string;
    icon: string;
}

export interface UserSignature {
    id: string;
    walletToken?: string;
}

export function generatePatchFromAccount(account: BankAccount, live: BankAccount): BankAccountPatch | null {
    const patch: BankAccountPatch = { id: account.id };

    if (account.name !== live.name) {
        patch.name = account.name;
    }

    // Compare users (by ID and walletToken)
    const usersChanged =
        account.users.length !== live.users.length ||
        account.users.some((u, i) => u.id !== live.users[i]?.id || u.walletToken !== live.users[i]?.walletToken);

    if (usersChanged) {
        patch.users = [
            // do not include walletToken in the patch, for security reasons
            ...account.users.map(u => ({ id: u.id })),
        ]
    }

    // if no fields were added to patch, return null
    return Object.keys(patch).length > 1 ? patch : null;
}

export interface Transaction {
    transactionID: string;
    normalisedProviderTransactionID?: string;
    providerTransactionID?: string;
    timestamp: string; // ISO timestamp
    description: string;
    amount: number;
    currency: string;
    transactionType: TrueLayerTransactionType;
    transactionCategory: TrueLayerTransactionCategory;
    transactionClassification?: string[];
    merchantName?: string;
    meta?: Record<string, unknown>;

    // BAGEL
    accountID?: string; // the BankAccount.id this transaction belongs to
    annotation?: string | string[];
    source: string;
}

export interface Channel {
    id: string;
    name: string;
    isIncome: boolean;
    colour?: string;
};

export interface TransactionCategory {
    id: string;
    name: string;
    icon: string;
    channelID: Channel['id'];
    builtin?: true;
}

export function getAccountLogoSrc(account: BankAccount, providers: Record<string, TrueLayerProvider>) {
    return account.provider.logoURI
        || providers?.[account.provider.id]?.accountLogo
        || providers?.[account.provider.id]?.logo_url
        || './Serenity/unknown.png';
}

export interface CategoryStat {
    categoryID: string;
    channelID: string;
    totalAmount: number;
    transactionCount:  number;
}
