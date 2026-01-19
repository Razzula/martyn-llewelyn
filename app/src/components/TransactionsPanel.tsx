import { forwardRef, useEffect, useRef, useState } from "react";

import { categoriesStore, channelsStore } from "../Engine";
import { useSyncExternalSignal } from '../utils/Boulangerie.ts';
import { BankAccount, CardNetwork, getAccountLogoSrc, Transaction, User, WalletEntry } from "../types/Bagel";
import TransactionCard from "./TransactionCard";
import { TrueLayerProvider } from "../types/TrueLayer";
import { OrderedDateTreeStruct } from "../types/OrderedDateTree";
import { getMonthName, getMostRecentSunday, getOrdinalSuffix, toYYYYMMDD } from "../utils/utils";
import { AppSettings } from "../App";
import { Tooltip, TooltipContent, TooltipTrigger } from "./common/Tooltip";
import { isTauri } from "../utils/tauri";

import './TransactionsPanel.css';

type TransactionsPanelProps = {
    transactionsTree: OrderedDateTreeStruct<Transaction>;
    accounts: Record<string, BankAccount>;
    users: User[] | null;
    providers: Record<string, TrueLayerProvider>;
    walletEntries: WalletEntry[];
    modesty: boolean;
    windowSettings: AppSettings['transactions'];
    footend?: React.ReactNode;
    updateAccountsTransactions: (from: string, to: string) => Promise<void>;
    transactionsLoadedRange: Date;
    setTransactionsLoadedRange: (range: Date) => void;
}

function TransactionsPanel({
    transactionsTree,
    accounts,
    users,
    providers,
    walletEntries,
    modesty,
    windowSettings,
    footend,
    updateAccountsTransactions,
    transactionsLoadedRange, setTransactionsLoadedRange,
}: TransactionsPanelProps) {

    const categories = useSyncExternalSignal(categoriesStore);
    const channels = useSyncExternalSignal(channelsStore);

    const [loadingTransactions, setLoadingTransactions] = useState(false);
    const [minCardWidth, setMinCardWidth] = useState<number>(Infinity);
    const [accountIndexes, setAccountIndexes] = useState<Record<string, number>>({});
    const [columnWidths, setColumnWidths] = useState<number[]>([]);

    const [sortedAccounts, setSortedAccounts] = useState<BankAccount[]>([]);

    useEffect(() => {
        if (['list'].includes(windowSettings.displayAs)) {
            // XXX: cards needs to be able to grow to full-size in min state
            setMinCardWidth(9999);
        }
    }, [windowSettings.displayAs]);

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
    }, [accounts, windowSettings]);

    useEffect(() => {
        const indexes: Record<string, number> = {};
        sortedAccounts.forEach((account, index) => {
            indexes[account.id] = index;
        });
        setAccountIndexes(indexes);
    }, [sortedAccounts]);


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

    // function updateAccountIndex(account: string, index: number) {
    //     setAccountIndexes((prev) => {
    //         const next = { ...prev };
    //         next[account] = index;
    //         return next;
    //     });
    // }

    function getAccountIndex(account: string | undefined) {
        if (account) {
            return accountIndexes?.[account] ?? 0;
        }
        return 0;
    }

    function cardWidthIs(cardWidth: number) {
        setMinCardWidth((prev) => {
            const next = Math.min(prev, cardWidth);
            return next;
        });
    };

    function columnWidthIs(columnIndex: number, accountWidth: number) {
        setColumnWidths((prev) => {
            const next = { ...prev };
            while (next.length - 1 < columnIndex) {
                next.push(0);
            }
            next[columnIndex] = accountWidth;
            return next;
        });
    };

    function getColumnWidth(accountID?: string) {
        if (!accountID) {
            return 0;
        }
        const index = getAccountIndex(accountID);
        return columnWidths[index];
    }

    function getColumnOffset(accountID?: string) {
        if (!accountID) {
            return 0;
        }
        const index = getAccountIndex(accountID);
        let offset = 0;
        for (let i = 0; i < index; i++) {
            offset += columnWidths[i] ?? minCardWidth;
        }
        return offset;
    }

    return (
        <>
            <div>
                {/* WATERFALL HEADER */}
                {windowSettings.displayAs === 'waterfall' &&
                    <div className='waterfallHeaders row'>
                        <div className='verticalSeparator' />
                        {/* <span style={{ minWidth: 100 }}>Date</span> */}
                        {
                            sortedAccounts.map((account: BankAccount, index: number) => {
                                return (
                                    <>
                                        <AccountHeading onResize={(width: number) => columnWidthIs(index, width)}>
                                            <div>
                                                <div>
                                                    <img className='waterfallHeaderIcon' src={getAccountLogoSrc(account, providers)} />
                                                    {account?.cardNetwork &&
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
                                        </AccountHeading>
                                        {/* <div className='verticalSeparator' /> */}
                                    </>
                                )
                            })
                        }
                        {/* <span style={{ minWidth: 100 }}>Balance</span> */}
                        <div className='verticalSeparator' />
                    </div>
                }

                <div>
                    {
                        Object.keys(transactionsTree).length > 0 ? (
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
                                                                            globalMaxCardWidth={
                                                                                windowSettings.displayAs === 'waterfall' ? getColumnWidth(tx.accountID) : minCardWidth
                                                                            }
                                                                            cardWidthIs={cardWidthIs}
                                                                            allCategories={categories} channels={channels}

                                                                            style={{
                                                                                // position: windowSettings.displayAs === 'waterfall' ? 'absolute' : 'relative', // or relative container
                                                                                left: windowSettings.displayAs === 'waterfall' ? getColumnOffset(tx.accountID) : undefined,
                                                                            }}
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
                        ) : (
                            <p>No recent transactions.</p>
                        )
                    }
                    <div className='column'>
                        <button
                            onClick={() => {
                                document.querySelector('.body')?.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            disabled={Object.keys(transactionsTree).length === 0}
                        >
                            Back to Top
                        </button>
                        <Tooltip>
                            <TooltipTrigger>
                                <button
                                    style={{ marginTop: '0.5rem' }}
                                    onClick={loadMoreTransactions}
                                    disabled={!isTauri || loadingTransactions || walletEntries.length === 0}
                                >
                                    {/* TODO: possibly render what (amount / timespan) is to be loaded */}
                                    {loadingTransactions ? <div className='spinner' /> : 'Load More...'}
                                </button>
                            </TooltipTrigger>
                            {!isTauri &&
                                <TooltipContent>This feature is unavailable in limited demo mode.</TooltipContent>
                            }
                        </Tooltip>
                    </div>
                </div>
            </div>
            <div className='column' style={{ paddingBottom: '2rem' }}>
                {footend}
            </div>
        </>
    );
}

type AccountHeadingProps = {
    children: React.ReactNode;
    onResize?: (width: number) => void;
};

const AccountHeading = forwardRef<HTMLDivElement, AccountHeadingProps>(
    ({ children, onResize }, ref) => {
        const internalRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            const el = (ref as React.RefObject<HTMLDivElement>)?.current || internalRef.current;
            if (!el || !onResize) {
                return;
            }

            // initial size
            // onResize(el.offsetWidth);

            // listen for resizes
            const observer = new ResizeObserver(entries => {
                for (let entry of entries) {
                    onResize(entry.contentRect.width);
                }
            });
            observer.observe(el);

            return () => observer.disconnect();
        }, [ref, onResize]);

        return (
            <div ref={ref || internalRef} className="accountHeading">
                {children}
            </div>
        );
    }
);

export default TransactionsPanel;
