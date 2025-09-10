import { BankAccount, Transaction, User } from "../types/Bagel";
import { openInBrowser } from "../utils/tauri";
import { toFinancialString } from "../utils/finance";
import { Tooltip, TooltipContent, TooltipTrigger } from "./common/Tooltip";
import { TrueLayerProvider, TrueLayerTransactionCategory } from "../types/TrueLayer";

import './TransactionCard.css'
import '../styles/CommonCard.css'
import Select from "./common/Select";
import { expenditures, incomes } from "../data/categories";

type TransactionCardProps = {
    className?: string;
    transaction: Transaction;
    account: BankAccount;
    users: User[] | null;
    providers: Record<string, TrueLayerProvider>;
    modesty: boolean;
}

function TransactionCard({
    className,
    transaction,
    account,
    users, providers,
    modesty,
}: TransactionCardProps) {

    function getTransactionIcon(category: TrueLayerTransactionCategory, isCard: boolean): string {
        switch (category) {
            case TrueLayerTransactionCategory.ATM:
            case TrueLayerTransactionCategory.CASH:
            case TrueLayerTransactionCategory.CASHBACK:
                return './Icons/Cash.svg';
            case TrueLayerTransactionCategory.CHEQUE:
                return './Icons/Checkbook.svg';
            case TrueLayerTransactionCategory.CREDIT:
                return './Icons/CardCredit.svg';
            case TrueLayerTransactionCategory.DEBIT:
                return './Icons/CardSpending.svg';
            case TrueLayerTransactionCategory.DIRECT_DEBIT:
                return './Finance/DirectDebit_Portrait.svg';
            case TrueLayerTransactionCategory.DIVIDEND:
            case TrueLayerTransactionCategory.INTEREST:
                return './Icons/Savings.svg';
            case TrueLayerTransactionCategory.STANDING_ORDER:
                return './Icons/EventRepeat.svg';
            case TrueLayerTransactionCategory.TRANSFER:
                return './Icons/Bank.svg';
            // case TrueLayerTransactionCategory.BILL_PAYMENT:
            // case TrueLayerTransactionCategory.CORRECTION:
            // case TrueLayerTransactionCategory.FEE_CHARGE:
            // case TrueLayerTransactionCategory.PURCHASE:
            case TrueLayerTransactionCategory.OTHER:
            case TrueLayerTransactionCategory.UNKNOWN:
            default:
                return isCard ? './Icons/CardCredit.svg' : './Icons/Bank.svg';
        }
    }

    function getChannelColour(channel: string): string {
        switch (channel) {
            case 'ESSENTIAL':
                return '#ea4335';
            case 'NON-ESSENTIAL':
                return '#4a86e8';
            case 'GIVING':
                return '#46bdc6';
            case 'SAVINGS':
                return '#b6d7a8';
                case 'INCOME':
                return '#34a853';
            default:
                return 'black';
        }
    }

    const isCard = account.cardNetwork !== undefined;

    const currency = transaction?.currency === 'GBP' ? '£' : transaction?.currency;
    const amount = isCard ? -transaction.amount : transaction?.amount; // card transactions are negative amounts

    const accountUsers = users?.filter(user => account.users.some(u => u.id === user.id));

    const isPositive = amount > 0;

    return (
        <div
            className={`transactionCard ${className}`}
            key={transaction.transactionID}
            style={{ position: 'relative' }}
        >

            { /* HEADER */}
            <div className='accountHeader'>

                <div className='row'>
                    {/* TRANSACTION TYPE */}
                    <img
                        className='icon'
                        src={getTransactionIcon(transaction.transactionCategory, isCard)}
                        alt={`${account.name} Logo`}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (account.url) {
                                openInBrowser(account.url);
                            }
                        }}
                    />
                    <div className='verticalSeparator' />

                    {/* BALANCE */}
                    <div
                        className={`balance ${modesty ? 'hidden' : (isPositive ? 'positive' : 'negative')}`}
                        style={{ width: modesty ? '50px' : '100px' }}
                    >
                        {currency}&nbsp;
                        {modesty ? '***' : toFinancialString(amount)}
                    </div>
                    <div className='verticalSeparator' />
                    {/* TRANSACTION CATEGORY */}
                    <div style={{ marginRight: '8px' }}>
                        <Select
                            entries={
                                [
                                    ...Object.values(isPositive ? incomes : expenditures),
                                ].map(category => ({
                                    name: category.name,
                                    key: `${category.name}-${category.channel}`,
                                    element: (
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <span
                                                    style={{
                                                        width: '100%',
                                                        color: getChannelColour(category.channel)
                                                    }}
                                                >
                                                    {category.icon}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent><span>{category.name}</span></TooltipContent>
                                        </Tooltip>
                                    ),
                                    icon: <span style={{ color: getChannelColour(category.channel) }}>{category.icon}</span>,
                                }))
                            }
                            setSelected={function (name: string): void {
                                throw new Error("Function not implemented.");
                            }}
                            mode='grid'
                            windowMaxWidth={340}
                        />
                    </div>
                    {/* DESCRIPTION */}
                    <span>{transaction.description}</span>
                </div>


                <div className='row'>
                    {/* ACCOUNT NAME */}
                    <div className='small'>{account.name}</div>
                    {/* ACCOUNT / CARD NUMBERS */}
                    {/* {!isCard ? account.number.number : `${account?.cardNetwork === 'MASTERCARD' ? 5 : 4}*** **** **** ${account.number.number}`} */}
                    {/* {!isCard &&
                        <>
                            <div className='verticalSeparator' />
                            {account.number.sortCode}
                        </>
                    } */}
                    <div className='verticalSeparator' />
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
                                src={
                                    account.provider.logoURI
                                    || providers?.[account.provider.id]?.accountLogo
                                    || providers?.[account.provider.id]?.logo_url
                                    || '/Serenity/unknown.png'
                                }
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
                </div>

            </div>

            {/* BODY */}
            <div className='accountBody'>
                <div className='row'>
                    {/* { transaction.timestamp &&
                        new Date(transaction.timestamp).toLocaleDateString()
                    } */}
                    {/* <div className='verticalSeparator' /> */}
                    {/* <span>{transaction.description}</span> */}
                </div>
            </div>
        </div>
    );
}

export default TransactionCard;
