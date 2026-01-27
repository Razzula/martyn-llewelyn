export enum MidataType {
    BP = 'BP',
    CR = 'CR',
    DD = 'DD',
    INTEREST = 'INTEREST',
    MAS = 'MAS',
    PAYMENT = 'PAYMENT',
    PAYMENTS = 'PAYMENTS',
    SO = 'SO',
    TFR = 'TFR',

    UNK1 = ')))',
}

/**
 * Extension to MidataType enum, with Types used by providers that are not officially included in the Midata standard
 */
export enum ExtendedMidataType {
    // NATWEST
    DSLASHD = 'D/D',
    BAC = 'BAC',
    POS = 'POS',
    // KINGDOM BANK
    BANK_CREDIT = 'BANK CREDIT',
    FASTER_PAYMENT_WITHDRAWAL = 'FASTER PAYMENT WITHDRAWAL',
}
