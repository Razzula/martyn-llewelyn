import { useEffect, useState } from "react";

import { BankAccount, BankAccountType, CardNetwork, InstrumentType, InterestType, User } from "../types/Bagel";
import { TrueLayerProvider } from "../types/TrueLayer";
import { Tooltip, TooltipContent, TooltipTrigger } from "./common/Tooltip";
import Select from "./common/Select";
import { asSortCode, getCurrencySymbol, getCurrencySymbolFromCountry } from "../utils/finance";
import { emptyBankAccount } from "../data/stubs";
import { fromTrueLayerCardNetwork } from "../types/TrueLayerAdapters";
import { validateAccount } from "../utils/accounts";

type AccountEditPanelProps = {
    account: BankAccount | null;
    updateOrAddAccount: (newAccount: BankAccount) => void;
    deleteAccount: (accountID: string) => void;
    archiveAccount: (accountID: string) => void;
    close: () => void;
    existingAccounts?: Record<string, BankAccount> | null;
    users?: User[];
    providers?: Record<string, TrueLayerProvider>;
};

function AccountEditPanel({
    account,
    updateOrAddAccount,
    deleteAccount,
    archiveAccount,
    close,
    existingAccounts,
    users,
    providers,
}: AccountEditPanelProps) {

    const [ephemeralAccount, setEphemeralAccount] = useState<BankAccount>(constructAccount());
    const [selectedProvider, setSelectedProvider] = useState<TrueLayerProvider | null>(null);
    const [accountErrors, setAccountErrors] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setEphemeralAccount(constructAccount());
    }, [account]);

    useEffect(() => {
        const provider = providers?.[ephemeralAccount.provider.id] || null;
        setSelectedProvider(provider);
        if (provider) {
            const currency = getCurrencySymbolFromCountry(provider.country);
            setEphemeralAccount(prev => ({
                ...prev,
                nationalCurrency: currency ?? prev.nationalCurrency,
                balance: {
                    ...prev.balance,
                    currency: currency ?? undefined,
                },
            }));
        }
    }, [ephemeralAccount.provider]);

    useEffect(() => {
        setAccountErrors(validateAccount(ephemeralAccount, selectedProvider, existingAccounts));
    }, [ephemeralAccount, existingAccounts]);

    function constructAccount(): BankAccount {
        return {
            ...emptyBankAccount,
            ...account,
            id: account?.id || crypto.randomUUID(),
        };
    }

    const isAccountOnline = ephemeralAccount?.source === 'TrueLayer';
    const isAccountCached = ephemeralAccount?.source === 'TrueLayer.cache';
    const isAccountExternal = isAccountOnline || isAccountCached;
    const isAccount = ephemeralAccount?.instrumentType === InstrumentType.ACCOUNT;
    const isBankCard = ephemeralAccount?.instrumentType === InstrumentType.CARD;
    const isCard = isBankCard || ephemeralAccount?.instrumentType === InstrumentType.GIFTCARD;

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
                            src={
                                provider.accountLogo
                                || provider.logo_url
                                || './Serenity/unknown.png'
                            }
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

            {isAccountExternal &&
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
                    borderBottom: accountErrors?.invalidUsers ? '2px solid #ff0000' : 'none',
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
                                        providers?.[ephemeralAccount?.provider?.id]?.accountLogo
                                        || providers?.[ephemeralAccount?.provider?.id]?.logo_url
                                        || './Serenity/unknown.png'
                                    }
                                />
                            }
                            disabled={isAccountExternal}
                            mode={providerList.length <= 10 ? 'list' : 'grid'}
                        />
                    </TooltipTrigger>
                    <TooltipContent>{providers?.[ephemeralAccount?.provider?.id]?.display_name || 'Unknown Provider'}</TooltipContent>
                </Tooltip>
                <input
                    className={`centre ${accountErrors?.invalidName ? 'invalid' : ''}`}
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
                    className={accountErrors?.invalidType ? 'invalid' : ''}
                    entries={Object.values(BankAccountType).map((name) => ({
                        key: name, name, element:
                        <span>{name.charAt(0).toUpperCase() + name.slice(1)}</span>
                    }))}
                    forcedIndex={ephemeralAccount?.type ? Object.values(BankAccountType).indexOf(ephemeralAccount.type) : -1}
                    setSelected={(key) => setEphemeralAccount({ ...ephemeralAccount, type: key as BankAccountType })}
                    emptyText='Select Type'
                    disabled={isAccountExternal}
                />
                <Select
                    className={accountErrors?.invalidType ? 'invalid' : ''}
                    entries={Object.values(InstrumentType).map((name) => ({
                        key: name, name, element:
                            <span>{name.charAt(0).toUpperCase() + name.slice(1)}</span>
                    }))}
                    forcedIndex={ephemeralAccount?.type ? Object.values(InstrumentType).indexOf(ephemeralAccount.instrumentType) : -1}
                    setSelected={(key) => setEphemeralAccount({ ...ephemeralAccount, instrumentType: key as InstrumentType })}
                    emptyText='Select Type'
                    disabled={isAccountExternal}
                />
            </div>

            <div className='row'>
                { isBankCard && 
                    <>
                        <Select
                            className={accountErrors?.invalidCardNetwork ? 'invalid' : ''}
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
                            disabled={isAccountExternal}
                        />
                    </>
                }

                <div className='ghostInputWrapper'>
                    { isBankCard &&
                        <span className='ghostPrefix'>{cardPrefix}*** **** **** </span>
                    }
                    <input
                        className={`centre ${isBankCard ? 'ghostInput' : ''} ${accountErrors?.invalidAccountNumber ? 'invalid' : ''}`}
                        type='text'
                        placeholder={`${isCard ? 'Card' : 'Account Number'}`}
                        value={ephemeralAccount?.number?.accountNumber}
                        onChange={(e) => setEphemeralAccount({ ...ephemeralAccount, number: { ...ephemeralAccount.number, accountNumber: e.target.value } })}
                        disabled={isAccountExternal}
                    />
                </div>

                { !isCard &&
                    <input
                        className={`centre ${accountErrors?.invalidBankNumber ? 'invalid' : ''}`}
                        type='text'
                        placeholder={isAccount ? 'Sort Code' : 'Group ID'}
                        value={ephemeralAccount?.number?.bankNumber}
                        onChange={(e) => setEphemeralAccount({ ...ephemeralAccount, number: { ...ephemeralAccount.number, bankNumber: isAccount ? asSortCode(e.target.value) : e.target.value } })}
                        disabled={isAccountExternal}
                    />
                }
            </div>

            { !isAccountOnline &&
                <div className='row'>
                    { ephemeralAccount?.balance?.currency
                        ? <span>{getCurrencySymbol(ephemeralAccount?.balance?.currency)}</span>
                        : <span>{getCurrencySymbol(ephemeralAccount?.nationalCurrency)}</span>
                    }
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
                                currency: ephemeralAccount?.balance?.currency,
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
                            className={`centre ${accountErrors?.invalidInterestRate ? 'invalid' : ''}`}
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
                                    className={accountErrors?.invalidInterestType ? 'invalid' : ''}
                                    entries={Object.values(InterestType).map((name) => ({
                                        key: name, name, element:
                                            <span>{name.charAt(0).toUpperCase() + name.slice(1)}</span>
                                    }))}
                                    forcedIndex={ephemeralAccount?.interest?.type ? Object.values(InterestType).indexOf(ephemeralAccount.interest.type) : -1}
                                    setSelected={(key) => setEphemeralAccount({ ...ephemeralAccount, interest: { ...ephemeralAccount.interest, type: key as InterestType } })}
                                    emptyText='Interest Type'
                                />

                                {/* INTEREST INTERVAL */}
                                <input
                                    className={`centre ${accountErrors?.invalidInterestInterval ? 'invalid' : ''}`}
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
                                    className={`centre ${accountErrors?.invalidInterestDate ? 'invalid' : ''}`}
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
                    disabled={accountErrors?.invalidForm}
                >
                    {account?.id ? 'Update' : 'Add'}
                </button>
                {account?.id && account?.source !== 'TrueLayer' && (
                    <button
                        className={`centre ${account?.archived ? '' : 'threat'}`}
                        onClick={() => {
                            archiveAccount(account.id);
                            close();
                        }}
                    >
                        {account?.archived ? 'Restore' : 'Archive'}
                    </button>
                )}
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
