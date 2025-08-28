import { BankAccount, User } from "../types/Bagel";
import { TrueLayerProvider } from "../types/TrueLayer";
import { isTauri } from "../utils/tauri";
import { toFinancialString } from "../utils/finance";
import AccountCard from "./AccountCard";

type AccountsPanelProps = {
    accounts: Record<string, BankAccount>;
    users: User[] | null;
    providers: Record<string, TrueLayerProvider>;
    accountsSum: number;
    modesty: boolean;
    setOpenEditAccount: (account: BankAccount) => void;
    startLinkAccount: () => void;
    startCreateAccount: () => void;
    footend?: React.ReactNode;
};

function AccountsPanel({
    accounts,
    users,
    providers,
    accountsSum,
    modesty,
    setOpenEditAccount,
    startLinkAccount,
    startCreateAccount,
    footend,
}: AccountsPanelProps) {
    return (
        <>
            <div>
                <h1>
                    {!modesty ? `£ ${toFinancialString(accountsSum)}` : '£ ***'}
                </h1>
            </div>

            {
                Object.keys(accounts).length > 0 ? (
                    // POPULATED RECORD
                    <div className='accountsGrid'>
                        {Object.entries(accounts)
                            .sort(([, a], [, b]) => {
                                // order accounts in descending order by balance
                                const aIsCard = a.cardNetwork !== undefined;
                                const aValue = (aIsCard ? a.balance?.current : a.balance?.available) || 0;
                                const bIsCard = b.cardNetwork !== undefined;
                                const bValue = (bIsCard ? b.balance?.current : b.balance?.available) || 0;
                                if (aValue > bValue) return -1;
                                if (aValue < bValue) return 1;
                                return 0;
                            })
                            .map(([accountID, account]) => (
                                <AccountCard
                                    key={accountID}
                                    accountID={accountID} account={account}
                                    users={users} providers={providers}
                                    modesty={modesty}
                                    setOpenEditAccount={setOpenEditAccount}
                                />
                            ))
                        }
                    </div>
                ) : (
                    // EMPTY RECORD
                    <div className='column'>
                        <h4>You don't have any linked accounts.</h4>
                    </div>
                )
            }

            {/* CONNECT ACCOUNT */ }
            {/* TrueLayer */ }
            <div className='column' style={{ paddingBottom: '2rem' }}>
                <div className='row'
                    style={{
                        gap: '1rem',
                        alignItems: 'stretch',
                    }}
                >
                    <button
                        className='column'
                        onClick={() => startLinkAccount()}
                        disabled={!isTauri}
                    >
                        <img
                            src='./TrueLayer/Banks/BankLogos_UnitedKingdom_5icons.svg'
                            alt='All Major UK Banks Supported'
                            height={24}
                        />
                        <span>Connect with {Object.values(accounts)?.length === 0 ? 'your' : 'another'} Bank</span>
                    </button>
                    <button
                        className='column'
                        onClick={startCreateAccount}
                    >
                        <img
                            src='./Serenity/dir.png'
                            alt='Add a Manual Entry'
                            height={24}
                        />
                        <span>Manual Entry</span>
                    </button>
                </div>

                {footend}
            </div>
        </>
    );
}

export default AccountsPanel;
