import { User, WalletEntry } from "../types/Bagel";
import { Tooltip, TooltipContent, TooltipTrigger } from "./common/Tooltip";
import { TrueLayerProvider } from "../types/TrueLayer";

import './TransactionCard.css'
import '../styles/CommonCard.css'

type WalletEntryCardProps = {
    walletEntry: WalletEntry;
    users: User[] | null;
    providers: Record<string, TrueLayerProvider>;
}

function WalletEntryCard({
    walletEntry,
    users, providers,
}: WalletEntryCardProps) {

    const user = users?.find(u => u.id === walletEntry.userID);
    const provider = walletEntry.meta ? providers?.[walletEntry.meta] : undefined;

    const consentDate = new Date(walletEntry.consentedAt * 1000);
    const expirationDate =  new Date(consentDate);
    expirationDate.setDate(expirationDate.getDate() + 90); // 90 days after consent

    return (
        <div
            key={walletEntry.walletToken}
        >
            <div className='transactionCard list'>
                { /* HEADER */}
                <div className='accountRow'>
                    <div className='row anchorLeft'>
                        {/* BANK */}
                        <Tooltip>
                            <TooltipTrigger>
                                <img
                                    className='bankLogo'
                                    src={
                                        provider?.accountLogo
                                        || provider?.logo_url
                                        || './Serenity/unknown.png'
                                    }
                                    alt={`${walletEntry.meta} Logo`}
                                />
                            </TooltipTrigger>
                            <TooltipContent>
                                {provider?.display_name ?? 'Unknown Provider'}
                            </TooltipContent>
                        </Tooltip>
                        <div className='verticalSeparator' />
                        {/* USERS */}
                        <Tooltip key={user?.id}>
                            <TooltipTrigger>
                                <img
                                    key={user?.id}
                                    className='bankLogo'
                                    src={user?.icon}
                                />
                            </TooltipTrigger>
                            <TooltipContent>
                                {user?.name}
                            </TooltipContent>
                        </Tooltip>
                    </div>
                    {/* CONSENT */}
                    <span>
                        Consented: {consentDate.toLocaleDateString()}
                    </span>
                    <span>
                        Valid Until: {expirationDate.toLocaleDateString()}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default WalletEntryCard;
