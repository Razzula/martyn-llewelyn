import { TrueLayerAccount, TrueLayerAccountBalance, TrueLayerCard, TrueLayerCardBalance } from "./TrueLayer";

export interface BankAccount extends TrueLayerAccount {
    balance?: TrueLayerAccountBalance;
    walletToken?: string;
}

export interface BankCard extends TrueLayerCard {
    balance?: TrueLayerCardBalance;
    walletToken?: string;
}
