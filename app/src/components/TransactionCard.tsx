import { BankAccount, Transaction, User } from "../types/Bagel";
import { openInBrowser } from "../utils/tauri";
import { toFinancialString } from "../utils/finance";
import { Tooltip, TooltipContent, TooltipTrigger } from "./common/Tooltip";
import { TrueLayerProvider, TrueLayerTransactionCategory } from "../types/TrueLayer";

import { AppSettings } from "src/App";
import Select from "./common/Select";
import { expenditures, incomes } from "../data/categories";

import './TransactionCard.css'
import '../styles/CommonCard.css'

import Bank from '../assets/icons/Bank.svg?react';
import Cash from '../assets/icons/Cash.svg?react';
import Chequebook from '../assets/icons/Checkbook.svg?react';
import CardCredit from '../assets/icons/CardCredit.svg?react';
import CardSpending from '../assets/icons/CardSpending.svg?react';
import Savings from '../assets/icons/Savings.svg?react';
import EventRepeat from '../assets/icons/EventRepeat.svg?react';
import { useLayoutEffect, useRef } from "react";

type TransactionCardProps = {
    className?: string;
    transaction: Transaction;
    account: BankAccount;
    users: User[] | null;
    providers: Record<string, TrueLayerProvider>;
    modesty: boolean;
    windowSettings: AppSettings['transactions'];
    globalMaxCardWidth: number,
    cardWidthIs: (cardWith: number) => void;
}

function TransactionCard({
    className,
    transaction,
    account,
    users, providers,
    modesty,
    windowSettings,
    globalMaxCardWidth, cardWidthIs,
}: TransactionCardProps) {

    const ref = useRef<HTMLDivElement>(null);
    
    useLayoutEffect(() => {
        if (!ref.current) {
            return;
        }
        const width = ref.current.getBoundingClientRect().width;
        cardWidthIs(width);
    }, [windowSettings.displayAs]);

    function getTransactionIcon(category: TrueLayerTransactionCategory, isCard: boolean): JSX.Element {
        switch (category) {
            case TrueLayerTransactionCategory.ATM:
            case TrueLayerTransactionCategory.CASH:
            case TrueLayerTransactionCategory.CASHBACK:
                return <Cash />;
            case TrueLayerTransactionCategory.CHEQUE:
                return <Chequebook />;
            case TrueLayerTransactionCategory.CREDIT:
                return <CardCredit />;
            case TrueLayerTransactionCategory.DEBIT:
                return <CardSpending />;
            case TrueLayerTransactionCategory.DIRECT_DEBIT:
                return <img
                    src='./Finance/DirectDebit_Portrait.svg'
                    alt='Direct Debit'
                    width={24} height={24}
                />;
            case TrueLayerTransactionCategory.DIVIDEND:
            case TrueLayerTransactionCategory.INTEREST:
                return <Savings />;
            case TrueLayerTransactionCategory.STANDING_ORDER:
                return <EventRepeat />;
            case TrueLayerTransactionCategory.TRANSFER:
                return <Bank />;
            // case TrueLayerTransactionCategory.BILL_PAYMENT:
            // case TrueLayerTransactionCategory.CORRECTION:
            // case TrueLayerTransactionCategory.FEE_CHARGE:
            // case TrueLayerTransactionCategory.PURCHASE:
            case TrueLayerTransactionCategory.OTHER:
            case TrueLayerTransactionCategory.UNKNOWN:
            default:
                return isCard ? <CardCredit /> : <Bank />;
        }
    }

    function getChannelColour(channel: string): string {
        switch (channel) {
            case 'ESSENTIAL':
                return '#ea4335';
            case 'NON-ESSENTIAL':
                return '#4a86e8';
            case 'GIVING':
                return '#46bdc6';
            case 'SAVINGS':
                return '#b6d7a8';
                case 'INCOME':
                return '#34a853';
            default:
                return 'black';
        }
    }

    const isCard = account.cardNetwork !== undefined;

    const currency = transaction?.currency === 'GBP' ? '£' : transaction?.currency;
    const amount = isCard ? -transaction.amount : transaction?.amount; // card transactions are negative amounts

    const accountUsers = users?.filter(user => account.users.some(u => u.id === user.id));

    const isPositive = amount > 0;

    const categories = Object.values(isPositive ? incomes : expenditures);
    const category = categories.find(c => c.id === transaction.annotation);

    return (
        <div ref={ref}
            className={`transactionCard ${windowSettings.displayAs} ${className}`}
            key={transaction.transactionID}
            style={{
                position: 'relative',
                maxWidth: globalMaxCardWidth,
            }}
        >

            { /* HEADER */}
            <div className='accountHeader'>

                <div className={windowSettings.displayAs === 'list' ? 'row' : ''}>
                    <div className='row anchorLeft'>
                        {/* TRANSACTION TYPE */}
                        <Tooltip>
                            <TooltipTrigger>
                                <span className='icon' style={{
                                    width: '24px', height: '24px',
                                    color: '#231f20'
                                }}>
                                    {getTransactionIcon(transaction.transactionCategory, isCard)}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>{transaction.transactionCategory}</TooltipContent>
                        </Tooltip>
                        <div className='verticalSeparator' />

                        {/* BALANCE */}
                        <div
                            className={`balance ${modesty ? 'hidden' : (isPositive ? 'positive' : 'negative')}`}
                            style={{ width: modesty || windowSettings.displayAs !== 'list' ? '50px' : '100px' }}
                        >
                            {currency}&nbsp;
                            {modesty ? '***' : toFinancialString(amount)}
                        </div>
                    </div>

                    { windowSettings.displayAs === 'list' &&
                        <div className='verticalSeparator' />
                    }

                    <div className='row'>
                        {/* TRANSACTION CATEGORY */}
                        <div style={{ marginRight: '8px' }}>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Select
                                        entries={
                                            categories.map(category => ({
                                                name: category.name,
                                                key: category.id,
                                                element: (
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <span
                                                                style={{
                                                                    width: '100%',
                                                                    color: getChannelColour(category.channel)
                                                                }}
                                                            >
                                                                {category.icon}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent><span>{category.name}</span></TooltipContent>
                                                    </Tooltip>
                                                ),
                                                icon: <span style={{ color: getChannelColour(category.channel) }}>{category.icon}</span>,
                                            }))
                                        }
                                        forcedIndex={categories.findIndex(c => c.id === transaction.annotation)} // XXX!
                                        setSelected={function (name: string): void {
                                            throw new Error(`Function for setSelected(${name}) not implemented.`);
                                        }}
                                        mode='grid'
                                        windowMaxWidth={340}
                                    />
                                </TooltipTrigger>
                                <TooltipContent>{category ? `(${category.channel}) ${category.name}` : 'Select a category'}</TooltipContent>
                            </Tooltip>
                        </div>
                        {/* DESCRIPTION */}
                        <span className='description'>{transaction.description}</span>
                    </div>

                </div>


                <div className='bankDetails'>
                    {/* ACCOUNT NAME */}
                    <span className='row'>
                        { windowSettings.displayAs !== 'list' &&
                            <div className='verticalSeparator' />
                        }
                        <div className='small'>{account.name}</div>
                    </span>
                    {/* ACCOUNT / CARD NUMBERS */}
                    {/* {!isCard ? account.number.number : `${account?.cardNetwork === 'MASTERCARD' ? 5 : 4}*** **** **** ${account.number.number}`} */}
                    {/* {!isCard &&
                        <>
                            <div className='verticalSeparator' />
                            {account.number.sortCode}
                        </>
                    } */}
                    { windowSettings.displayAs === 'list' &&
                        <div className='verticalSeparator' />
                    }
                    <span className='row'>
                        {/* USERS */}
                        {
                            accountUsers?.map(user => (
                                <Tooltip key={user.id}>
                                    <TooltipTrigger>
                                        <img
                                            key={user.id}
                                            className='bankLogo'
                                            src={user.icon}
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {user.name}
                                    </TooltipContent>
                                </Tooltip>
                            ))
                        }
                        {/* BANK */}
                        <Tooltip>
                            <TooltipTrigger>
                                <img
                                    className={`bankLogo ${account.url ? 'clickable' : ''}`}
                                    src={
                                        account.provider.logoURI
                                        || providers?.[account.provider.id]?.accountLogo
                                        || providers?.[account.provider.id]?.logo_url
                                        || './Serenity/unknown.png'
                                    }
                                    alt={`${account.name} Logo`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (account.url) {
                                            openInBrowser(account.url);
                                        }
                                    }}
                                />
                            </TooltipTrigger>
                            <TooltipContent>
                                {providers?.[account.provider.id]?.display_name ?? account.provider.name ?? account.provider.id}
                            </TooltipContent>
                        </Tooltip>
                    </span>
                </div>

            </div>

            {/* BODY */}
            <div className='accountBody'>
                <div className='row'>
                    {/* { transaction.timestamp &&
                        new Date(transaction.timestamp).toLocaleDateString()
                    } */}
                    {/* <div className='verticalSeparator' /> */}
                    {/* <span>{transaction.description}</span> */}
                </div>
            </div>
        </div>
    );
}

export default TransactionCard;
