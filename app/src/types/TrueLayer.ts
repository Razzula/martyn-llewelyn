export type TrueLayerAccount = {
    update_timestamp: string;
    account_id: string;
    account_type: 'TRANSACTION' | 'SAVINGS' | string;
    display_name: string;
    currency: string;
    account_number: {
        iban: string;
        swift_bic: string;
        number: string;
        sort_code: string;
    };
    provider: {
        display_name: string;
        provider_id: string;
        logo_uri: string;
    };
};

export type TrueLayerAccountBalance = {
    currency: string;
    available: number;
    current: number;
    overdraft: number;
    update_timestamp: string;
}

export type TrueLayerAccountTransaction = {
    transaction_id: string;
    normalised_provider_transaction_id?: string;
    provider_transaction_id?: string;
    timestamp: string; // ISO timestamp
    description: string;
    amount: number;
    currency: string;
    transaction_type: TrueLayerTransactionType;
    transaction_category: TrueLayerTransactionCategory;
    transaction_classification: string[];
    merchant_name?: string;
    running_balance?: TrueLayerAccountBalance;
    meta?: Record<string, unknown>;
};

export type TrueLayerCard = {
    account_id: string;
    card_network: 'VISA' | 'MASTERCARD' | string;
    card_type: 'CREDIT' | 'CHARGE' | string;
    currency: string;
    display_name: string;
    name_on_card: string;
    partial_card_number: string;
    provider: {
        provider_id: string;
        display_name: string;
        logo_uri: string;
    };
    valid_from?: string; // YYYY-MM
    valid_to?: string;   // YYYY-MM
    update_timestamp: string; // ISO timestamp
};

export type TrueLayerCardBalance = {
    available: number;
    currency: string;
    current: number;
    credit_limit: number;
    last_statement_balance: number;
    last_statement_date: string; // YYYY-MM-DD
    payment_due: number;
    payment_due_date: string; // YYYY-MM-DD
    update_timestamp: string; // ISO timestamp
};

export type TrueLayerCardTransaction = {
    transaction_id: string;
    normalised_provider_transaction_id?: string;
    provider_transaction_id?: string;
    timestamp: string; // ISO timestamp
    description: string;
    amount: number;
    currency: string;
    transaction_type: TrueLayerTransactionType;
    transaction_category: TrueLayerTransactionCategory;
    transaction_classification: string[];
    merchant_name?: string;
    running_balance?: TrueLayerCardTransactionRunningBalance;
    meta?: Record<string, unknown>;
};

export interface TrueLayerProvider {
    provider_id: string;
    display_name: string;
    country: string;
    logo_url: string;
    scopes: string[];
    availability: {
        recommended_status: string;
        updated_at: string; // ISO timestamp
    };
    steps?: Array<{
        title: string;
        fields: Array<{
            type: string; // e.g. "SingleChoiceField"
            values: Array<{
                value: string;
                display_name: string;
            }>;
            id: string;
            display_name: string;
            help_text: string;
            mandatory: boolean;
        }>;
    }>;

    // BAGEL
    accountLogo?: string;
}

export type TrueLayerCardTransactionRunningBalance = {
    amount: number;
    currency: string;
};

export type TrueLayerTransactionType = 'DEBIT' | 'CREDIT' | string;

export enum TrueLayerTransactionCategory {
    ATM = 'ATM',
    BILL_PAYMENT = 'BILL_PAYMENT',
    CASH = 'CASH',
    CASHBACK = 'CASHBACK',
    CHEQUE = 'CHEQUE',
    CORRECTION = 'CORRECTION',
    CREDIT = 'CREDIT',
    DIRECT_DEBIT = 'DIRECT_DEBIT',
    DIVIDEND = 'DIVIDEND',
    FEE_CHARGE = 'FEE_CHARGE',
    INTEREST = 'INTEREST',
    OTHER = 'OTHER',
    PURCHASE = 'PURCHASE',
    STANDING_ORDER = 'STANDING_ORDER',
    TRANSFER = 'TRANSFER',
    DEBIT = 'DEBIT',
    UNKNOWN = 'UNKNOWN',
}

