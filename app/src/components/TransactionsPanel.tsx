import { useEffect, useState } from "react";
import { isTauri } from "../utils/tauri";

import { BankAccount, CardNetwork, Channel, getAccountLogoSrc, Transaction, TransactionCategory, User } from "../types/Bagel";
import TransactionCard from "./TransactionCard";
import { TrueLayerProvider } from "../types/TrueLayer";
import { OrderedDateTreeStruct } from "../types/OrderedDateTree";
import { getMonthName, getMostRecentSunday, getOrdinalSuffix, toYYYYMMDD } from "../utils/utils";
import { AppSettings } from "../App";
import { Tooltip, TooltipContent, TooltipTrigger } from "./common/Tooltip";

import './TransactionsPanel.css';

type TransactionsPanelProps = {
    transactionsTree: OrderedDateTreeStruct<Transaction>;
    accounts: Record<string, BankAccount>;
    users: User[] | null;
    providers: Record<string, TrueLayerProvider>;
    modesty: boolean;
    windowSettings: AppSettings['transactions'];
    footend?: React.ReactNode;
    updateAccountsTransactions: (from?: string, to?: string) => Promise<void>;
    transactionsLoadedRange: Date;
    setTransactionsLoadedRange: (range: Date) => void;
    
    categories: TransactionCategory[];
    channels: Channel[];
}

function TransactionsPanel({
    transactionsTree,
    accounts,
    users,
    providers,
    modesty,
    windowSettings,
    footend,
    updateAccountsTransactions,
    transactionsLoadedRange, setTransactionsLoadedRange,

    categories, channels,
}: TransactionsPanelProps) {

    const [loadingTransactions, setLoadingTransactions] = useState(false);
    const [minCardWidth, setMinCardWidth] = useState<number>(Infinity);

    const [sortedAccounts, setSortedAccounts] = useState<BankAccount[]>([]);

    useEffect(() => {
        if (windowSettings.displayAs === 'list') {
            // XXX: cards needs to be able to grow to full-size in min state
            setMinCardWidth(9999);
        }
    }, [windowSettings.displayAs])

    useEffect(() => {
        if (windowSettings.displayAs === 'waterfall') {
            const sortedAccounts = Object.values(accounts).sort((a, b) => {
                const aIsCard = a.cardNetwork !== undefined;
                const bIsCard = b.cardNetwork !== undefined;
                const aValue = (aIsCard ? a.balance?.current : a.balance?.available) ?? 0;
                const bValue = (bIsCard ? b.balance?.current : b.balance?.available) ?? 0;
    
                // descending
                if (aValue > bValue) return -1;
                if (aValue < bValue) return 1;
                // tie-breaker: alphabetically by name
                return a.name.localeCompare(b.name);
            });
            setSortedAccounts(sortedAccounts);
        }
    }, [accounts, windowSettings])

    function loadMoreTransactions() {
        // TODO: split this into chunks?
        const to = toYYYYMMDD(transactionsLoadedRange);
        const from = getMostRecentSunday(transactionsLoadedRange, false);
        setLoadingTransactions(true);

        updateAccountsTransactions(toYYYYMMDD(from), to)
            .then(() => {
                setTransactionsLoadedRange(from);
            })
            .finally(() => {
                setLoadingTransactions(false);
            });
    }

    function cardWidthIs(cardWidth: number) {
        setMinCardWidth((prev) => {
            const next = Math.min(prev, cardWidth);
            return next;
        });
    };

    return (
        <>
            <div>
                {/* WATERFALL HEADER */}
                { windowSettings.displayAs === 'waterfall' &&
                    <div className='waterfallHeaders row'>
                        <div className='verticalSeparator'/>
                        <span>Date</span>
                        <div className='verticalSeparator'/>
                        {
                            sortedAccounts.map((account: BankAccount) =>
                                <>
                                    <div>
                                        <div>
                                            <img className='waterfallHeaderIcon' src={getAccountLogoSrc(account, providers)} />
                                            { account?.cardNetwork &&
                                                <img className='waterfallHeaderIcon' src={CardNetwork[account.cardNetwork].logo} />
                                            }
                                            {
                                                account?.users?.map(user =>
                                                    <img className='waterfallHeaderIconMini' src={users?.find(u => u.id === user.id)?.icon} />
                                                )
                                            }
                                        </div>
                                        <div className='small'>
                                            {account.name}
                                        </div>
                                    </div>
                                    <div className='verticalSeparator'/>
                                </>
                            )
                        }
                        <span>Balance</span>
                        <div className='verticalSeparator'/>
                    </div>
                }

                {Object.keys(transactionsTree).length > 0 ? (
                    <div>
                        {
                            Object.keys(transactionsTree).sort((a, b) => b.localeCompare(a)).map(year => (
                                <div key={year}>
                                    <h2>{year}</h2>
                                    {
                                        Object.keys(transactionsTree[year]).sort((a, b) => b.localeCompare(a)).map(month => (
                                            <div key={month}>
                                                <h3>{getMonthName(month)}</h3>
                                                {Object
                                                    .keys(transactionsTree[year][month])
                                                    .sort((a, b) => b.localeCompare(a))
                                                    .map(day => (
                                                        <div key={day}>
                                                            <h4>{parseInt(day)}{getOrdinalSuffix(parseInt(day))}</h4>
                                                            <div className={windowSettings.displayAs === 'grid' ? 'transactionsGrid' : 'transactionsList'}>
                                                                {
                                                                    transactionsTree[year][month][day].map((tx, txIndex) => (
                                                                        <TransactionCard
                                                                            className={txIndex > 0 ? 'stacked' : ''}
                                                                            key={tx.transactionID}
                                                                            transaction={tx}
                                                                            account={accounts[tx.accountID ?? ''] ?? null}
                                                                            users={users}
                                                                            providers={providers}
                                                                            modesty={modesty}
                                                                            windowSettings={windowSettings}
                                                                            globalMaxCardWidth={minCardWidth}
                                                                            cardWidthIs={cardWidthIs}

                                                                            allCategories={categories} channels={channels}
                                                                        />
                                                                    ))
                                                                }
                                                            </div>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        ))
                                    }
                                </div>
                            ))
                        }

                        <div className='column'>
                            <button
                                onClick={() => {
                                    document.querySelector('.body')?.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                            >
                                Back to Top
                            </button>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <button
                                            style={{ marginTop: '0.5rem' }}
                                            onClick={loadMoreTransactions}
                                            disabled={!isTauri || loadingTransactions}
                                        >
                                            {/* TODO: possibly render what (amount / timespan) is to be loaded */}
                                            {loadingTransactions ? <div className='spinner' /> : 'Load More...'}
                                        </button>
                                    </TooltipTrigger>
                                    { !isTauri &&
                                        <TooltipContent>This feature is unavailable in limited demo mode.</TooltipContent>
                                    }
                                </Tooltip>
                        </div>
                    </div>
                ) : (
                    <p>No recent transactions.</p>
                )
                }
            </div>
            <div className='column' style={{ paddingBottom: '2rem' }}>
                {footend}
            </div>
        </>
    );
}

export default TransactionsPanel;
