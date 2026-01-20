import { BankAccount, getAccountLogoSrc, InterestType, User } from "../types/Bagel";
import { openInBrowser } from "../utils/tauri";
import { Tooltip, TooltipContent, TooltipTrigger } from "./common/Tooltip";
import { TrueLayerProvider } from "../types/TrueLayer";
import { calculateAER, toFinancialString } from "../utils/finance";
import Spinner from "./common/Spinner";

import './AccountCard.css'
import '../styles/CommonCard.css'
import { getInstrumentTypeIcon } from "../utils/icons";

type AccountCardProps = {
    accountID: string;
    account: BankAccount;
    users: User[] | null;
    providers: Record<string, TrueLayerProvider>;
    modesty: boolean;
    setOpenEditAccount: (account: BankAccount) => void;
}

function AccountCard({
    accountID, account,
    users, providers,
    modesty,
    setOpenEditAccount,
}: AccountCardProps) {
    const isBankCard = account.instrumentType === 'CARD';
    const isCard = isBankCard || account.instrumentType === 'GIFTCARD';

    const balance = 'balance' in account ? account.balance : null;

    const available = (modesty ? '***' : balance?.available) ?? '???';
    const current = (modesty ? '***' : balance?.current) ?? '???';

    const displayAvailable = (balance ? toFinancialString(available, balance?.currency) : null);
    const displayBalance = (balance ? toFinancialString(current, balance?.currency) : null);

    const accountUsers = users?.filter(user => account.users?.some(u => u.id === user.id));

    const updateDate = new Date(account.updateTimestamp);
    const now = new Date();
    const diffInMinutes = (now.getTime() - updateDate.getTime()) / 60000; // in minutes
    const isRecent = diffInMinutes <= 15; // consider recent if updated within the last 15 minutes

    const accountGross = account.interest?.rate?.toFixed(2) || '0.00';
    const accountAER = calculateAER(account.interest?.rate || 0, account.interest?.interval || 12).toFixed(2);

    return (
        <div className={`accountCard ${account?.archived ? 'archived' : ''}`} key={accountID}
            style={{ position: 'relative' }}
            onClick={() => setOpenEditAccount(account)}
        >

            {/* STATUS INDICATOR */}
            <Tooltip>
                <TooltipTrigger>
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: account.source === 'TrueLayer' ? (isRecent ? '#4CAF50' : '#eea342ff') : (account.source === 'TrueLayer.cache' ? '#d96868ff' : '#dadada'),
                            margin: '0.4rem',
                            cursor: 'help',
                        }}
                    />
                </TooltipTrigger>
                <TooltipContent>
                    {(account.source === 'TrueLayer' || account.source === 'TrueLayer.cache') &&
                        <img
                            className='bankLogo'
                            src='./TrueLayer/TrueLayerLogo/TrueLayer-LOGO-white-transp-horizontal.svg'
                            alt='TrueLayer Logo'
                            style={{
                                width: '80px',
                            }}
                        />
                    }
                    {account.updateTimestamp &&
                        updateDate.toLocaleDateString('en-GB', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                        }) + ` (${diffInMinutes.toFixed(0)} min ago)`
                    }
                    {account.source === 'Bagel' &&
                        <span>Manual Entry</span>
                    }
                </TooltipContent>
            </Tooltip>

            { /* HEADER */}
            <div className='accountHeader'>
                <div className='row'>
                    {/* USERS */}
                    {
                        accountUsers?.map(user => (
                            <Tooltip key={user.id}>
                                <TooltipTrigger>
                                    <img
                                        key={user.id}
                                        className='bankLogo'
                                        src={user.icon}
                                    />
                                </TooltipTrigger>
                                <TooltipContent>
                                    {user.name}
                                </TooltipContent>
                            </Tooltip>
                        ))
                    }
                    {/* BANK */}
                    <Tooltip>
                        <TooltipTrigger>
                            <img
                                className={`bankLogo ${account.url ? 'clickable' : ''}`}
                                src={getAccountLogoSrc(account, providers)}
                                alt={`${account.name} Logo`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (account.url) {
                                        openInBrowser(account.url);
                                    }
                                }}
                            />
                        </TooltipTrigger>
                        <TooltipContent>
                            {providers?.[account.provider.id]?.display_name ?? account.provider.name ?? account.provider.id}
                        </TooltipContent>
                    </Tooltip>
                    <div className='verticalSeparator' />
                    <Tooltip>
                        <TooltipTrigger>{getInstrumentTypeIcon(account.instrumentType, true)}</TooltipTrigger>
                        <TooltipContent>{account.instrumentType}</TooltipContent>
                    </Tooltip>
                </div>
                {/* ACCOUNT NAME */}
                <div className='name'>{account.name}</div>
                <div className='row'>
                    {/* BALANCE */}
                    <div className='verticalSeparator' />
                    <div className='balance'>
                        {
                            (!isCard ? displayAvailable : displayBalance)
                            || <Spinner />
                        }
                    </div>
                </div>
            </div>
            <div className='accountBody'>
                {/* ACCOUNT TYPE */}
                <div className='type'>
                    {account.type}
                </div>
                <div className='row'>
                    {/* ACCOUNT / CARD NUMBERS */}
                    {!isBankCard ? account.number.accountNumber : `${account?.cardNetwork === 'MASTERCARD' ? 5 : 4}*** **** **** ${account.number.accountNumber}`}
                    {!isCard &&
                        <>
                            <div className='verticalSeparator' />
                            {account.number.bankNumber}
                        </>
                    }
                </div>
                {/* {displayAvailable && (
                    <div className='available'>({!isCard ? displayBalance : displayAvailable})</div>
                )} */}

                {!isCard && account.interest?.rate !== undefined && (
                    <div className='interestRate'>
                        {/* AER */}
                        <span>
                            {accountAER}%
                        </span>
                        {account.interest?.type === InterestType.VARIABLE &&
                            <Tooltip>
                                <TooltipTrigger>
                                    <span
                                        style={{ cursor: 'help' }}
                                    >
                                        *
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Variable Interest Rate
                                </TooltipContent>
                            </Tooltip>
                        }
                        {/* AER LABEL */}
                        <span> AER </span>
                        {/* GROSS */}
                        { account.interest?.rate !== undefined && account.interest?.rate > 0 && accountGross !== accountAER &&
                            // unique gross
                            <span>
                                ({accountGross}% gross)
                            </span>
                        }
                        { account.interest?.rate !== undefined && account.interest?.rate > 0 && accountGross === accountAER &&
                            // gross is same as AER
                            <span>
                                / gross
                            </span>
                        }
                    </div>
                )}

                {account.last && (
                    <div className='delta'>TODO: Delta</div>
                )}

            </div>
        </div>
    );
}

export default AccountCard;
