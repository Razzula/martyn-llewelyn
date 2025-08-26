import { BankAccount, BankAccountType } from "../types/Bagel";

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
