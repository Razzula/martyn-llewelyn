import { BankAccount, InstrumentType } from "../types/Bagel";
import { isEmptyString, isFutureDate } from "./utils";

export function validateAccount(
    account: BankAccount,
    existingAccounts?: Record<string, BankAccount> | null,
): Record<string, boolean> {
    const errors: Record<string, boolean> = {};

    const { users, name, instrumentType, type, number, cardNetwork, interest, id } = account;

    const isAccount = instrumentType === InstrumentType.ACCOUNT;
    const isBankCard = instrumentType === InstrumentType.CARD;
    const isCard = isBankCard || instrumentType === InstrumentType.GIFTCARD;

    // BASIC VALIDATION
    errors.invalidUsers = !users?.length;
    errors.invalidName = isEmptyString(name);
    errors.invalidInstrumentType = isEmptyString(instrumentType);
    errors.invalidType = isEmptyString(type);

    // ACCOUNT DETAILS
    errors.invalidNumber = (
        isEmptyString(number?.number)
        // unique
        || (existingAccounts && Object.values(existingAccounts).some(acc =>
            acc.id !== id
            && acc.number?.number === number?.number
        ))
        // format
        || (isBankCard ?
            !/^\d{4}$/.test(number?.number || '')
            : !/^\d{8,10}$/.test(number?.number || '')
        )
    );
    errors.invalidSortCode = !isCard && (
        isEmptyString(number?.sortCode)
        // format
        || (isAccount &&
            !/^\d{2}-\d{2}-\d{2}$/.test(number?.sortCode || '')
        )
    );

    // CARD DETAILS
    errors.invalidCardNetwork = isBankCard && isEmptyString(cardNetwork);

    // INTEREST
    errors.invalidInterestRate = (
        // if not empty, must be a number between 0 and 100
        interest?.rate == null || isNaN(interest?.rate)
        || interest?.rate < 0 || interest?.rate > 100
    );
    errors.invalidInterestType = isEmptyString(interest?.type);
    errors.invalidInterestInterval = (
        interest?.interval === null
        || interest?.interval === undefined
        || isNaN(interest?.interval)
        || interest?.interval < 0
    );
    errors.invalidInterestDate = isFutureDate(interest?.lastApplied);

    errors.invalidInterest = isAccount && (
        errors.invalidInterestRate
        || (!errors.invalidInterestRate && (interest?.rate !== undefined && interest?.rate > 0)
            // only validate if we care about interest
            && (errors.invalidInterestType || errors.invalidInterestInterval || errors.invalidInterestDate)
        )
    );

    // FORM
    errors.invalidForm = (
        errors.invalidUsers ||
        errors.invalidName ||
        errors.invalidInstrumentType ||
        errors.invalidType ||
        errors.invalidNumber ||
        errors.invalidSortCode ||
        errors.invalidCardNetwork ||
        errors.invalidInterest // only the top-level interest validity, not subfields
    );

    return errors;
}

export function getAccountBalance(account: BankAccount) {
    // TODO cards are negative, others are positive; this needs to be done pre-db
    const isCard = account.cardNetwork !== undefined;
    const current = account.balance?.current ?? 0;
    const available = account.balance?.available ?? 0;
    const balance = isCard ? current : available;
    return balance;
}
