import { TrueLayerAccount, TrueLayerAccountBalance, TrueLayerAccountTransaction, TrueLayerCard, TrueLayerCardBalance, TrueLayerCardTransaction } from '../types/TrueLayer';
import { BankAccount, BankAccountBalance, Transaction } from '../types/Bagel';

export function fromTrueLayerAccount(input: TrueLayerAccount): BankAccount {
    return {
        id: input.account_id,
        name: input.display_name.trim(),
        type: input.account_type as BankAccount['type'],
        number: {
            number: input.account_number.number,
            iban: input.account_number.iban,
            swiftBIC: input.account_number.swift_bic,
            sortCode: input.account_number.sort_code,
        },
        provider: {
            id: input.provider.provider_id,
            name: input.provider.display_name,
            logoURI: input.provider.logo_uri,
        },
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
        type: input.card_type as BankAccount['type'],
        number: {
            number: input.partial_card_number,
        },
        cardNetwork: input.card_network,
        provider: {
            id: input.provider.provider_id,
            name: input.provider.display_name,
            logoURI: input.provider.logo_uri,
        },
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
    return {
        current: input.current,
        available: input.available,
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
        transactionID: input.transaction_id,
        normalisedProviderTransactionID: input.normalised_provider_transaction_id,
        providerTransactionID: input.provider_transaction_id,
        timestamp: input.timestamp,
        description: input.description?.trim() ?? '',
        amount: input.amount,
        currency: input.currency,
        transactionType: input.transaction_type,
        transactionCategory: input.transaction_category,
        transactionClassification: input.transaction_classification ?? [],
        merchantName: input.merchant_name,
        meta: input.meta,

        accountID,
    };
}

export function fromTrueLayerCardTransaction(input: TrueLayerCardTransaction, accountID?: string): Transaction {
    return {
        transactionID: input.transaction_id,
        normalisedProviderTransactionID: input.normalised_provider_transaction_id,
        providerTransactionID: input.provider_transaction_id,
        timestamp: input.timestamp,
        description: input.description?.trim() ?? '',
        amount: input.amount,
        currency: input.currency,
        transactionType: input.transaction_type,
        transactionCategory: input.transaction_category,
        transactionClassification: input.transaction_classification ?? [],
        merchantName: input.merchant_name,
        meta: input.meta,

        accountID,
    };
}
