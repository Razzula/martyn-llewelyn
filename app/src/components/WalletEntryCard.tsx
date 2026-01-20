import { User, WalletEntry } from "../types/Bagel";
import { Tooltip, TooltipContent, TooltipTrigger } from "./common/Tooltip";
import { TrueLayerProvider } from "../types/TrueLayer";
import { isTauri } from "../utils/tauri";
import { TrueLayerClient } from "../lib/TrueLayer";

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
    const expirationDate = new Date(consentDate);
    expirationDate.setDate(expirationDate.getDate() + 90); // 90 days after consent

    function renewConsent() {
        if (!user) {
            return;
        }
        TrueLayerClient.handleExtendConnection(
            walletEntry.walletToken,
            { id: user.id, name: user.name, email: user.email },
            true,
        ).then(res => {
            console.log('Jack', res);
        });
    }

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
                                {provider?.display_name ?? `Unknown Provider (${walletEntry.meta})`}
                            </TooltipContent>
                        </Tooltip>
                        <div className='verticalSeparator' />
                        {/* USERS */}
                        <Tooltip key={user?.id}>
                            <TooltipTrigger>
                                <img
                                    key={user?.id}
                                    className='bankLogo'
                                    src={user?.icon || './Serenity/unknown.png'}
                                />
                            </TooltipTrigger>
                            <TooltipContent>
                                {user?.name ?? 'Unknown Profile'}
                            </TooltipContent>
                        </Tooltip>
                    </div>
                    {/* CONSENT */}
                    <div style={{
                        paddingLeft: '0.6rem',
                        paddingRight: '0.6rem',
                    }}>
                        <div>
                            Consented: {consentDate.toLocaleDateString()}
                        </div>
                        <div>
                            Expires: {expirationDate.toLocaleDateString()}
                        </div>
                    </div>
                    <Tooltip>
                        <TooltipTrigger>
                            <button
                                className='column'
                                onClick={renewConsent}
                                disabled={!isTauri}
                            >
                                Renew Consent
                            </button>
                        </TooltipTrigger>
                        {!isTauri &&
                            <TooltipContent>This feature is unavailable in limited demo mode.</TooltipContent>
                        }
                    </Tooltip>
                </div>
            </div>
        </div>
    );
}

export default WalletEntryCard;
