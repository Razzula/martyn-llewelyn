import { ExtendedMidataType, MidataType } from "./Midata";
import { TrueLayerTransactionCategory, TrueLayerTransactionType } from "./TrueLayer";

export function getTypefromMidataType(input: string): TrueLayerTransactionType {
    switch (input.toUpperCase()) {
        case MidataType.CR:
        case ExtendedMidataType.BANK_CREDIT:
        case MidataType.PAYMENT:
        case MidataType.INTEREST:
            return 'CREDIT';
        case MidataType.DD:
        case ExtendedMidataType.DSLASHD:
        case ExtendedMidataType.FASTER_PAYMENT_WITHDRAWAL:
        case MidataType.PAYMENTS:
            return 'DEBIT';
        default:
            return 'UNKNOWN';
    }
}

export function getCategoryfromMidataType(input: string): TrueLayerTransactionCategory {
    switch (input.toUpperCase()) {
        // TODO: BP, MAS, PAYMENT, PAYMENTS, FASTER_PAYMENT_WITHDRAWAL, BAC, POS
        case MidataType.CR:
        case ExtendedMidataType.BANK_CREDIT:
            return TrueLayerTransactionCategory.CREDIT;
        case MidataType.DD:
        case ExtendedMidataType.DSLASHD:
            return TrueLayerTransactionCategory.DIRECT_DEBIT;
        case MidataType.INTEREST:
            return TrueLayerTransactionCategory.INTEREST;
        case MidataType.SO:
            return TrueLayerTransactionCategory.STANDING_ORDER;
        case MidataType.TFR:
            return TrueLayerTransactionCategory.TRANSFER;
        case MidataType.UNK1:
        default:
            return TrueLayerTransactionCategory.UNKNOWN;
    }
}
