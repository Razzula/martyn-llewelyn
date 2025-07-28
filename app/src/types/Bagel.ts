
export interface BankAccount {
    // unified TrueLayerAccount | TrueLayerCard
    id: string;
    name: string;
    type: 'TRANSACTION' | 'SAVINGS' | 'CREDIT' | 'CHARGE' | string;
    number: {
        number: string;
        // TrueLayerAccount
        iban?: string;
        swiftBIC?: string;
        sortCode?: string;
    }
    cardNetwork?: 'VISA' | 'MASTERCARD' | string; // TrueLayerCard
    provider: {
        id: string;
        // TrueLayerAccount
        name?: string;
        logoURI?: string;
    }

    updateTimestamp: string; // ISO timestamp

    // Bagel
    users: UserSignature[];
    source: 'TrueLayer' | 'Bagel';

    balance?: BankAccountBalance;
    lastBalance?: BankAccountBalance;
    lastRetrieve?: string; // ISO timestamp

    interestRate?: number;
}

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

export const emptyBankAccount: BankAccount = {
    id: '',
    name: '',
    type: '',
    number: {
        number: '',
    },
    provider: {
        id: 'Unknown',
    },
    updateTimestamp: '',
    users: [],
    source: 'Bagel',
};
