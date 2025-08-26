import { BankAccount, Transaction, User } from "src/types/Bagel";
import TransactionCard from "./TransactionCard";
import { TrueLayerProvider } from "src/types/TrueLayer";
import { OrderedDateTreeStruct } from "src/types/OrderedDateTree";
import { getMonthName, getOrdinalSuffix } from "../utils/utils";

type TransactionsPanelProps = {
    transactionsTree: OrderedDateTreeStruct<Transaction>;
    accounts: Record<string, BankAccount>;
    users: User[] | null;
    providers: Record<string, TrueLayerProvider>;
    modesty: boolean;
    footend?: React.ReactNode;
}

function TransactionsPanel({
    transactionsTree,
    accounts,
    users,
    providers,
    modesty,
    footend
}: TransactionsPanelProps) {

    console.log('Rendering TransactionsPanel with transactionsTree:', transactionsTree);

    return (
        <>
            <div>
                { transactionsTree ? (
                    <div>
                        {
                            Object.keys(transactionsTree).sort((a, b) => b.localeCompare(a)).map(year => (
                                <div key={year}>
                                    <h2>{year}</h2>
                                    {
                                        Object.keys(transactionsTree[year]).sort((a, b) => b.localeCompare(a)).map(month => (
                                            <div key={month}>
                                                <h3>{getMonthName(month)}</h3>
                                                {
                                                    Object.keys(transactionsTree[year][month]).sort((a, b) => b.localeCompare(a)).map(day => (
                                                        <div key={day}>
                                                            <h4>{parseInt(day)}{getOrdinalSuffix(parseInt(day))}</h4>
                                                            {
                                                                transactionsTree[year][month][day].map(tx => (
                                                                    <TransactionCard
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
                    </div>
                ) : (
                    <p>No recent transactions</p>
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
