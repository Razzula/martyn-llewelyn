import { useLayoutEffect, useRef, useState } from "react";

import { BankAccount, Channel, Transaction, TransactionAnnotation, TransactionCategory, User } from "../types/Bagel";
import { openInBrowser } from "../utils/tauri";
import { toFinancialString } from "../utils/finance";
import { Tooltip, TooltipContent, TooltipTrigger } from "./common/Tooltip";
import { TrueLayerProvider } from "../types/TrueLayer";
import { AppSettings } from "../App";
import Select from "./common/Select";
import { icons } from "../data/categories";
import { getDatabaseManager } from "../utils/DatabaseManager";
import { getTransactionIcon } from "../utils/icons";
import { isMobile } from "../utils/utils";

import SplitHorizontal from '../assets/icons/SplitHorizontal.svg?react';
import Backspace from '../assets/icons/Backspace.svg?react';

import './TransactionCard.css'
import '../styles/CommonCard.css'

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

    style?: React.CSSProperties;
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

    style,
}: TransactionCardProps) {

    const ref = useRef<HTMLDivElement>(null);

    const [annotationHovered, setAnnotationHovered] = useState<boolean>(false);

    useLayoutEffect(() => {
        if (!ref.current) {
            return;
        }
        const width = ref.current.getBoundingClientRect().width;
        cardWidthIs(width);
    }, [windowSettings.displayAs]);

    function updateOrCreateAnnotation(categoryID: string, index?: number) {
        if (index === undefined) {
            // CREATE
            createAnnotation(categoryID);
        }
        else {
            const annotation = transaction.annotations?.[index];
            if (annotation) {
                if (annotation?.categoryID !== 'null') {
                    // UPDATE
                    const oldCategoryID = annotation.categoryID;
                    if (oldCategoryID === categoryID) {
                        return;
                    }
                    // update in memory
                    annotation.categoryID = categoryID;
                    // save to db
                    getDatabaseManager().then(dbm => dbm.updateTransactionAnnotation(transaction.transactionID, oldCategoryID, annotation));
                }
                else {
                    // CREATE
                    const newAnnotation: TransactionAnnotation = {
                        categoryID: categoryID,
                        amount: annotation?.amount || 0,
                    }
                    // update in memory
                    annotation.categoryID = categoryID;
                    // save to db
                    getDatabaseManager().then(dbm => dbm.createTransactionAnnotation(transaction.transactionID, newAnnotation));
                }
            }
            else {
                // CREATE
                createAnnotation(categoryID);
            }
        }
    }

    function createAnnotation(categoryID: string) {
        const existingAnnotations = transaction.annotations || [];
        const existingTotal = existingAnnotations.reduce((sum, ann) => sum + ann.amount, 0);
        const newAnnotation: TransactionAnnotation = {
            categoryID: categoryID,
            amount: transaction.amount - existingTotal,
        }
        // update in memory
        // XXX not persistent (in memory; without a db re-read)
        transaction.annotations = [
            ...existingAnnotations,
            newAnnotation,
        ];
        // save to db
        getDatabaseManager().then(dbm => dbm.createTransactionAnnotation(transaction.transactionID, newAnnotation));
    }

    function clearAnnotations() {
        transaction.annotations = [];
        getDatabaseManager().then(dbm => dbm.clearTransactionAnnotations(transaction.transactionID));
    }

    function hoverAnnotation() {
        if (transaction.annotations && transaction.annotations.length > 0) {
            setAnnotationHovered(true);
        }
    }

    function unHoverAnnotation() {
        setAnnotationHovered(false);
    }

    function AnnotationButton(annotation: TransactionAnnotation, index?: number) {
        const category = categories.find(c => c.id === annotation.categoryID);
        const channel = channels.find(ch => ch.id === category?.channelID);
        return (
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
                        setSelected={(key) => updateOrCreateAnnotation(key, index)}
                        mode='grid'
                        windowMaxWidth={340}
                    />
                </TooltipTrigger>
                <TooltipContent>{category ? `(${channel?.name}) ${category.name}` : 'Select a category'}</TooltipContent>
            </Tooltip>
        );
    }

    const isCard = account?.cardNetwork !== undefined;

    const currency = transaction?.currency === 'GBP' ? '£' : transaction?.currency;
    // const amount = isCard ? -transaction.amount : transaction?.amount; // card transactions are negative amounts
    const amount = transaction.amount; // card transactions are negative amounts

    const accountUsers = users?.filter(user => account?.users.some(u => u.id === user.id));

    const isPositive = amount > 0;

    const categories = allCategories.filter(c => channels.find(ch => ch.id === c.channelID)?.isIncome === isPositive); // XXX should do in advance
    // const category = categories.find(c => c.id === transaction.annotations?.[0]?.categoryID); // XXX
    // const channel = channels.find(ch => ch.id === category?.channelID);

    const runningBalance = transaction?.runningBalance;

    return (
        <div
            key={transaction.transactionID}
        >
            <div ref={ref}
                className={`transactionCard ${windowSettings.displayAs} ${className}`}
                style={{
                    maxWidth: globalMaxCardWidth,
                    position: 'relative',
                    ...style,
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

                        {windowSettings.displayAs === 'list' &&
                            <div className='verticalSeparator' />
                        }

                        <div className='row'>
                            {/* TRANSACTION CATEGORY */}
                            <div
                                className='annotation row'
                                style={{ marginRight: '8px' }}
                                onMouseEnter={hoverAnnotation}
                                onMouseLeave={unHoverAnnotation}
                            >
                                {
                                    transaction.annotations?.length
                                        ? transaction.annotations.map((annotation, index) => AnnotationButton(annotation, index))
                                        : AnnotationButton({ categoryID: 'null', amount: 0 })
                                }
                                {annotationHovered &&
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <span
                                                style={{
                                                    color: '#e3e3e3',
                                                    cursor: 'pointer',
                                                    marginLeft: '4px',
                                                }}
                                                onClick={() => {
                                                    createAnnotation('null');
                                                    setAnnotationHovered(false);
                                                }}
                                            >
                                                <SplitHorizontal />
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent>Split</TooltipContent>
                                    </Tooltip>
                                }
                                {annotationHovered && transaction.annotations?.length &&
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <span
                                                style={{
                                                    color: 'red',
                                                    cursor: 'pointer',
                                                    marginLeft: '4px',
                                                }}
                                                onClick={() => {
                                                    clearAnnotations();
                                                    setAnnotationHovered(false);
                                                }}
                                            >
                                                <Backspace />
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent>Clear</TooltipContent>
                                    </Tooltip>
                                }
                            </div>
                            {/* DESCRIPTION */}
                            {!isMobile() &&
                                <span className='description'>{transaction.description}</span>
                            }
                        </div>

                    </div>


                    <div className='bankDetails'>
                        {/* ACCOUNT NAME */}
                        {windowSettings.displayAs !== 'waterfall' &&
                            <span className='row'>
                                {windowSettings.displayAs !== 'list' &&
                                    <div className='verticalSeparator' />
                                }
                                <div className='small'>{account?.name}</div>
                            </span>
                        }
                        {/* ACCOUNT / CARD NUMBERS */}
                        {/* {!isCard ? account.number.number : `${account?.cardNetwork === 'MASTERCARD' ? 5 : 4}*** **** **** ${account.number.number}`} */}
                        {/* {!isCard &&
                            <>
                                <div className='verticalSeparator' />
                                {account.number.sortCode}
                            </>
                        } */}
                        {windowSettings.displayAs === 'list' &&
                            <div className='verticalSeparator' />
                        }
                        <span className='row'>
                            {/* USERS */}
                            {windowSettings.displayAs !== 'waterfall' &&
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
                            {windowSettings.displayAs !== 'waterfall' &&
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
                                        {account ?
                                            (providers?.[account.provider.id]?.display_name ?? account.provider.name ?? account.provider.id)
                                            : 'Unknown Account'
                                        }
                                    </TooltipContent>
                                </Tooltip>
                            }
                            {windowSettings.displayAs === 'list' &&
                                <div className='verticalSeparator' />
                            }
                            {/* BALANCE */}
                            {windowSettings.displayAs === 'list' &&
                                <div
                                    className={`balance ${modesty ? 'hidden' : 'hidden'}`}
                                    style={{ width: modesty || windowSettings.displayAs !== 'list' ? '50px' : '100px' }}
                                >
                                    {currency}&nbsp;
                                    {modesty ? '***' : ((runningBalance !== undefined && runningBalance !== null) ? toFinancialString(runningBalance) : '???')}
                                </div>
                            }
                        </span>
                    </div>
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
                    {isMobile() &&
                        <span className='description'>{transaction.description}</span>
                    }
                </div>
            </div>
        </div>
    );
}

export default TransactionCard;
