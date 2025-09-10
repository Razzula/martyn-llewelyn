import { TransactionCategory } from '../types/Bagel';

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

export const expenditures: TransactionCategory[] = [
    {
        name: 'Rent',
        icon: <Rent />,
        channel: 'ESSENTIAL',
    },
    {
        name: 'Utilities',
        icon: <Utilities />,
        channel: 'ESSENTIAL',
    },
    {
        name: 'Groceries',
        icon: <Groceries />,
        channel: 'ESSENTIAL',
    },
    {
        name: 'Health & Wellbeing',
        icon: <HealthWellbeing />,
        channel: 'ESSENTIAL',
    },
    {
        name: 'Work',
        icon: <Work />,
        channel: 'ESSENTIAL',
    },
    {
        name: 'Education',
        icon: <Education />,
        channel: 'ESSENTIAL',
    },
    {
        name: 'Transport',
        icon: <Transport />,
        channel: 'ESSENTIAL',
    },
    {
        name: 'Mobile Phone',
        icon: <MobilePhone />,
        channel: 'ESSENTIAL',
    },
    {
        name: 'Misc.',
        icon: <Miscellaneous />,
        channel: 'ESSENTIAL',
    },
    {
        name: 'Dining',
        icon: <Dining />,
        channel: 'NON-ESSENTIAL',
    },
    {
        name: 'Wedding',
        icon: <Wedding />,
        channel: 'NON-ESSENTIAL',
    },
    {
        name: 'Subscriptions',
        icon: <Subscriptions />,
        channel: 'NON-ESSENTIAL',
    },
    {
        name: 'Holiday',
        icon: <Holiday />,
        channel: 'NON-ESSENTIAL',
    },
    {
        name: 'Misc.',
        icon: <Miscellaneous />,
        channel: 'NON-ESSENTIAL',
    },
    {
        name: 'Gifts',
        icon: <Gifts />,
        channel: 'GIVING',
    },
    {
        name: 'Charity',
        icon: <Charity />,
        channel: 'GIVING',
    },
    {
        name: 'Tithe',
        icon: <Tithe />,
        channel: 'GIVING',
    },
    {
        name: 'Savings',
        icon: <Savings />,
        channel: 'SAVINGS',
    },
    {
        name: 'Investment',
        icon: <Stocks />,
        channel: 'SAVINGS',
    },
];

export const incomes: TransactionCategory[] = [
    {
        name: 'Salary',
        icon: <Work />,
        channel: 'INCOME',
    },
    {
        name: 'Student Loan',
        icon: <Education />,
        channel: 'INCOME',
    },
    {
        name: 'Student Grant',
        icon: <Education />,
        channel: 'INCOME',
    },
    {
        name: 'Bursary',
        icon: <MoneyBag />,
        channel: 'INCOME',
    },
    {
        name: 'Loan',
        icon: <Bank />,
        channel: 'INCOME',
    },
    {
        name: 'Gifts',
        icon: <Gifts />,
        channel: 'INCOME',
    },
    {
        name: 'Interest',
        icon: <Savings />,
        channel: 'INCOME',
    },
    {
        name: 'Investment Yield',
        icon: <Stocks />,
        channel: 'INCOME',
    },
    {
        name: 'Dividend',
        icon: <Stocks />,
        channel: 'INCOME',
    },
    {
        name: 'Misc.',
        icon: <Miscellaneous />,
        channel: 'INCOME',
    },
];
