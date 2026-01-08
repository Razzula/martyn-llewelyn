import { BankAccount, BankAccountType, InstrumentType } from "../types/Bagel";

export const emptyBankAccount: BankAccount = {
    id: '',
    name: '',
    instrumentType: InstrumentType.ACCOUNT,
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
