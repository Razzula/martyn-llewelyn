import { useEffect, useState } from "react";

import { BankAccount, getAccountLogoSrc, User } from "../types/Bagel";
import { TrueLayerProvider } from "../types/TrueLayer";
import { isTauri } from "../utils/tauri";
import { toFinancialString } from "../utils/finance";
import AccountCard from "./AccountCard";
import { AppSettings } from "../App";
import { Tooltip, TooltipContent, TooltipTrigger } from "./common/Tooltip";
import { getAccountBalance } from "../utils/utils";

import './AccountsPanel.css'

type AccountGroup = {
    accounts: Record<string, BankAccount>,
    sum: number,
}

type AccountsPanelProps = {
    accounts: Record<string, BankAccount>;
    users: User[] | null;
    providers: Record<string, TrueLayerProvider>;
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
        const groupBy = windowSettings.groupBy;
        const groups: Record<string, AccountGroup> = {};
        Object.entries(accounts).forEach(([key, account]) => {
            const groupKey =
                // GROUP ACCOUNTS BY PROVIDER
                (groupBy === 'bank') ? account.provider.id :
                // GROUP ACCOUNTS BY UNIQUE USER GROUPS
                // i.e., A, B, and A&B as separate groups
                (groupBy === 'user') ? (account.users.reduce((prev, u) => `${prev}_${u.id}`, '')) :
                // no (valid) grouping defined
                'all';
            if (groups[groupKey] == undefined) {
                groups[groupKey] = {
                    accounts: {},
                    sum: 0,
                };
            }
            groups[groupKey].accounts[key] = account;
            groups[groupKey].sum += getAccountBalance(account);
        })
        setGroupedAccounts(groups);
    }, [accounts, windowSettings])

    useEffect(() => {
        setAccountsSum(
            Object.values(accounts || {}).reduce((sum, account) => sum + getAccountBalance(account), 0)
        )
    }, [accounts])

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
                            Object.entries(groupedAccounts).map(([groupName, group]) =>
                                // <div className='accountsGroup'>
                            // </div>
                                <>
                                    { windowSettings.groupBy &&
                                        <div className='groupCard'>
                                            <h2>
                                                {
                                                    (windowSettings.groupBy === 'bank')
                                                        ? <img className='groupIcon' src={getGroupBankLogoSrc(group)} />
                                                        : (groupName.split('_').map((userID) => {
                                                            if (userID) {
                                                                const icon = users?.find(u => u.id === userID)?.icon;
                                                                if (icon) {
                                                                    return <img className='groupIcon' src={icon} />
                                                                }
                                                            }}))
                                                }
                                            </h2>
                                            <span>
                                                {
                                                    (windowSettings.groupBy === 'bank')
                                                        ? (providers[groupName]?.display_name ?? groupName)
                                                        : (groupName.split('_').map((userID, index, full) => {
                                                            if (userID) {
                                                                const name = users?.find(u => u.id === userID)?.name;
                                                                if (index < full.length - 1) {
                                                                    return `${name} & `
                                                                }
                                                                return name;
                                                            }}))
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
                                                const aIsCard = a.cardNetwork !== undefined;
                                                const aValue = (windowSettings.sortBy === 'name')
                                                    ? a.name.toLowerCase() // name
                                                    : (aIsCard ? a.balance?.current : a.balance?.available) || 0; // balance
                                                const bIsCard = b.cardNetwork !== undefined;
                                                const bValue = (windowSettings.sortBy === 'name')
                                                    ? b.name.toLowerCase() // name
                                                    : (bIsCard ? b.balance?.current : b.balance?.available) || 0; // balance

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
                            )
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
                                <span>Connect with {Object.values(accounts)?.length === 0 || !isTauri ? 'your' : 'another'} Bank</span>
                            </button>
                        </TooltipTrigger>
                        { !isTauri &&
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
