import { TrueLayerAccount, TrueLayerAccountBalance, TrueLayerCard, TrueLayerCardBalance } from "./TrueLayer";

export interface BankAccount extends TrueLayerAccount {
    user: string;
    balance?: TrueLayerAccountBalance;
    walletToken?: string;
}

export interface BankCard extends TrueLayerCard {
    user: string;
    balance?: TrueLayerCardBalance;
    walletToken?: string;
}

export interface User {
    id: string;
    name: string;
}