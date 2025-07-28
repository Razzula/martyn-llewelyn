import { TrueLayerAccount, TrueLayerAccountBalance, TrueLayerCard, TrueLayerCardBalance } from "./TrueLayer";

export interface BankAccount extends TrueLayerAccount {
    user: string;

    walletToken?: string;
    balance?: TrueLayerAccountBalance;
    lastBalance?: TrueLayerAccountBalance;
    lastRetrieve?: string; // ISO timestamp

    interestRate?: number;
}

export interface BankCard extends TrueLayerCard {
    user: string;

    walletToken?: string;
    balance?: TrueLayerCardBalance;
    lastBalance?: TrueLayerCardBalance;
    lastRetrieve?: string; // ISO timestamp
}

export interface User {
    id: string;
    name: string;
    email: string;
}