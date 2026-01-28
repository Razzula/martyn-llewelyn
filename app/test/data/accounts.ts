import { BankAccount, BankAccountType, InstrumentType } from "../../src/types/Bagel";

export const FIRSTDIRECT_ACCOUNT: BankAccount = {
    id: '',
    name: 'My FirstDirect Account',
    instrumentType: InstrumentType.ACCOUNT,
    type: BankAccountType.SAVINGS,
    number: {
        accountNumber: '22222222',
        bankNumber: '11-22-33',
    },
    provider: {
        id: '',
    },
    nationalCurrency: 'GBP',
    updateTimestamp: '',
    users: [],
    source: 'Bagel',
};
export const NATWEST_ACCOUNT: BankAccount = {
    id: '',
    name: 'My Natwest Account',
    instrumentType: InstrumentType.ACCOUNT,
    type: BankAccountType.SAVINGS,
    number: {
        accountNumber: '11111111',
        bankNumber: '11-22-33',
    },
    provider: {
        id: '',
    },
    nationalCurrency: 'GBP',
    updateTimestamp: '',
    users: [],
    source: 'Bagel',
};
export const NATWEST_CARD: BankAccount = {
    id: '',
    name: 'My Natwest Card',
    instrumentType: InstrumentType.CARD,
    type: BankAccountType.CREDIT,
    number: {
        accountNumber: '1234',
    },
    provider: {
        id: '',
    },
    nationalCurrency: 'GBP',
    updateTimestamp: '',
    users: [],
    source: 'Bagel',
};

export const MOCK_ACCOUNTS: BankAccount[] = [
    FIRSTDIRECT_ACCOUNT,
    NATWEST_ACCOUNT,
    NATWEST_CARD,
];
