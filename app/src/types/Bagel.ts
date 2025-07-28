import { TrueLayerAccount, TrueLayerAccountBalance, TrueLayerCard, TrueLayerCardBalance } from "./TrueLayer";

export interface BankAccount extends TrueLayerAccount {
    users: UserSignature[];

    balance?: TrueLayerAccountBalance;
    lastBalance?: TrueLayerAccountBalance;
    lastRetrieve?: string; // ISO timestamp

    interestRate?: number;
}

export interface BankCard extends TrueLayerCard {
    users: UserSignature[];

    balance?: TrueLayerCardBalance;
    lastBalance?: TrueLayerCardBalance;
    lastRetrieve?: string; // ISO timestamp
}

export interface User {
    id: string;
    name: string;
    email: string;
    icon: string;
}

export interface UserSignature {
    id: string;
    walletToken: string;
}
