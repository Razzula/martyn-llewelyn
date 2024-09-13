export interface Account {
    bank: string;
    name: string;

    type: string;
    annualInterestRate: number;
    compoundRate: number;
    compoundOffset: number;

    exclusive: boolean;
    state?: string;

    minInflow?: number;
    maxInflow?: number;

    url?: string;
}

export const accounts: Account[] = [
    {
        bank: 'Natwest',
        name: 'First Saver',

        type: 'savings',
        annualInterestRate: 2.67,
        compoundRate: 3,
        compoundOffset: -1, // first payment on OCT not SEP

        exclusive: false,
        state: 'owned',
        url: 'https://www.natwest.com/savings/first-saver.html',
    },
    {
        bank: 'First Direct',
        name: 'Regular Saver',

        type: 'regular saver',
        annualInterestRate: 7,
        compoundRate: 1,
        compoundOffset: 0,

        maxInflow: 300,
        minInflow: 25,

        exclusive: true,
        url: 'https://www.firstdirect.com/savings-and-investments/savings/regular-saver-account/',
    },
    {
        bank: 'Natwest',
        name: 'Digital Regular Saver',

        type: 'regular saver',
        annualInterestRate: 6,
        compoundRate: 1,
        compoundOffset: 0,

        maxInflow: 150,

        exclusive: true,
        state: 'owned',
        url: 'https://www.natwest.com/savings/digital-regular-saver.html',
    },
    {
        bank: 'TSB',
        name: 'Monthly Saver',

        type: 'regular saver',
        annualInterestRate: 6,
        compoundRate: 1,
        compoundOffset: 0,
        maxInflow: 250,

        exclusive: false,
        url: 'https://www.tsb.co.uk/savings/monthly-saver.html',
    },
    {
        bank: 'Bank of Scotland',
        name: 'Monthly Saver',

        type: 'regular saver',
        annualInterestRate: 5.5,
        compoundRate: 1,
        compoundOffset: 0,
        maxInflow: 250,

        exclusive: false,
        url: 'https://www.bankofscotland.co.uk/savings/accounts/monthly-saver.html',
    }
];

export default accounts;
