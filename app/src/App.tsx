import { RefObject, useEffect, useRef, useState } from 'react';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';

import { accountsLoadStateStore, accountsStore, Engine, providersStore, transactionsLoadedRangeStore, transactionsTreeStore, usersStore, walletEntriesStore } from './Engine.ts';
import { useSyncExternalSignal } from './utils/Boulangerie.ts';
import { TrueLayerClient } from './lib/TrueLayer.ts';
import { BankAccount, WalletEntry, User } from './types/Bagel.ts';
import { ResponsiveModal } from './components/common/ResponsiveModal.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from './components/common/Tooltip.tsx';
import { isTauri, openInBrowser } from './utils/tauri.ts';
import AccountEditPanel from './components/AccountEditPanel.tsx';
import { isInIframe, isMobile } from './utils/utils.ts';

import './styles/App.css';
import UserEditPanel from './components/UserEditPanel.tsx';
import SegmentedControl from './components/common/SegmentedControl.tsx';
import AccountsPanel from './components/AccountsPanel.tsx';
import TransactionsPanel from './components/TransactionsPanel.tsx';
import { ToggleSwitch } from './components/common/ToggleSwitch.tsx';
import { WiggleWrapper } from './components/common/WiggleWrapper.tsx';
import Spinner from './components/common/Spinner.tsx';
import { RadioButtons, ToggleButton } from './components/common/RadioButtons.tsx';
import DashboardPanel from './components/DashboardPanel.tsx';
import WalletEntryCard from './components/WalletEntryCard.tsx';

import VisibilityIcon from './assets/icons/Visibility.svg?react';
import VisibilityOffIcon from './assets/icons/VisibilityOff.svg?react';
import Ascending from './assets/icons/Ascending.svg?react';
import Descending from './assets/icons/Descending.svg?react';
import MoneyBag from './assets/icons/MoneyBag.svg?react';
import Alpha from './assets/icons/SortByAlpha.svg?react';
import Bank from './assets/icons/Bank.svg?react';
import Users from './assets/icons/Users.svg?react';
import List from './assets/icons/List.svg?react';
import GridView from './assets/icons/GridView.svg?react';
import Waterfall from './assets/icons/Waterfall.svg?react';
import Category from './assets/icons/Category.svg?react';
import Wallet from './assets/icons/Wallet.svg?react';
import Archive from './assets/icons/Archive.svg?react';

export enum ResponseState {
    LOADING = 'LOADING',
    SUCCESS = 'SUCCESS',
    ERROR = 'ERROR',
}

export type AppSettings = {
    accounts: {
        sortBy: 'name' | 'balance',
        sortOrder: 'asc' | 'desc',
        groupBy?: 'bank' | 'user' | 'type',
        archiveVisibility?: 'vis' | 'hid',
    },
    transactions: {
        displayAs: 'list' | 'grid' | 'waterfall',
    },
    global: {
        modesty: boolean,
    },
}

const defaultAppSettings = (): AppSettings => ({
    accounts: {
        sortBy: 'balance',
        sortOrder: 'desc',
        archiveVisibility: 'hid',
    },
    transactions: {
        displayAs: 'list',
    },
    global: {
        modesty: false,
    },
});

function App() {

    // ENGINE STATES
    const walletEntries = useSyncExternalSignal(walletEntriesStore);
    const users = useSyncExternalSignal(usersStore);

    const providers = useSyncExternalSignal(providersStore);
    const accounts = useSyncExternalSignal(accountsStore);
    const accountsLoadState = useSyncExternalSignal(accountsLoadStateStore);
    const transactionsTree = useSyncExternalSignal(transactionsTreeStore);
    const transactionsLoadedRange = useSyncExternalSignal(transactionsLoadedRangeStore);

    // TODO: remove these
    const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings());

    // UI STATES
    const [panel, setPanel] = useState<'dashboard' | 'accounts' | 'transactions' | 'standing'>('dashboard');

    const [openSelectUser, setOpenSelectUser] = useState<((userID: string, userEmail: string) => void) | null>(null); // holds a function to redirect after user selection
    const [openEditUser, setOpenEditUser] = useState<((userID: string, userEmail: string) => void) | null>(null); // holds a function to redirect after user creation
    const [openEditAccount, setOpenEditAccount] = useState<BankAccount | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const [openWallet, setOpenWallet] = useState<boolean>(false);

    useEffect(() => {
        Engine.get();
    });

    useEffect(() => {
        // LISTEN FOR DEEP LINKS
        let unlisten: (() => void) | undefined;

        onOpenUrl((urls) => {
            // respond to deep link passed from OS
            const callbackUrl = new URL(urls[0]);
            const code = callbackUrl.searchParams.get('code');
            const state = callbackUrl.searchParams.get('state');

            // trigger token exchange, navigate, etc.
            if (code && state) {
                TrueLayerClient.handleTokenExchange(code, state)
                    .then((walletEntry: WalletEntry) => {
                        console.debug('Loaded WalletEntry', walletEntry.walletToken);
                        Engine.get().loadWalletEntries();
                    })
                    .catch(err => {
                        console.error('Token exchange failed:', err);
                    });
            }
        }).then((off) => {
            unlisten = off;
        });

        return () => {
            // cleanup listener
            if (unlisten) unlisten();
        };
    }, []);

    function redirectToTrueLayer(userID: string, userEmail: string) {
        if (userID !== null) {
            TrueLayerClient.getTrueLayerAuthURL(userID, userEmail)
                .then(redirectURI => openInBrowser(redirectURI));
        }
    }

    function startLinkAccount() {
        if (isTauri) {
            const redirect = (userID: string, userEmail: string) => redirectToTrueLayer(userID, userEmail);
            if (users === null || users.length === 0) {
                // if no users, prompt to add a user
                setOpenEditUser(() => redirect);
            }
            else if (users.length === 1) {
                // if only one user, select them automatically
                redirect(users[0].id, users[0].email);
            }
            else {
                // if multiple users, prompt to select one
                setOpenSelectUser(() => redirect);
            }
        }
    }

    function startCreateAccount() {
        const redirect = (_userID: string, _userEmail: string) => setOpenEditAccount({} as BankAccount);
        if (users === null || users.length === 0) {
            // if no users, prompt to add a user
            setOpenEditUser(() => redirect);
        }
        else {
            // user selection handled by panel
            redirect('', '');
        }
    }

    // refs for SegmentedControl segments
    const segmentRefs: RefObject<HTMLDivElement>[] = [
        useRef<HTMLDivElement>(null),
        useRef<HTMLDivElement>(null),
        useRef<HTMLDivElement>(null),
        useRef<HTMLDivElement>(null),
    ];

    // ref for the SegmentedControl container
    const controlRef = useRef<HTMLDivElement>(null);

    const footend = (
        <div className='column footend mini'>
            <span>Powered by</span>
            <div className='row'>
                <img
                    className='providerLogo clickable'
                    src='./TrueLayer/TrueLayerLogo/TrueLayer-LOGO-charcoal-transp-horizontal.svg'
                    alt='TrueLayer'
                    onClick={() => openInBrowser('https://truelayer.com')}
                />
                <div className='verticalSeparator' />
                <img
                    className='providerLogo clickable'
                    src='./Finance/OpenBanking-Logo.svg'
                    alt='Open Banking'
                    onClick={() => openInBrowser('https://www.openbanking.org.uk')}
                />
            </div>
        </div>
    );

    return (
        <div
            id='app'
            style={{
                marginTop: isMobile() ? '2.8rem' : 0,
            }}
        >

            {/* USER SELECTION MODAL */}
            <ResponsiveModal title='Whose bank do you want to link with?'
                open={openSelectUser !== null}
                onClose={() => setOpenSelectUser(null)}
                forceMode='bottomSheet'
            >
                <div className='userSelection column'>

                    <img className='centre'
                        src='./BagelSorting.png'
                        alt='Bagel Sorting'
                    />
                    <p>
                        Bagel will neatly organise any accounts and cards from this connection under
                        the selected profile — which drawer of his little filing cabinet should he use?
                    </p>

                    <div className='column'>
                        <div className='row'>
                            {users &&
                                users.map(user => (
                                    <button key={user.id}
                                        className='column'
                                        onClick={() => {
                                            if (openSelectUser) {
                                                openSelectUser(user.id, user.email); // call the redirect function
                                            }
                                            setOpenSelectUser(null); // close modal
                                        }}
                                        style={{ minWidth: '120px' }}
                                    >
                                        <img
                                            className='userIcon'
                                            src={user.icon}
                                            alt={user.name}
                                            style={{ width: '32px', height: '32px' }}
                                        />
                                        <span>{user.name}</span>
                                    </button>
                                ))
                            }
                            {/* <button onClick={createNewProfile}>+ Add someone new</button> */}
                        </div>
                        <p className='small centre'><i>This is for display purposes only, and does not impact authentication.</i></p>

                        <ResponsiveModal.SheetOnly>
                            {footend}
                        </ResponsiveModal.SheetOnly>

                    </div>
                </div>
            </ResponsiveModal>

            {/* USER CREATION MODAL */}
            <ResponsiveModal title={selectedUser === null ? 'Add a new profile' : 'Edit profile'}
                open={openEditUser !== null}
                onClose={() => {
                    setOpenEditUser(null);
                    setSelectedUser(null);
                }}
                forceMode='centreModal'
            >
                <UserEditPanel
                    user={selectedUser}
                    updateOrAddUser={Engine.get().updateOrAddUser}
                    deleteUser={Engine.get().deleteUser}
                    onClose={openEditUser}
                    close={() => {
                        setOpenEditUser(null);
                        setSelectedUser(null);
                    }}
                    existingUsers={users}
                />
            </ResponsiveModal>

            {/* ACCOUNT CREATION MODAL */}
            <ResponsiveModal title={openEditAccount?.id ? (openEditAccount?.source === 'Bagel' ? 'Edit manual account' : 'Patch TrueLayer account') : 'Create a manual account'}
                open={openEditAccount !== null}
                onClose={() => {
                    setOpenEditAccount(null);
                }}
                forceMode='centreModal'
            >
                <AccountEditPanel
                    account={openEditAccount}
                    updateOrAddAccount={Engine.get().updateOrAddAccount}
                    deleteAccount={Engine.get().deleteOfflineAccount}
                    archiveAccount={Engine.get().archiveAccount}
                    close={() => setOpenEditAccount(null)}
                    existingAccounts={accounts}
                    users={users || []}
                    providers={providers}
                />
            </ResponsiveModal>

            {/* WALLET MODAL */}
            <ResponsiveModal title='Your Open Banking Credentials'
                open={openWallet}
                onClose={() => {
                    setOpenWallet(false);
                }}
                forceMode='centreModal'
            >
                <div className='column'>

                    {walletEntries.length > 0 ? (
                        <div className='column'>
                            {
                                walletEntries.map((walletEntry: WalletEntry) =>
                                    <WalletEntryCard
                                        walletEntry={walletEntry}
                                        users={users}
                                        providers={providers}
                                    />
                                )
                            }
                            <span>
                                To revoke access, please visit the '<strong>Open Banking</strong>' section of your bank's app or website.
                            </span>

                        </div>
                    ) : (
                        <div className='column'>
                            <span>You don't have any accounts.</span>
                        </div>
                    )
                    }
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
                    {footend}
                </div>
            </ResponsiveModal>

            <div className='header'>

                {!isTauri && !isInIframe() &&
                    <div className='banner'>
                        <p>
                            You are running a browser version of the app. This only supports a limited demo mode, and does not support access to any real accounts.
                            Nothing will be saved, and no real data can be fetched from any banks.
                        </p>
                        <p className='small'>
                            Please refer
                            to <a href='https://github.com/Razzula/martyn-llewelyn'>https://github.com/Razzula/martyn-llewelyn</a> for
                            more information.
                        </p>
                    </div>
                }

                <div className='headerGrid'>

                    {/* USER BUTTONS */}
                    <div className='headerLeft'>
                        <div className='userRow'>
                            {users &&
                                users.map((user, index) => (
                                    <Tooltip key={user.id}>
                                        <TooltipTrigger>
                                            <button
                                                key={index}
                                                className='userButton'
                                                onClick={() => {
                                                    setOpenEditUser(() => { });
                                                    setSelectedUser(user);
                                                }}
                                            >
                                                {user.icon ?
                                                    <img
                                                        className='userIcon'
                                                        src={user.icon}
                                                        alt={user.name}
                                                        style={{ width: '32px', height: '32px' }}
                                                    /> : <span>{user.name.charAt(0).toUpperCase()}</span>
                                                }
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {user.name}
                                        </TooltipContent>
                                    </Tooltip>
                                ))
                            }

                            <Tooltip>
                                <TooltipTrigger>
                                    <button
                                        className={users && users.length > 0 ? 'userButton' : ''}
                                        onClick={() => setOpenEditUser(() => { })}
                                    >
                                        {users && users.length > 0 ? '+' : 'Setup Profile'}
                                    </button>
                                </TooltipTrigger>
                                {users && users.length > 0 &&
                                    <TooltipContent>
                                        Create new profile
                                    </TooltipContent>
                                }
                            </Tooltip>
                        </div>

                        <Tooltip>
                            <TooltipTrigger>
                                <button
                                    className={users && users.length > 0 ? 'userButton' : ''}
                                    onClick={() => setOpenWallet(true)}
                                >
                                    <Wallet />
                                </button>
                            </TooltipTrigger>
                            {users && users.length > 0 &&
                                <TooltipContent>
                                    Credentials Wallet
                                </TooltipContent>
                            }
                        </Tooltip>
                    </div>

                    {/* BAGEL ICON */}
                    <div className='headerCentre'>
                        {accountsLoadState === ResponseState.ERROR &&
                            <div className='column'>
                                <img
                                    src='./ConfusedBagel-alt.png'
                                    alt='Master Bagel is confused...'
                                    style={{ width: '100px', height: '100px' }}
                                />
                                <h4>An error occurred!</h4>
                            </div>
                        }
                        {accountsLoadState === ResponseState.LOADING &&
                            <div className='column'>
                                <img
                                    src='./ConfusedBagel-alt.png'
                                    alt='Master Bagel is confused...'
                                    style={{ width: '100px', height: '100px' }}
                                />
                                <h4>Loading...</h4>
                                <Spinner useOverlay />
                            </div>
                        }
                        {accountsLoadState === ResponseState.SUCCESS &&
                            <div className='column'>
                                <div
                                    className='floatBubble'
                                    style={{
                                        paddingTop: isMobile() ? '-10px' : 0,
                                    }}
                                >
                                    <WiggleWrapper
                                        balloonMs={2000}
                                        balloonElement={<img src='./Serenity/Heart.png' alt='❤️' style={{ width: '50px', height: '50px' }} />}
                                    >
                                        <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                                            <img
                                                className={`hat ${appSettings.global.modesty ? 'lowered' : ''}`}
                                                src='./MasterBagel-Hat.png'
                                                alt='Master Bagel'
                                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                                            />
                                            <img
                                                src='./MasterBagel-Body.png'
                                                alt='Master Bagel'
                                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                                            />
                                        </div>
                                    </WiggleWrapper>
                                </div>
                                {/* <h4>Your Accounts</h4> */}
                            </div>
                        }
                        {accountsLoadState === null &&
                            <div className='column'>
                                <img
                                    src='./ConfusedBagel.png'
                                    alt='Master Bagel is confused...'
                                    style={{ width: '100px', height: '100px' }}
                                />
                            </div>
                        }
                    </div>

                    {/* WINDOW CONTROLS */}
                    <div className='headerRight'>
                        {/* MODESTY */}
                        <Tooltip placement='left'>
                            <TooltipTrigger>
                                <div>
                                    <ToggleSwitch
                                        isOn={!appSettings.global.modesty}
                                        handleToggle={() => setAppSettings(prev => ({
                                            ...prev,
                                            global: {
                                                ...prev.global,
                                                modesty: !prev.global.modesty,
                                            },
                                        }))}
                                        iconOn={<VisibilityIcon />}
                                        iconOnColour='#ea4335'
                                        iconOff={<VisibilityOffIcon />}
                                    />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                {appSettings.global.modesty ? 'Show balances' : 'Hide balances'}
                            </TooltipContent>
                        </Tooltip>

                        {/* ACCOUNTS WINDOW SETTINGS */}
                        {panel === 'accounts' &&
                            <div className='flipRow'>
                                {/* Order Accounts */}
                                <RadioButtons
                                    options={[
                                        { key: 'balance', desc: 'Sort by Balance', icon: <MoneyBag /> },
                                        { key: 'name', desc: 'Sort by Name', icon: <Alpha /> },
                                    ]}
                                    selected={appSettings.accounts.sortBy}
                                    setSelected={(key: string) => setAppSettings(prev => ({
                                        ...prev,
                                        accounts: {
                                            ...prev.accounts,
                                            sortBy: key as AppSettings['accounts']['sortBy']
                                        },
                                    }))}
                                    tooltipPlacement='bottom'
                                    iconOnColour='green'
                                    iconOffColour='#e3e3e3'
                                />
                                {!isMobile() && <div className='verticalSeparator' />}
                                <ToggleButton
                                    options={[
                                        { key: 'asc', desc: 'Ascending', icon: <Ascending />, iconColour: 'green' },
                                        { key: 'desc', desc: 'Descending', icon: <Descending />, iconColour: 'red' },
                                    ]}
                                    selected={appSettings.accounts.sortOrder}
                                    setSelected={(key: string) => setAppSettings(prev => ({
                                        ...prev,
                                        accounts: {
                                            ...prev.accounts,
                                            sortOrder: key as AppSettings['accounts']['sortOrder']
                                        },
                                    }))}
                                    tooltipPlacement='bottom'
                                />
                            </div>
                        }
                        {panel === 'accounts' &&

                            <div>
                                <RadioButtons
                                    options={[
                                        {
                                            key: 'bank',
                                            desc: `${appSettings.accounts.groupBy === 'bank' ? 'Grouped' : 'Group'} by Provider`,
                                            icon: <Bank />,
                                        },
                                        {
                                            key: 'user',
                                            desc: `${appSettings.accounts.groupBy === 'user' ? 'Grouped' : 'Group'} by User`,
                                            icon: <Users />,
                                        },
                                        {
                                            key: 'type',
                                            desc: `${appSettings.accounts.groupBy === 'bank' ? 'Grouped' : 'Group'} by Type`,
                                            icon: <Category />,
                                        },
                                    ]}
                                    selected={appSettings.accounts.groupBy}
                                    setSelected={(key: string) => setAppSettings(prev => ({
                                        ...prev,
                                        accounts: {
                                            ...prev.accounts,
                                            groupBy: (prev.accounts.groupBy === key ? undefined : key) as AppSettings['accounts']['groupBy']
                                        },
                                    }))}
                                    tooltipPlacement='bottom'
                                    iconOnColour='green'
                                    iconOffColour='#e3e3e3'
                                />
                            </div>
                        }
                        {panel === 'accounts' &&
                            <div>
                                <ToggleButton
                                    options={[
                                        { key: 'vis', desc: 'Archives Shown', icon: <Archive />, iconColour: 'green' },
                                        { key: 'hid', desc: 'Archives Hidden', icon: <Archive />, iconColour: 'red' },
                                    ]}
                                    selected={appSettings.accounts.archiveVisibility}
                                    setSelected={(key: string) => setAppSettings(prev => ({
                                        ...prev,
                                        accounts: {
                                            ...prev.accounts,
                                            archiveVisibility: key as AppSettings['accounts']['archiveVisibility']
                                        },
                                    }))}
                                    tooltipPlacement='bottom'
                                />
                            </div>
                        }

                        {panel === 'transactions' && !isMobile() &&
                            <RadioButtons
                                options={[
                                    {
                                        key: 'list',
                                        desc: 'List View',
                                        icon: <List />,
                                    },
                                    {
                                        key: 'grid',
                                        desc: 'Grid View',
                                        icon: <GridView />,
                                    },
                                    {
                                        key: 'waterfall',
                                        desc: 'Waterfall View',
                                        icon: <Waterfall />,
                                    },
                                ]}
                                selected={appSettings.transactions.displayAs}
                                setSelected={(key: string) => setAppSettings(prev => ({
                                    ...prev,
                                    transactions: {
                                        ...prev.transactions,
                                        displayAs: key as AppSettings['transactions']['displayAs']
                                    },
                                }))}
                                tooltipPlacement='bottom'
                                iconOnColour='green'
                                iconOffColour='#e3e3e3'
                            />
                        }

                    </div>

                    {/* PRIMARY CONTROLS */}
                    <div className='headerControls'>
                        <SegmentedControl
                            name='primaryGroup'
                            callback={(val: string) => setPanel(val as 'accounts' | 'transactions')}
                            controlRef={controlRef}
                            segments={[
                                {
                                    label: 'Dashboard',
                                    value: 'dashboard',
                                    ref: segmentRefs[0]
                                },
                                {
                                    label: 'Accounts',
                                    value: 'accounts',
                                    ref: segmentRefs[1]
                                },
                                {
                                    label: 'Transactions',
                                    value: 'transactions',
                                    ref: segmentRefs[2]
                                },
                                // {
                                //     label: 'Standing',
                                //     value: 'standing',
                                //     ref: segmentRefs[3]
                                // },
                            ]}
                        />
                    </div>

                </div>
            </div>

            <div className='body'>
                {panel === 'dashboard' &&
                    <DashboardPanel
                        accounts={accounts}
                        modesty={appSettings.global.modesty}
                    // categoryStats={categoryStats}
                    // channelStats={channelStats}
                    />
                }
                {panel === 'accounts' &&
                    <AccountsPanel
                        accounts={accounts}
                        users={users}
                        providers={providers}
                        walletEntries={walletEntries}
                        modesty={appSettings.global.modesty}
                        windowSettings={appSettings.accounts}
                        setOpenEditAccount={setOpenEditAccount}
                        startLinkAccount={startLinkAccount}
                        startCreateAccount={startCreateAccount}
                        footend={footend}
                    />
                }
                {panel === 'transactions' &&
                    <TransactionsPanel
                        transactionsTree={transactionsTree.getTree()}
                        accounts={accounts}
                        users={users}
                        providers={providers}
                        walletEntries={walletEntries}
                        modesty={appSettings.global.modesty}
                        windowSettings={appSettings.transactions}
                        footend={footend}
                        updateAccountsTransactions={Engine.get().updateAccountsTransactions}
                        transactionsLoadedRange={transactionsLoadedRange} setTransactionsLoadedRange={transactionsLoadedRangeStore.set}
                    />
                }
                {panel === 'standing' &&
                    <div>UNDER CONSTRUCTION...</div>
                }
            </div>
        </div>
    );
}

export default App;
