import { useEffect, useState } from "react";

import { BankAccount, Transaction, User } from "src/types/Bagel";
import TransactionCard from "./TransactionCard";
import { TrueLayerProvider } from "src/types/TrueLayer";

type TransactionsPanelProps = {
    transactions: Transaction[];
    accounts: Record<string, BankAccount>;
    users: User[] | null;
    providers: Record<string, TrueLayerProvider>;
    modesty: boolean;
    setOpenEditAccount: (account: BankAccount) => void;
    footend?: React.ReactNode;
}

function TransactionsPanel({
    transactions,
    accounts,
    users,
    providers,
    modesty,
    setOpenEditAccount,
    footend
}: TransactionsPanelProps) {

    return (
        <>
            <div>
                { transactions.length > 0 ? (
                    <div>
                        {transactions.map(tx => (
                            <TransactionCard
                                key={tx.transactionID}
                                transaction={tx}
                                account={accounts[tx.accountID ?? ''] ?? null}
                                users={users}
                                providers={providers}
                                modesty={modesty}
                                setOpenEditAccount={setOpenEditAccount}
                            />
                        ))}
                    </div>
                ) : (
                    <p>No recent transactions</p>
                )
                }
            </div>
            <div>
                {footend}
            </div>
        </>
    );
}

export default TransactionsPanel;
