
export interface BankAccount {
    // unified TrueLayerAccount | TrueLayerCard
    id: string;
    name: string;
    type: BankAccountType;
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

export enum BankAccountType {
    NULL = '',
    TRANSACTION = 'TRANSACTION',
    SAVINGS = 'SAVINGS',
    CREDIT = 'CREDIT',
    // CHARGE = 'CHARGE',
}

export const CardNetwork = {
    VISA: {
        name: 'Visa',
        logo: '/CardNetworks/VisaLogo_Blue.svg',
    },
    MASTERCARD: {
        name: 'Mastercard',
        logo: '/CardNetworks/MastercardLogo.svg',
    },
} as const;

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
    type: BankAccountType.NULL,
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

export function generatePatchFromAccount(account: BankAccount, live: BankAccount): BankAccountPatch | null {
    const patch: BankAccountPatch = { id: account.id };

    if (account.name !== live.name) {
        patch.name = account.name;
    }

    if (account.interestRate !== live.interestRate) {
        patch.interestRate = account.interestRate;
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
