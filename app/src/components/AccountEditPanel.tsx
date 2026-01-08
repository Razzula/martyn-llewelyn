import { useEffect, useState } from "react";

import { BankAccount, BankAccountType, CardNetwork, InstrumentType, InterestType, User } from "../types/Bagel";
import { TrueLayerProvider } from "../types/TrueLayer";
import { Tooltip, TooltipContent, TooltipTrigger } from "./common/Tooltip";
import Select from "./common/Select";
import { asSortCode } from "../utils/finance";
import { emptyBankAccount } from "../data/stubs";
import { fromTrueLayerCardNetwork } from "../types/TrueLayerAdapters";

type AccountEditPanelProps = {
    account: BankAccount | null;
    updateOrAddAccount: (newAccount: BankAccount) => void;
    deleteAccount: (accountID: string) => void;
    close: () => void;
    existingAccounts?: Record<string, BankAccount> | null;
    users?: User[];
    providers?: Record<string, TrueLayerProvider>;
};

function AccountEditPanel({
    account,
    updateOrAddAccount,
    deleteAccount,
    close,
    existingAccounts,
    users,
    providers,
}: AccountEditPanelProps) {

    const [ephemeralAccount, setEphemeralAccount] = useState<BankAccount>(constructAccount());

    useEffect(() => {
        setEphemeralAccount(constructAccount());
    }, [account]);

    function constructAccount(): BankAccount {
        return {
            ...emptyBankAccount,
            ...account,
            id: account?.id || crypto.randomUUID(),
        };
    }

    const isAccountOnline = ephemeralAccount?.source === 'TrueLayer';
    const isAccount = ephemeralAccount?.instrumentType === InstrumentType.ACCOUNT;
    const isBankCard = ephemeralAccount?.instrumentType === InstrumentType.CARD;
    const isCard = isBankCard || ephemeralAccount?.instrumentType === InstrumentType.GIFTCARD;

    const invalidUsers = (
        // non-null
        ephemeralAccount?.users?.length === 0
    );
    const invalidName = (
        // non-null
        ephemeralAccount?.name?.trim() === ''
    );
    const invalidIntrumentType = (
        // non-null
        ephemeralAccount?.instrumentType === undefined
        || ephemeralAccount?.instrumentType.trim() === ''
    );
    const invalidType = (
        // non-null
        ephemeralAccount?.type === undefined
        || ephemeralAccount?.type.trim() === ''
    );
    const invalidNumber = (
        // non-null
        ephemeralAccount?.number?.number?.trim() === ''
        // unique
        || (existingAccounts && Object.values(existingAccounts).some(existingAccount =>
            existingAccount.id !== ephemeralAccount.id
            && existingAccount.number?.number === ephemeralAccount.number?.number
        ))
        // format
        || ( isBankCard ?
            !/^\d{4}$/.test(ephemeralAccount?.number?.number || '')
            : !/^\d{8,10}$/.test(ephemeralAccount?.number?.number || '')
        )
    );
    const invalidSortCode = !isCard && (
        // non-null
        ephemeralAccount?.number?.sortCode === undefined
        || ephemeralAccount?.number?.sortCode?.trim() === ''
        // format
        || ( isAccount &&
            !/^\d{2}-\d{2}-\d{2}$/.test(ephemeralAccount?.number?.sortCode || '')
        )
    );
    const invalidCardNetwork = isBankCard && (
        // non-null
        ephemeralAccount?.cardNetwork === undefined
        || ephemeralAccount?.cardNetwork.trim() === ''
    );

    const invalidInterestRate = (
        // if not empty, must be a number between 0 and 100
        ephemeralAccount?.interest?.rate === undefined
        || ephemeralAccount?.interest?.rate === null
        || isNaN(ephemeralAccount.interest?.rate)
        || ephemeralAccount.interest?.rate < 0
        || ephemeralAccount.interest?.rate > 10
    );
    const invalidInterestType = (
        ephemeralAccount?.interest?.type === undefined
        || ephemeralAccount?.interest?.type?.trim() === ''
    );
    const invalidInterestInterval = (
        ephemeralAccount?.interest?.interval === undefined
        || ephemeralAccount?.interest?.interval === null
        || isNaN(ephemeralAccount.interest?.interval)
        || ephemeralAccount.interest?.interval < 0
    );
    const invalidInterestDate = (
        ephemeralAccount?.interest?.lastApplied === undefined
        || ephemeralAccount?.interest?.lastApplied === null
        || isNaN(Date.parse(ephemeralAccount.interest?.lastApplied))
        // cannot be in the future
        || new Date(ephemeralAccount.interest?.lastApplied) > new Date()
    );
    const invalidInterest = (
        invalidInterestRate
        || (!invalidInterestRate && (ephemeralAccount?.interest?.rate !== undefined && ephemeralAccount?.interest?.rate > 0)
            // only validate if we care about interest
            && (invalidInterestType || invalidInterestInterval || invalidInterestDate)
        )
    )

    const invalidForm = (
        invalidUsers || invalidName || invalidIntrumentType || invalidType || invalidNumber || invalidSortCode || invalidCardNetwork
        || isAccount && (invalidInterest)
    );


    const providerList = Object.entries(providers ?? []);
    const providerEntries = (providerList.map(([id, provider]) => ({
        key: id,
        name: provider.display_name,
        element: (
            <Tooltip>
                <TooltipTrigger>
                    <div className='row'>
                        <img
                            className='bankLogoLarge'
                            src={provider.logo_url || './Serenity/unknown.png'}
                            alt={provider.display_name || id}
                        />
                        {providerList.length < 10 &&
                            <span>{provider.display_name || id}</span>
                        }
                    </div>
                </TooltipTrigger>
                <TooltipContent>{provider.display_name}</TooltipContent>
            </Tooltip>
        )
    })));
    const selectedBankProviderIndex = providers ? Object.keys(providers).indexOf(ephemeralAccount?.provider?.id || '') : -1;

    const selectedCardNetworkIndex = isBankCard ? Object.keys(CardNetwork).findIndex(key => key === ephemeralAccount?.cardNetwork) : -1;
    const selectedCardNetwork = isBankCard ? Object.values(CardNetwork)[selectedCardNetworkIndex] : null;
    const cardPrefix = selectedCardNetwork ? (selectedCardNetwork.name === CardNetwork.VISA.name ? '4' : '5') : '*';

    return (
        <div className='column'>

            {isAccountOnline &&
                <div className='small'>
                    <p>
                        This account is served directly by your bank.
                        Some details can be edited, but doing so will only affect what Bagel displays:
                        <b> no changes are made to your bank account.</b>
                    </p>
                </div>
            }

            {/* INPUTS */}
            <div className='row'
                style={{
                    borderBottom: invalidUsers ? '2px solid #ff0000' : 'none',
                    marginBottom: '-2px',
                    zIndex: 1,
                }}
            >
                {/* User(s) */}
                {
                    users && users.length > 0 ? (
                        users.map((user, index) => {
                            const isSelected = ephemeralAccount?.users?.find(u => u.id === user.id);

                            return (
                                <Tooltip key={user.id}>
                                    <TooltipTrigger>
                                        <img className={`userIcon clickable ${!isSelected ? 'unselected' : ''}`}
                                            key={index}
                                            src={user.icon}
                                            alt={user.name}
                                            onClick={() => {
                                                setEphemeralAccount(prev => {
                                                    const userSignatures = [...(prev.users || [])];
                                                    const userIndex = userSignatures.findIndex(u => u.id === user.id);
                                                    if (userIndex !== -1) {
                                                        // remove user
                                                        userSignatures.splice(userIndex, 1);
                                                    }
                                                    else {
                                                        // add user
                                                        userSignatures.push({ id: user.id, walletToken: '' });
                                                    }
                                                    return { ...prev, users: userSignatures };
                                                });
                                            }}
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {user.name}
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })
                    ) : (
                        <span className='centre'>No users found</span>
                    )
                }
            </div>

            <div className='formRow' style={{ display: 'flex', alignItems: 'stretch' }}>
                <Tooltip>
                    <TooltipTrigger>
                        <Select
                            entries={providerEntries}
                            setSelected={(key) => setEphemeralAccount(prev => ({
                                ...prev,
                                provider: {
                                    id: key,
                                }
                            }))}
                            forcedIndex={selectedBankProviderIndex}
                            icon={
                                <img
                                    src={
                                        providers?.[ephemeralAccount?.provider?.id]?.logo_url || './Serenity/unknown.png'
                                    }
                                />
                            }
                            disabled={isAccountOnline}
                            mode={providerList.length <= 10 ? 'list' : 'grid'}
                        />
                    </TooltipTrigger>
                    <TooltipContent>{providers?.[ephemeralAccount?.provider?.id]?.display_name || 'Unknown Provider'}</TooltipContent>
                </Tooltip>
                <input
                    className={`centre ${invalidName ? 'invalid' : ''}`}
                    type='text'
                    placeholder='Account Name'
                    value={ephemeralAccount?.name}
                    onChange={(e) => setEphemeralAccount({ ...ephemeralAccount, name: e.target.value })}
                    autoFocus
                    style={{
                        flex: 1,
                    }}
                />
                <Select
                    className={invalidType ? 'invalid' : ''}
                    entries={Object.values(BankAccountType).map((name) => ({
                        key: name, name, element:
                        <span>{name.charAt(0).toUpperCase() + name.slice(1)}</span>
                    }))}
                    forcedIndex={ephemeralAccount?.type ? Object.values(BankAccountType).indexOf(ephemeralAccount.type) : -1}
                    setSelected={(key) => setEphemeralAccount({ ...ephemeralAccount, type: key as BankAccountType })}
                    emptyText='Select Type'
                    disabled={isAccountOnline}
                />
                <Select
                    className={invalidType ? 'invalid' : ''}
                    entries={Object.values(InstrumentType).map((name) => ({
                        key: name, name, element:
                            <span>{name.charAt(0).toUpperCase() + name.slice(1)}</span>
                    }))}
                    forcedIndex={ephemeralAccount?.type ? Object.values(InstrumentType).indexOf(ephemeralAccount.instrumentType) : -1}
                    setSelected={(key) => setEphemeralAccount({ ...ephemeralAccount, instrumentType: key as InstrumentType })}
                    emptyText='Select Type'
                    disabled={isAccountOnline}
                />
            </div>

            <div className='row'>
                { isBankCard && 
                    <>
                        <Select
                            className={invalidCardNetwork ? 'invalid' : ''}
                            entries={Object.entries(CardNetwork).map(([key, network]) => ({
                                key,
                                name: network.name,
                                element:
                                    <span>
                                        <img
                                            src={network.logo}
                                            alt={network.name}
                                            style={{ width: '1.5rem', height: '1.5rem', marginRight: '0.5rem' }}
                                        />
                                        <span style={{ textTransform: 'capitalize' }}>
                                            {network.name}
                                        </span>
                                    </span>
                            }))}
                            forcedIndex={selectedCardNetworkIndex}
                            icon={
                                selectedCardNetwork?.logo
                                ? <img src={selectedCardNetwork?.logo} alt={selectedCardNetwork?.name} />
                                : undefined
                            }
                            setSelected={(key) => setEphemeralAccount({ ...ephemeralAccount, cardNetwork: fromTrueLayerCardNetwork(key) })}
                            emptyText='Card Network'
                            disabled={isAccountOnline}
                        />
                    </>
                }

                <div className='ghostInputWrapper'>
                    { isBankCard &&
                        <span className='ghostPrefix'>{cardPrefix}*** **** **** </span>
                    }
                    <input
                        className={`centre ${isBankCard ? 'ghostInput' : ''} ${invalidNumber ? 'invalid' : ''}`}
                        type='text'
                        placeholder={`${isCard ? 'Card' : 'Account Number'}`}
                        value={ephemeralAccount?.number?.number}
                        onChange={(e) => setEphemeralAccount({ ...ephemeralAccount, number: { ...ephemeralAccount.number, number: e.target.value } })}
                        disabled={isAccountOnline}
                    />
                </div>

                { !isCard &&
                    <input
                        className={`centre ${invalidSortCode ? 'invalid' : ''}`}
                        type='text'
                        placeholder={isAccount ? 'Sort Code' : 'Group ID'}
                        value={ephemeralAccount?.number?.sortCode}
                        onChange={(e) => setEphemeralAccount({ ...ephemeralAccount, number: { ...ephemeralAccount.number, sortCode: isAccount ? asSortCode(e.target.value) : e.target.value } })}
                        disabled={isAccountOnline}
                    />
                }
            </div>

            { !isAccountOnline &&
                <div className='row'>
                    <span>£</span>
                    <input
                        className='centre'
                        type='number'
                        placeholder='Balance'
                        value={ephemeralAccount?.balance?.current || 0}
                        onChange={(e) => setEphemeralAccount({
                            ...ephemeralAccount,
                            balance: {
                                ...ephemeralAccount.balance,
                                current: parseFloat(e.target.value) || 0,
                                available: parseFloat(e.target.value) || 0,
                                currency: 'GBP',
                                updateTimestamp: new Date().toISOString(),
                            }
                        })}
                        disabled={isAccountOnline}
                    />
                </div>
            }

            {/* INTEREST */}
            { !isCard &&
                <>
                    <div style={{ width: '100%' }}>
                        <hr />
                        <h4>Interest</h4>
                    </div>

                    {/* INTEREST RATE */}
                    <div className='row'>
                        <input
                            className={`centre ${invalidInterestRate ? 'invalid' : ''}`}
                            type='number'
                            placeholder='Interest Rate'
                            value={ephemeralAccount?.interest?.rate}
                            onChange={(e) => setEphemeralAccount({
                                ...ephemeralAccount,
                                interest: {
                                    ...ephemeralAccount.interest,
                                    rate: parseFloat(e.target.value) || 0,
                                },
                            })}
                            style={{
                                flex: 1,
                            }}
                        />
                        <span>% (gross rate p.a.)</span>
                    </div>

                    { ephemeralAccount?.interest?.rate !== undefined && ephemeralAccount?.interest?.rate > 0 &&
                        <>
                            <div className='row'>
                                {/* INTEREST TYPE */}
                                <Select
                                    className={invalidInterestType ? 'invalid' : ''}
                                    entries={Object.values(InterestType).map((name) => ({
                                        key: name, name, element:
                                            <span>{name.charAt(0).toUpperCase() + name.slice(1)}</span>
                                    }))}
                                    forcedIndex={ephemeralAccount?.interest?.type ? Object.values(InterestType).indexOf(ephemeralAccount.interest.type) : -1}
                                    setSelected={(key) => setEphemeralAccount({ ...ephemeralAccount, interest: { ...ephemeralAccount.interest, type: key as InterestType } })}
                                    emptyText='Interest Type'
                                    disabled={isAccountOnline}
                                />

                                {/* INTEREST INTERVAL */}
                                <input
                                    className={`centre ${invalidInterestInterval ? 'invalid' : ''}`}
                                    type='number'
                                    placeholder='Interest Interval'
                                    value={ephemeralAccount?.interest?.interval}
                                    onChange={(e) => setEphemeralAccount({
                                        ...ephemeralAccount,
                                        interest: {
                                            ...ephemeralAccount.interest,
                                            interval: parseFloat(e.target.value) || 0,
                                        },
                                    })}
                                    style={{
                                        flex: 1,
                                    }}
                                />

                                {/* INTEREST OFFSET */}
                                <input
                                    className={`centre ${invalidInterestDate ? 'invalid' : ''}`}
                                    type='date'
                                    placeholder='Last Interest Date'
                                    value={ephemeralAccount?.interest?.lastApplied}
                                    onChange={(e) => setEphemeralAccount({
                                        ...ephemeralAccount,
                                        interest: {
                                            ...ephemeralAccount.interest,
                                            lastApplied: e.target.value,
                                        },
                                    })}
                                />
                            </div>
                        </>
                    }
                </>
            }

            <div style={{ width: '100%' }}>
                <hr />
                {/* URL */}
            </div>
            <div className='row'>
                <input
                    className='centre'
                    type='text'
                    placeholder='Website URL'
                    value={ephemeralAccount?.url || ''}
                    onChange={(e) => setEphemeralAccount({ ...ephemeralAccount, url: e.target.value })}
                />
            </div>

            {/* BUTTONS */}
            <div className='row'>
                <button
                    className='centre'
                    onClick={() => {
                        updateOrAddAccount(ephemeralAccount);
                        close();
                    }}
                    disabled={invalidForm}
                >
                    {account?.id ? 'Update' : 'Add'}
                </button>
                {account?.id && (
                    <button
                        className='centre threat'
                        onClick={() => {
                            deleteAccount(account.id);
                            close();
                        }}
                    >
                        Delete
                    </button>
                )}
            </div>

        </div>
    );
}

export default AccountEditPanel;
