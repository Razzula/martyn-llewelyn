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

function createCategory(name: string, icon: JSX.Element, channel: Channel, builtin?: true): TransactionCategory {
    return {
        id: `${channel}:${name.toUpperCase().replace(/\s+/g, '')}`,
        name,
        icon,
        channel,
        ...(builtin ? { builtin } : {}),
    };
}

export const expenditures: TransactionCategory[] = [
    createCategory('Rent', <Rent />, 'ESSENTIAL', true),
    createCategory('Utilities', <Utilities />, 'ESSENTIAL', true),
    createCategory('Groceries', <Groceries />, 'ESSENTIAL', true),
    createCategory('Health & Wellbeing', <HealthWellbeing />, 'ESSENTIAL', true),
    createCategory('Work', <Work />, 'ESSENTIAL', true),
    createCategory('Education', <Education />, 'ESSENTIAL', true),
    createCategory('Transport', <Transport />, 'ESSENTIAL', true),
    createCategory('Mobile Phone', <MobilePhone />, 'ESSENTIAL', true),
    createCategory('Misc.', <Miscellaneous />, 'ESSENTIAL', true),
    createCategory('Dining', <Dining />, 'NON-ESSENTIAL', true),
    createCategory('Wedding', <Wedding />, 'NON-ESSENTIAL', true),
    createCategory('Subscriptions', <Subscriptions />, 'NON-ESSENTIAL', true),
    createCategory('Holiday', <Holiday />, 'NON-ESSENTIAL', true),
    createCategory('Misc.', <Miscellaneous />, 'NON-ESSENTIAL', true),
    createCategory('Gifts', <Gifts />, 'GIVING', true),
    createCategory('Charity', <Charity />, 'GIVING', true),
    createCategory('Tithe', <Tithe />, 'GIVING', true),
    createCategory('Savings', <Savings />, 'SAVINGS', true),
    createCategory('Investment', <Stocks />, 'SAVINGS', true),
];

export const incomes: TransactionCategory[] = [
    createCategory('Salary', <Work />, 'INCOME', true),
    createCategory('Student Loan', <Education />, 'INCOME', true),
    createCategory('Student Grant', <Education />, 'INCOME', true),
    createCategory('Bursary', <MoneyBag />, 'INCOME', true),
    createCategory('Loan', <Bank />, 'INCOME', true),
    createCategory('Gifts', <Gifts />, 'INCOME', true),
    createCategory('Interest', <Savings />, 'INCOME', true),
    createCategory('Investment Yield', <Stocks />, 'INCOME', true),
    createCategory('Dividend', <Stocks />, 'INCOME', true),
    createCategory('Misc.', <Miscellaneous />, 'INCOME', true),
];
