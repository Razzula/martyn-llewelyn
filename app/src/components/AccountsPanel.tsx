import { useEffect, useState } from "react";

import { BankAccount, getAccountLogoSrc, User, WalletEntry } from "../types/Bagel";
import { TrueLayerProvider } from "../types/TrueLayer";
import { isTauri } from "../utils/tauri";
import { toFinancialString } from "../utils/finance";
import AccountCard from "./AccountCard";
import { AppSettings } from "../App";
import { Tooltip, TooltipContent, TooltipTrigger } from "./common/Tooltip";
import { getAccountBalance } from "../utils/accounts";

import './AccountsPanel.css'
import { getInstrumentTypeIcon } from "../utils/icons";

type AccountGroup = {
    accounts: Record<string, BankAccount>,
    sum: number,
}

type AccountsPanelProps = {
    accounts: Record<string, BankAccount>;
    users: User[] | null;
    providers: Record<string, TrueLayerProvider>;
    walletEntries: WalletEntry[],
    modesty: boolean;
    windowSettings: AppSettings['accounts'];
    setOpenEditAccount: (account: BankAccount) => void;
    startLinkAccount: () => void;
    startCreateAccount: () => void;
    footend?: React.ReactNode;
};

function AccountsPanel({
    accounts,
    users,
    providers,
    walletEntries,
    modesty,
    windowSettings,
    setOpenEditAccount,
    startLinkAccount,
    startCreateAccount,
    footend,
}: AccountsPanelProps) {

    const [groupedAccounts, setGroupedAccounts] = useState<Record<string, AccountGroup>>();
    const [accountsSum, setAccountsSum] = useState<number>(0);

    useEffect(() => {
        const { groupBy } = windowSettings;
        const groups: Record<string, AccountGroup> = {};

        const getGroupKey = (account: BankAccount): string => {
            switch (groupBy) {
                case 'bank':
                    return account.provider.id;
                case 'user':
                    return account.users
                        .map(u => u.id)
                        .sort()
                        .join('_');
                case 'type':
                    return account.instrumentType;
                default:
                    return 'all';
            }
        };

        Object.entries(accounts).forEach(([key, account]) => {
            const groupKey = getGroupKey(account);

            if (!groups[groupKey]) {
                groups[groupKey] = { accounts: {}, sum: 0 };
            }

            groups[groupKey].accounts[key] = account;
            groups[groupKey].sum += getAccountBalance(account);
        });
        setGroupedAccounts(groups);
    }, [accounts, windowSettings])

    useEffect(() => {
        setAccountsSum(
            Object.values(accounts || {}).reduce((sum, account) => sum + getAccountBalance(account), 0)
        )
    }, [accounts])

    function getGroupIcons(
        groupBy: string,
        groupName: string,
        group: AccountGroup,
        users?: User[]
    ) {
        switch (groupBy) {
            case 'bank':
                return (
                    <img
                        className="groupIcon"
                        src={getGroupBankLogoSrc(group)}
                    />
                );
            case 'user':
                return groupName
                    .split('_')
                    .filter(Boolean)
                    .map(userID => {
                        const icon = users?.find(u => u.id === userID)?.icon;
                        return icon
                            ? (
                                <img
                                    key={userID}
                                    className="groupIcon"
                                    src={icon}
                                />
                            )
                            : null;
                    });
            case 'type':
                return getInstrumentTypeIcon(groupName as any);
            default:
                return null;
        }
    }

    function getGroupLabel(
        groupBy: string,
        groupName: string,
        users?: User[],
        providers?: Record<string, TrueLayerProvider>
    ): string {
        switch (groupBy) {
            case 'bank':
                return providers?.[groupName]?.display_name ?? groupName;
            case 'user':
                return groupName
                    .split('_')
                    .filter(Boolean)
                    .map(id => users?.find(u => u.id === id)?.name)
                    .filter(Boolean)
                    .join(' & ');
            case 'type':
                return groupName;
            default:
                return '';
        }
    }

    function getGroupBankLogoSrc(group: AccountGroup): string {
        for (const account of Object.values(group.accounts)) {
            const attempt = getAccountLogoSrc(account, providers);
            if (attempt) {
                return attempt;
            }
        }
        return './Serenity/unknown.png';
    }

    return (
        <>
            <div>
                <h1>
                    {!modesty ? `£ ${toFinancialString(accountsSum)}` : '£ ***'}
                </h1>
            </div>

            {
                groupedAccounts && Object.keys(groupedAccounts).length > 0 ? (
                    // POPULATED RECORD
                    <div className='accountsGrid'>
                        {
                            Object.entries(groupedAccounts).map(([groupName, group]) => {
                                // <div className='accountsGroup'>
                                // </div>
                                return (
                                    <>
                                        {windowSettings.groupBy &&
                                            <div className='groupCard'>
                                                <h2>
                                                    {getGroupIcons(
                                                        windowSettings.groupBy,
                                                        groupName,
                                                        group,
                                                        users || undefined
                                                    )}
                                                </h2>
                                                <span>
                                                    {
                                                        getGroupLabel(
                                                            windowSettings.groupBy,
                                                            groupName,
                                                            users || undefined,
                                                            providers || undefined
                                                        )
                                                    }
                                                </span>
                                                <span className='row'>
                                                    <h3>({Object.values(group.accounts).length})</h3>
                                                    <div className='verticalSeparator' />
                                                    <h3>{!modesty ? `£ ${toFinancialString(group.sum)}` : '£ ***'}</h3>
                                                </span>
                                            </div>
                                        }
                                        {
                                            Object.entries(group.accounts)
                                                .sort(([, a], [, b]) => {
                                                    // order accounts in (ascending || descending) order by (balance || name)
                                                    const aValue = (windowSettings.sortBy === 'name')
                                                        ? a.name.toLowerCase() // name
                                                        : (Math.abs(getAccountBalance(a)) || 0); // balance
                                                    const bValue = (windowSettings.sortBy === 'name')
                                                        ? b.name.toLowerCase() // name
                                                        : (Math.abs(getAccountBalance(b)) || 0); // balance

                                                    if (windowSettings.sortOrder == 'desc') {
                                                        // desc
                                                        if (aValue > bValue) return -1;
                                                        if (aValue < bValue) return 1;
                                                    }
                                                    else {
                                                        // asc
                                                        if (aValue > bValue) return 1;
                                                        if (aValue < bValue) return -1;
                                                    }
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
                                    </>
                                );
                            })
                        }
                    </div>
                ) : (
                    // EMPTY RECORD
                    <div className='column'>
                        <h4>You don't have any linked accounts.</h4>
                    </div>
                )
            }

            {/* CONNECT ACCOUNT */}
            {/* TrueLayer */}
            <div className='column footer' style={{ paddingBottom: '2rem' }}>
                <div className='row'
                    style={{
                        gap: '1rem',
                        alignItems: 'stretch',
                    }}
                >
                    <Tooltip>
                        <TooltipTrigger>
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
                                <span>Connect with {walletEntries.length === 0 || !isTauri ? 'your' : 'another'} Bank</span>
                            </button>
                        </TooltipTrigger>
                        {!isTauri &&
                            <TooltipContent>This feature is unavailable in limited demo mode.</TooltipContent>
                        }
                    </Tooltip>
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
