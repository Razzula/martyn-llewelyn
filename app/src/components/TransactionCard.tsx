import { BankAccount, InterestType, Transaction, User } from "../types/Bagel";
import { openInBrowser, toFinancialString } from "../utils/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./common/Tooltip";
import { TrueLayerProvider } from "../types/TrueLayer";

type TransactionCardProps = {
    transaction: Transaction;
    account: BankAccount;
    users: User[] | null;
    providers: Record<string, TrueLayerProvider>;
    modesty: boolean;
    setOpenEditAccount: (account: BankAccount) => void;
}

function TransactionCard({
    transaction,
    account,
    users, providers,
    modesty,
    setOpenEditAccount,
}: TransactionCardProps) {
    const isCard = account.cardNetwork !== undefined;

    const currency = transaction?.currency === 'GBP' ? '£' : transaction?.currency;

    const accountUsers = users?.filter(user => account.users.some(u => u.id === user.id));

    return (
        <div className='accountCard' key={transaction.transactionID}
            style={{ position: 'relative' }}
            onClick={() => setOpenEditAccount(account)}
        >

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
                    <div className='verticalSeparator' />
                </div>
                {/* ACCOUNT NAME */}
                <div className='name'>{account.name}</div>
                {/* ACCOUNT / CARD NUMBERS */}
                {!isCard ? account.number.number : `${account?.cardNetwork === 'MASTERCARD' ? 5 : 4}*** **** **** ${account.number.number}`}
                {!isCard &&
                    <>
                        <div className='verticalSeparator' />
                        {account.number.sortCode}
                    </>
                }
                <div className='row'>
                    {/* BALANCE */}
                    <div className='verticalSeparator' />
                    <div className='balance'>
                        {currency}&nbsp;
                        {modesty ? '***' : toFinancialString(Math.abs(transaction.amount))}
                    </div>
                </div>
            </div>

            {/* BODY */}
            <div className='body'>
                {transaction.timestamp}
                {transaction.description}
            </div>
        </div>
    );
}

export default TransactionCard;
