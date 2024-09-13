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
        // url: 'https://www.natwest.com/savings/first-saver.html',
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
        bank: 'Co-op',
        name: 'Regular Saver',

        type: 'regular saver',
        annualInterestRate: 7,
        compoundRate: 1,
        compoundOffset: 0,

        maxInflow: 250,

        exclusive: true,
        url: 'https://www.co-operativebank.co.uk/products/savings/regular-saver/',
    },
    {
        bank: 'HSBC',
        name: 'Regular Savings',

        type: 'regular saver',
        annualInterestRate: 7,
        compoundRate: 1,
        compoundOffset: 0,

        maxInflow: 250,
        minInflow: 25,

        exclusive: true,
        url: 'https://www.hsbc.co.uk/savings/products/regular-saver/',
    },
    {
        bank: 'Skipton BS',
        name: 'Member Regular Saver Issue 3',

        type: 'regular saver',
        annualInterestRate: 7,
        compoundRate: 1,
        compoundOffset: 0,

        maxInflow: 250,

        exclusive: true,
        url: 'https://www.skipton.co.uk/savings/regular-savers/member-regular-saver',
    },
    {
        bank: 'Nationwide',
        name: 'Flex Regular Saver',

        type: 'regular saver',
        annualInterestRate: 6.5,
        compoundRate: 1,
        compoundOffset: 0,

        maxInflow: 200,

        exclusive: true,
        url: 'https://www.nationwide.co.uk/savings/flex-regular-saver/',
    },
    {
        bank: 'Lloyds',
        name: 'Club Monthly Saver',

        type: 'regular saver',
        annualInterestRate: 6.25,
        compoundRate: 1,
        compoundOffset: 0,

        maxInflow: 200,

        exclusive: true,
        url: 'https://www.lloydsbank.com/savings/club-lloyds-monthly-saver.html',
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
        bank: 'RBS',
        name: 'Digital Regular Saver',

        type: 'regular saver',
        annualInterestRate: 6,
        compoundRate: 1,
        compoundOffset: 0,

        maxInflow: 150,

        exclusive: true,
        url: 'https://www.rbs.co.uk/savings/digital-regular-saver.html',
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
        bank: 'Yorkshire BS',
        name: 'Loyalty Regular Saver',

        type: 'regular saver',
        annualInterestRate: 5.65,
        compoundRate: 1,
        compoundOffset: 0,

        maxInflow: 250,

        exclusive: true,
        url: 'https://www.ybs.co.uk/savings/product?id=YB571825B',
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
    },
    {
        bank: 'Halifax',
        name: 'Monthly Saver',

        type: 'regular saver',
        annualInterestRate: 5.5,
        compoundRate: 1,
        compoundOffset: 0,

        maxInflow: 250,

        exclusive: false,
        url: 'https://www.halifax.co.uk/savings/fixed-term/regular-saver.html',
    },
    {
        bank: 'Lloyds',
        name: 'Monthly Saver',

        type: 'regular saver',
        annualInterestRate: 5.25,
        compoundRate: 1,
        compoundOffset: 0,

        maxInflow: 250,

        exclusive: false,
        url: 'https://www.lloydsbank.com/savings/monthly-saver.html',
    },
    {
        bank: 'Saffron BS',
        name: "12 Month Members' Regular Saver",

        type: 'regular saver',
        annualInterestRate: 5,
        compoundRate: 1,
        compoundOffset: 0,

        maxInflow: 500,

        exclusive: true,
        url: 'https://www.saffronbs.co.uk/savings/regular-savers/12-month-members-regular-saver',
    },
    {
        bank: 'Santander',
        name: 'Regular Saver',

        type: 'regular saver',
        annualInterestRate: 5,
        compoundRate: 1,
        compoundOffset: 0,

        maxInflow: 200,

        exclusive: false,
        url: 'https://www.santander.co.uk/personal/savings-and-investments/savings/regular-saver',
    },
];

export default accounts;
