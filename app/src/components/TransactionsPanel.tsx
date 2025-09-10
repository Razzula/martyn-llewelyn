import { BankAccount, Transaction, User } from "src/types/Bagel";
import TransactionCard from "./TransactionCard";
import { TrueLayerProvider } from "src/types/TrueLayer";
import { OrderedDateTreeStruct } from "src/types/OrderedDateTree";
import { getMonthName, getMostRecentSunday, getOrdinalSuffix, toYYYYMMDD } from "../utils/utils";
import { isTauri } from "../utils/tauri";
import { useEffect, useState } from "react";

type TransactionsPanelProps = {
    transactionsTree: OrderedDateTreeStruct<Transaction>;
    accounts: Record<string, BankAccount>;
    users: User[] | null;
    providers: Record<string, TrueLayerProvider>;
    modesty: boolean;
    footend?: React.ReactNode;
    updateAccountsTransactions: (from?: string, to?: string) => Promise<void>;
    transactionsLoadedRange: Date;
    setTransactionsLoadedRange: (range: Date) => void;
}

function TransactionsPanel({
    transactionsTree,
    accounts,
    users,
    providers,
    modesty,
    footend,
    updateAccountsTransactions,
    transactionsLoadedRange, setTransactionsLoadedRange,
}: TransactionsPanelProps) {

    const [loadingTransactions, setLoadingTransactions] = useState(false);

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

    return (
        <>
            <div>
                { Object.keys(transactionsTree).length > 0 ? (
                    <div>
                        {
                            Object.keys(transactionsTree).sort((a, b) => b.localeCompare(a)).map(year => (
                                <div key={year}>
                                    <h2>{year}</h2>
                                    {
                                        Object.keys(transactionsTree[year]).sort((a, b) => b.localeCompare(a)).map(month => (
                                            <div key={month}>
                                                <h3>{getMonthName(month)}</h3>
                                                { Object
                                                    .keys(transactionsTree[year][month])
                                                    .sort((a, b) => b.localeCompare(a))
                                                    .map(day => (
                                                        <div key={day}>
                                                            <h4>{parseInt(day)}{getOrdinalSuffix(parseInt(day))}</h4>
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
                                                                    />
                                                                ))
                                                            }
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
                            <button
                                style={{ marginTop: '0.5rem' }}
                                onClick={loadMoreTransactions}
                                disabled={!isTauri || loadingTransactions}
                            >
                                {/* TODO: possibly render what (amount / timespan) is to be loaded */}
                                {loadingTransactions ? <div className='spinner' /> : 'Load More...'}
                            </button>
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
