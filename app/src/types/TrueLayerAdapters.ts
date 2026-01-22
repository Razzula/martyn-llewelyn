import { TrueLayerAccount, TrueLayerAccountBalance, TrueLayerAccountTransaction, TrueLayerCard, TrueLayerCardBalance, TrueLayerCardTransaction } from '../types/TrueLayer';
import { BankAccount, BankAccountBalance, CardNetwork, CardNetworkKey, InstrumentType, Transaction } from '../types/Bagel';

export function fromTrueLayerAccount(input: TrueLayerAccount): BankAccount {
    return {
        id: input.account_id,
        name: input.display_name.trim(),
        instrumentType: InstrumentType.ACCOUNT,
        type: input.account_type as BankAccount['type'],
        number: {
            accountNumber: getAccountNumber(input),
            bankNumber: getBankNumber(input),
        },
        provider: {
            id: input.provider.provider_id,
            name: input.provider.display_name,
            logoURI: input.provider.logo_uri,
        },
        nationalCurrency: input.currency,
        updateTimestamp: input.update_timestamp,
        users: [],
        source: 'TrueLayer',

        interest: {
            // currently, TrueLayer doesn't provide interest rate info
            rate: 0, // most Open Banking accounts are current accounts, ergo assume 0%
        },
    };
}

export function fromTrueLayerCard(input: TrueLayerCard): BankAccount {
    return {
        id: input.account_id,
        name: input.display_name.trim(),
        instrumentType: InstrumentType.CARD,
        type: input.card_type as BankAccount['type'],
        number: {
            accountNumber: getCardNumber(input),
        },
        cardNetwork: fromTrueLayerCardNetwork(input.card_network),
        provider: {
            id: input.provider.provider_id,
            name: input.provider.display_name,
            logoURI: input.provider.logo_uri,
        },
        nationalCurrency: input.currency,
        updateTimestamp: input.update_timestamp,
        users: [],
        source: 'TrueLayer',
    };
}

export function fromTrueLayerAccountBalance(input: TrueLayerAccountBalance): BankAccountBalance {
    return {
        current: input.current,
        available: input.available,
        currency: input.currency,
        updateTimestamp: input.update_timestamp,
        overdraft: input.overdraft,
    };
}

export function fromTrueLayerCardBalance(input: TrueLayerCardBalance): BankAccountBalance {
    // cards display inverted amounts
    const current = -input.current;
    const available = -input.available;
    return {
        current: current,
        available: available,
        currency: input.currency,
        updateTimestamp: input.update_timestamp,
        creditLimit: input.credit_limit,
        lastStatementBalance: input.last_statement_balance,
        lastStatementDate: input.last_statement_date,
        paymentDue: input.payment_due,
        paymentDueDate: input.payment_due_date,
    };
}

export function fromTrueLayerAccountTransaction(input: TrueLayerAccountTransaction, accountID?: string): Transaction {
    return {
        // TrueLayer required
        transactionID: input.normalised_provider_transaction_id ?? input.transaction_id,
        timestamp: input.timestamp,
        description: input.description?.trim() ?? '',
        amount: input.amount,
        currency: input.currency,
        transactionType: input.transaction_type,
        transactionCategory: input.transaction_category,
        transactionClassification: input.transaction_classification ?? [],
        // TrueLayer optional
        merchantName: input.merchant_name,
        runningBalance: input.running_balance?.amount,
        meta: input.meta,
        // Bagel
        accountID,
        annotations: input.meta?.bagel_category
            ? [{ categoryID: input.meta.bagel_category, amount: input.amount }]
            : [],
        source: 'TrueLayer',
    };
}

export function fromTrueLayerCardTransaction(input: TrueLayerCardTransaction, accountID?: string): Transaction {
    const amount = -input.amount; // cards display inverted amounts
    return {
        // TrueLayer required
        transactionID: input.normalised_provider_transaction_id ?? input.transaction_id,
        timestamp: input.timestamp,
        description: input.description?.trim() ?? '',
        amount: amount,
        currency: input.currency,
        transactionType: input.transaction_type,
        transactionCategory: input.transaction_category,
        transactionClassification: input.transaction_classification ?? [],
        // TrueLayer optional
        merchantName: input.merchant_name,
        runningBalance: input.running_balance?.amount,
        meta: input.meta,
        // Bagel
        accountID,
        annotations: input.meta?.bagel_category
            ? [{ categoryID: input.meta.bagel_category, amount: input.amount }]
            : [],
        source: 'TrueLayer',
    };
}

export function fromTrueLayerCardNetwork(trueLayerCardNetwork: string): CardNetworkKey | undefined {
    const cardNetworkKey = trueLayerCardNetwork as CardNetworkKey;
    return cardNetworkKey in CardNetwork ? cardNetworkKey : undefined;
}

function getAccountNumber(account: TrueLayerAccount) {
    if (account.currency === 'GBP') {
        // UK
        return account.account_number.number;
    }
    else if (
        account.currency === 'EUR'
        || account.currency === 'CHF'
    ) {
        // EU, CH
        return account.account_number.iban;
    }
    // AU and US not supported yet
    return 'error';
}

function getCardNumber(card: TrueLayerCard) {
    return card.partial_card_number;
}

function getBankNumber(account: TrueLayerAccount) {
    if (account.currency === 'GBP') {
        // UK
        return account.account_number.sort_code;
    }
    else if (
        account.currency === 'EUR'
        || account.currency === 'CHF'
    ) {
        // EU, CH
        return account.account_number.swift_bic;
    }
    // AU and US not supported yet
    return undefined;
}
