import { Account } from './App';

export const accounts: Account[] = [
    {
        name: 'Natwest First Saver',
        type: 'savings',
        initialDeposit: 1000,
        annualInterestRate: 2.67,
        compoundRate: 3,
        compoundOffset: -1,
        state: 'owned'
    },
    {
        name: 'Natwest Digital Regular Saver',
        type: 'regular saver',
        initialDeposit: 0,
        annualInterestRate: 6,
        compoundRate: 1,
        compoundOffset: 0,
        state: 'owned',
        maxInflow: 150
    },
    {
        name: 'Test',
        type: 'regular saver',
        initialDeposit: 0,
        annualInterestRate: 5,
        compoundRate: 1,
        compoundOffset: 0,
        maxInflow: 150
    },
];

export default accounts;
