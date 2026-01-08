import { BankAccount, Channel, Transaction, TransactionCategory, User } from "../types/Bagel";
import { openInBrowser } from "../utils/tauri";
import { toFinancialString } from "../utils/finance";
import { Tooltip, TooltipContent, TooltipTrigger } from "./common/Tooltip";
import { TrueLayerProvider } from "../types/TrueLayer";

import { AppSettings } from "../App";
import Select from "./common/Select";

import './TransactionCard.css'
import '../styles/CommonCard.css'

import { useLayoutEffect, useRef } from "react";
import { icons } from "../data/categories";
import { getDatabaseManager } from "../utils/DatabaseManager";
import { getTransactionIcon } from "../utils/icons";

type TransactionCardProps = {
    className?: string;
    transaction: Transaction;
    account: BankAccount | null;
    users: User[] | null;
    providers: Record<string, TrueLayerProvider>;
    modesty: boolean;
    windowSettings: AppSettings['transactions'];
    globalMaxCardWidth: number,
    cardWidthIs: (cardWith: number) => void;

    allCategories: TransactionCategory[];
    channels: Channel[];
}

function TransactionCard({
    className,
    transaction,
    account,
    users, providers,
    modesty,
    windowSettings,
    globalMaxCardWidth, cardWidthIs,

    allCategories, channels,
}: TransactionCardProps) {

    const ref = useRef<HTMLDivElement>(null);
    
    useLayoutEffect(() => {
        if (!ref.current) {
            return;
        }
        const width = ref.current.getBoundingClientRect().width;
        cardWidthIs(width);
    }, [windowSettings.displayAs]);

    function setAnnotation(categoryID: string) {
        // XXX not persistent (in memory; without a db re-read)
        transaction.annotation = [categoryID];
        // save to db
        getDatabaseManager().then(dbm => dbm.annotateTransaction(transaction.transactionID, categoryID));
    }

    const isCard = account?.cardNetwork !== undefined;

    const currency = transaction?.currency === 'GBP' ? '£' : transaction?.currency;
    // const amount = isCard ? -transaction.amount : transaction?.amount; // card transactions are negative amounts
    const amount = transaction.amount; // card transactions are negative amounts

    const accountUsers = users?.filter(user => account?.users.some(u => u.id === user.id));

    const isPositive = amount > 0;

    const categories = allCategories.filter(c => channels.find(ch => ch.id === c.channelID)?.isIncome === isPositive); // XXX should do in advance
    const category = categories.find(c => c.id === transaction.annotation?.[0]); // XXX
    const channel = channels.find(ch => ch.id === category?.channelID);

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
                                            categories.map(category => {
                                                const channel = channels.find(ch => ch.id === category.channelID);
                                                const categoryIcon = icons?.[category.icon];
                                                return ({
                                                    name: category.name,
                                                    key: category.id,
                                                    element: (
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <span
                                                                    style={{
                                                                        width: '100%',
                                                                        color: channel?.colour,
                                                                    }}
                                                                >
                                                                    {categoryIcon}
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent><span>{category.name}</span></TooltipContent>
                                                        </Tooltip>
                                                    ),
                                                    icon: <span style={{ color: channel?.colour }}>{categoryIcon}</span>,
                                                })
                                            })
                                        }
                                        forcedIndex={categories.findIndex(c => c.id === category?.id)} // XXX!
                                        setSelected={setAnnotation}
                                        mode='grid'
                                        windowMaxWidth={340}
                                    />
                                </TooltipTrigger>
                                <TooltipContent>{category ? `(${channel?.name}) ${category.name}` : 'Select a category'}</TooltipContent>
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
                        <div className='small'>{account?.name}</div>
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
                                    className={`bankLogo ${account?.url ? 'clickable' : ''}`}
                                    src={
                                        account?.provider.logoURI
                                        || (account && (
                                            providers?.[account.provider.id]?.accountLogo
                                            || providers?.[account.provider.id]?.logo_url
                                        ))
                                        || './Serenity/unknown.png'
                                    }
                                    alt={`${account?.name} Logo`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (account?.url) {
                                            openInBrowser(account.url);
                                        }
                                    }}
                                />
                            </TooltipTrigger>
                            <TooltipContent>
                                { account ?
                                    (providers?.[account.provider.id]?.display_name ?? account.provider.name ?? account.provider.id)
                                    : 'Unknown Account'
                                }
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
