import { TrueLayerAccount, TrueLayerAccountBalance, TrueLayerCard, TrueLayerCardBalance } from '../types/TrueLayer';
import { BankAccount, BankAccountBalance } from '../types/Bagel';

export function fromTrueLayerAccount(input: TrueLayerAccount): BankAccount {
    return {
        id: input.account_id,
        name: input.display_name,
        type: input.account_type,
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
    };
}

export function fromTrueLayerCard(input: TrueLayerCard): BankAccount {
    return {
        id: input.account_id,
        name: input.display_name,
        type: input.card_type,
        number: {
            number: input.partial_card_number,
        },
        cardNetwork: input.card_network,
        provider: {
            id: input.provider.provider_id,
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
