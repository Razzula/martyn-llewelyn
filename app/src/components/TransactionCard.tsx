import { BankAccount, Transaction, User } from "../types/Bagel";
import { openInBrowser } from "../utils/tauri";
import { toFinancialString } from "../utils/finance";
import { Tooltip, TooltipContent, TooltipTrigger } from "./common/Tooltip";
import { TrueLayerProvider } from "../types/TrueLayer";

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
    const isCard = account.cardNetwork !== undefined;

    const currency = transaction?.currency === 'GBP' ? '£' : transaction?.currency;
    const amount = isCard ? -transaction.amount : transaction?.amount; // card transactions are negative amounts

    const accountUsers = users?.filter(user => account.users.some(u => u.id === user.id));

    return (
        <div
            className={`transactionCard ${className}`}
            key={transaction.transactionID}
            style={{ position: 'relative' }}
        >

            { /* HEADER */}
            <div className='accountHeader'>

                <div className='row'>
                    {/* BALANCE */}
                    <div className={`balance ${modesty ? 'hidden' : (amount < 0 ? 'negative' : 'positive')}`}>
                        {currency}&nbsp;
                        {modesty ? '***' : toFinancialString(amount)}
                    </div>
                    <div className='verticalSeparator' />
                    {/* ACCOUNT NAME */}
                    <div className='name'>{account.name}</div>
                </div>


                <div className='row'>
                    {/* ACCOUNT / CARD NUMBERS */}
                    {!isCard ? account.number.number : `${account?.cardNetwork === 'MASTERCARD' ? 5 : 4}*** **** **** ${account.number.number}`}
                    {!isCard &&
                        <>
                            <div className='verticalSeparator' />
                            {account.number.sortCode}
                        </>
                    }
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
            <div className='body'>
                <div className='row'>
                    { transaction.timestamp &&
                        new Date(transaction.timestamp).toLocaleDateString()
                    }
                    <div className='verticalSeparator' />
                    <span>{transaction.description}</span>
                </div>
            </div>
        </div>
    );
}

export default TransactionCard;
