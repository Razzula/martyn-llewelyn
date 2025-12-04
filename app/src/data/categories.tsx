import { Channel, TransactionCategory } from '../types/Bagel';

import Rent from '../assets/icons/Home.svg?react';
import Utilities from '../assets/icons/ElectricalServices.svg?react';
import Groceries from '../assets/icons/Groceries.svg?react';
import HealthWellbeing from '../assets/icons/HealthWellbeing.svg?react';
import Work from '../assets/icons/Work.svg?react';
import Education from '../assets/icons/School.svg?react';
import Transport from '../assets/icons/Commute.svg?react';
import MobilePhone from '../assets/icons/SIMCard.svg?react';
import Dining from '../assets/icons/Dining.svg?react';
import Wedding from '../assets/icons/Diamond.svg?react';
import Subscriptions from '../assets/icons/Subscriptions.svg?react';
import Holiday from '../assets/icons/FlightDeparture.svg?react';
import Miscellaneous from '../assets/icons/Category.svg?react';
import Gifts from '../assets/icons/Gift.svg?react';
import Charity from '../assets/icons/SoupKitchen.svg?react';
import Tithe from '../assets/icons/Church.svg?react';
import Savings from '../assets/icons/Savings.svg?react';
import Stocks from '../assets/icons/Stocks.svg?react';
import MoneyBag from '../assets/icons/MoneyBag.svg?react';
import Bank from '../assets/icons/Bank.svg?react';

export const icons: Record<string, JSX.Element> = {
    rent: <Rent />,
    utilities: <Utilities />,
    groceries: <Groceries />,
    healthwellbeing: <HealthWellbeing />,
    work: <Work />,
    education: <Education />,
    transport: <Transport />,
    mobilePhone: <MobilePhone />,
    dining: <Dining />,
    wedding: <Wedding />,
    subscriptions: <Subscriptions />,
    holiday: <Holiday />,
    miscellaneous: <Miscellaneous />,
    gifts: <Gifts />,
    charity: <Charity />,
    tithe: <Tithe />,
    savings: <Savings />,
    stocks: <Stocks />,
    moneyBag: <MoneyBag />,
    bank: <Bank />,
};

function createCategory(name: string, icon: string, channelID: Channel['id'], builtin?: true): TransactionCategory {
    return {
        id: `${channelID}:${name.toUpperCase().replace(/\s+/g, '')}`,
        name,
        icon,
        channelID,
        ...(builtin ? { builtin } : {}),
    };
}

export const defaultExpenditures: TransactionCategory[] = [
    createCategory('Rent', 'rent', 'ESSENTIAL', true),
    createCategory('Utilities', 'utilities', 'ESSENTIAL', true),
    createCategory('Groceries', 'groceries', 'ESSENTIAL', true),
    createCategory('Health & Wellbeing', 'healthwellbeing', 'ESSENTIAL', true),
    createCategory('Work', 'work', 'ESSENTIAL', true),
    createCategory('Education', 'education', 'ESSENTIAL', true),
    createCategory('Transport', 'transport', 'ESSENTIAL', true),
    createCategory('Mobile Phone', 'mobilePhone', 'ESSENTIAL', true),
    createCategory('Misc.', 'miscellaneous', 'ESSENTIAL', true),
    createCategory('Dining', 'dining', 'NON-ESSENTIAL', true),
    createCategory('Wedding', 'wedding', 'NON-ESSENTIAL', true),
    createCategory('Subscriptions', 'subscriptions', 'NON-ESSENTIAL', true),
    createCategory('Holiday', 'holiday', 'NON-ESSENTIAL', true),
    createCategory('Misc.', 'miscellaneous', 'NON-ESSENTIAL', true),
    createCategory('Gifts', 'gifts', 'GIVING', true),
    createCategory('Charity', 'charity', 'GIVING', true),
    createCategory('Tithe', 'tithe', 'GIVING', true),
    createCategory('Savings', 'savings', 'SAVINGS', true),
    createCategory('Investment', 'stocks', 'SAVINGS', true),
];

export const defaultIncomes: TransactionCategory[] = [
    createCategory('Salary', 'work', 'INCOME', true),
    createCategory('Student Loan', 'education', 'INCOME', true),
    createCategory('Student Grant', 'education', 'INCOME', true),
    createCategory('Bursary', 'moneyBag', 'INCOME', true),
    createCategory('Loan', 'bank', 'INCOME', true),
    createCategory('Gifts', 'gifts', 'INCOME', true),
    createCategory('Interest', 'savings', 'INCOME', true),
    createCategory('Investment Yield', 'stocks', 'INCOME', true),
    createCategory('Dividend', 'stocks', 'INCOME', true),
    createCategory('Misc.', 'miscellaneous', 'INCOME', true),
];

function createChannel(name: string, isIncome: boolean, colour = '#ff00ff'): Channel {
    return {
        id: name.toUpperCase().replace(/\s+/g, ''),
        name,
        isIncome,
        colour,
    };
}

export const defaultChannels: Channel[] = [
    createChannel('Essential', false, '#ea4335'),
    createChannel('Non-Essential', false, '#4a86e8'),
    createChannel('Giving', false, '#46bdc6'),
    createChannel('Savings', false, '#b6d7a8'),
    createChannel('Income', true, '#34a853'),
];
