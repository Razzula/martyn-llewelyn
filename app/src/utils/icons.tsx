import type { ReactNode } from 'react';

import { TrueLayerTransactionCategory } from '../types/TrueLayer';

import Bank from '../assets/icons/Bank.svg?react';
import Cash from '../assets/icons/Cash.svg?react';
import Chequebook from '../assets/icons/Checkbook.svg?react';
import CardCredit from '../assets/icons/CardCredit.svg?react';
import CardSpending from '../assets/icons/CardSpending.svg?react';
import Savings from '../assets/icons/Savings.svg?react';
import EventRepeat from '../assets/icons/EventRepeat.svg?react';
import Gift from '../assets/icons/Gift.svg?react';
import MoneyBag from '../assets/icons/MoneyBag.svg?react';
import { InstrumentType } from '../types/Bagel';

export function getTransactionIcon(category: TrueLayerTransactionCategory, isCard: boolean): ReactNode {
    switch (category) {
        case TrueLayerTransactionCategory.ATM:
        case TrueLayerTransactionCategory.CASH:
        case TrueLayerTransactionCategory.CASHBACK:
            return <Cash />;
        case TrueLayerTransactionCategory.CHEQUE:
            return <Chequebook />;
        case TrueLayerTransactionCategory.CREDIT:
            return <CardCredit />;
        case TrueLayerTransactionCategory.DEBIT:
            return <CardSpending />;
        case TrueLayerTransactionCategory.DIRECT_DEBIT:
            return <img
                src='./Finance/DirectDebit_Portrait.svg'
                alt = 'Direct Debit'
                width = { 24} height = { 24}
            />;
        case TrueLayerTransactionCategory.DIVIDEND:
        case TrueLayerTransactionCategory.INTEREST:
            return <Savings />;
        case TrueLayerTransactionCategory.STANDING_ORDER:
            return <EventRepeat />;
        case TrueLayerTransactionCategory.TRANSFER:
            return <Bank />;
        // case TrueLayerTransactionCategory.BILL_PAYMENT:
        // case TrueLayerTransactionCategory.CORRECTION:
        // case TrueLayerTransactionCategory.FEE_CHARGE:
        // case TrueLayerTransactionCategory.PURCHASE:
        case TrueLayerTransactionCategory.OTHER:
        case TrueLayerTransactionCategory.UNKNOWN:
        default:
            return isCard ? <CardCredit /> : <Bank />;
    }
}

export function getInstrumentTypeIcon(instrumentType: InstrumentType, shortForm: boolean = false): ReactNode {
    switch (instrumentType) {
        case InstrumentType.ACCOUNT:
            return <Bank />;
        case InstrumentType.CARD:
            return <CardCredit />;
        case InstrumentType.PENSION:
            return <MoneyBag />;
        case InstrumentType.GIFTCARD:
            return (shortForm ? <Gift /> : <span><Gift /><CardSpending /></span>);
        default:
            return <Bank />;
    }
}
