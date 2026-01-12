import { invoke } from "@tauri-apps/api/core";

import { TrueLayerAccount, TrueLayerAccountBalance, TrueLayerCard, TrueLayerCardBalance, TrueLayerProvider } from "../types/TrueLayer.ts";
import { generateCodeChallenge, generateCodeVerifier } from "../utils/PKCE.ts";
import { BankAccount, WalletEntry } from "../types/Bagel.ts";
import { fromTrueLayerAccount, fromTrueLayerCard } from "../types/TrueLayerAdapters.ts";
import { isTauri } from "../utils/tauri.ts";

import {
    providers as mockProviders,
    accounts as mockAccounts,
    accountsForUser as mockAccountsForUser,
    cards as mockCards,
    cardsForUser as mockCardsForUser,
    accountBalances as mockAccountBalances,
    cardBalances as mockCardBalances,
    cardTransactions as mockCardTransactions,
} from "../data/TrueLayerMock";

interface TrueLayerAPI {
    getTrueLayerAuthURL(userID: string, userEmail: string): Promise<string>;
    handleTokenExchange(code: string, state: string): Promise<WalletEntry>;

    fetchProviders(): Promise<TrueLayerProvider[]>;

    fetchAccountsData(walletToken: string): Promise<[TrueLayerAccount[], string]>;
    fetchCardsData(walletToken: string): Promise<[TrueLayerCard[], string]>;

    fetchAccountBalance(walletToken: string, accountId: string): Promise<TrueLayerAccountBalance[]>;
    fetchCardBalance(walletToken: string, cardId: string): Promise<TrueLayerCardBalance[]>;

    fetchAccountTransactions(walletToken: string, accountId: string, from?: string, to?: string): Promise<any[]>;
    fetchCardTransactions(walletToken: string, cardId: string, from?: string, to?: string): Promise<any[]>;
}

class RealTrueLayerAPI implements TrueLayerAPI {

    async getTrueLayerAuthURL(userID: string, userEmail: string): Promise<string> {

        const env = import.meta.env.VITE_TRUELAYER_ENV || 'sandbox';

        const authHost = (env === 'sandbox')
            ? 'https://auth.truelayer-sandbox.com'
            : 'https://auth.truelayer.com';

        const verifier = generateCodeVerifier();
        const challenge = await generateCodeChallenge(verifier);

        sessionStorage.setItem('codeVerifier', verifier); // store the code verifier for later use

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: import.meta.env.VITE_TRUELAYER_CLIENT_ID,
            redirect_uri: import.meta.env.VITE_TRUELAYER_REDIRECT_URI,
            scope: 'info accounts cards balance transactions offline_access',
            state: userID,
            user_email: userEmail,
            // nonce: crypto.randomUUID(),
            code_challenge: challenge,
            code_challenge_method: 'S256',
            enable_mock: (env === 'sandbox').toString(),
            providers: (env === 'sandbox') ? 'uk-cs-mock' : '', // mock UK bank
            // providers: 'ob-natwest ob-first-direct',
        });

        const redirectURI = `${authHost}/?${params.toString()}`;
        return redirectURI;
    }

    async handleTokenExchange(code: string, state: string) {
        const verifier = sessionStorage.getItem('codeVerifier');

        const walletToken: WalletEntry = await invoke('exchangeToken', { code, userId: state, verifier });
        return walletToken;
    }

    async fetchProviders(): Promise<TrueLayerProvider[]> {
        const res = JSON.parse(
            await invoke('fetchProviders')
        );
        return res || [];
    }

    async fetchAccountsData(walletToken: string): Promise<[TrueLayerAccount[], string]> {
        const res = JSON.parse(
            await invoke('fetchAccountsData', { walletToken })
        );
        return [res.results || [], res.userID];
    }

    async fetchCardsData(walletToken: string): Promise<[TrueLayerCard[], string]> {
        const res = JSON.parse(
            await invoke('fetchCardsData', { walletToken })
        );
        return [res.results || [], res.userID];
    }

    async fetchAccountBalance(walletToken: string, accountId: string): Promise<TrueLayerAccountBalance[]> {
        const res = JSON.parse(
            await invoke('fetchAccountBalance', { walletToken, accountId })
        );
        return res.results || [];
    }
    
    async fetchCardBalance(walletToken: string, cardId: string): Promise<TrueLayerCardBalance[]> {
        const res = JSON.parse(
            await invoke('fetchCardBalance', { walletToken, cardId })
        );
        return res.results || [];
    }

    async fetchAccountTransactions(walletToken: string, accountId: string, from: string, to: string): Promise<any[]> {
        const res = JSON.parse(
            await invoke('fetchAccountTransactions', { walletToken, accountId, from, to })
        );
        return res.results || [];
    }

    async fetchCardTransactions(walletToken: string, cardId: string, from: string, to: string): Promise<any[]> {
        const res = JSON.parse(
            await invoke('fetchCardTransactions', { walletToken, cardId, from, to })
        );
        console.log(cardId, res.results);
        return res.results || [];
    }

}

class MockTrueLayerAPI implements TrueLayerAPI {

    async getTrueLayerAuthURL(_userID: string, _userEmail: string): Promise<string> {
        return 'mock-auth-url';
    }

    async handleTokenExchange(_code: string, _state: string): Promise<WalletEntry> {
        return {
            walletToken: 'mock-wallet-token',
            userID: 'user-id',
            consentedAt: 0,
        };
    }

    async fetchProviders(): Promise<TrueLayerProvider[]> {
        return mockProviders();
    }

    async fetchAccountsData(walletToken: string): Promise<[TrueLayerAccount[], string]> {
        return [
            mockAccountsForUser(walletToken)
                .map(accountID => mockAccounts().find(account => account.account_id === accountID))
                .filter(Boolean) as TrueLayerAccount[],
            walletToken,
        ];
    }

    async fetchCardsData(walletToken: string): Promise<[TrueLayerCard[], string]> {
        return [
            mockCardsForUser(walletToken)
                .map(accountID => mockCards().find(account => account.account_id === accountID))
                .filter(Boolean) as TrueLayerCard[],
            walletToken,
        ];
    }

    async fetchAccountBalance(_walletToken: string, accountId: string): Promise<TrueLayerAccountBalance[]> {
        return mockAccountBalances()[accountId] || [];
    }

    async fetchCardBalance(_walletToken: string, cardId: string): Promise<TrueLayerCardBalance[]> {
        return mockCardBalances()[cardId] || [];
    }

    async fetchAccountTransactions(_walletToken: string, _accountId: string): Promise<any[]> {
        return [];
    }

    async fetchCardTransactions(_walletToken: string, cardId: string): Promise<any[]> {
        return mockCardTransactions()[cardId] || [];
    }

}

export class TrueLayerClient {
    private static api: TrueLayerAPI = isTauri ? new RealTrueLayerAPI() : new MockTrueLayerAPI();

    static async getTrueLayerAuthURL(userID: string, userEmail: string): Promise<string> {
        return TrueLayerClient.api.getTrueLayerAuthURL(userID, userEmail);
    }

    static async handleTokenExchange(code: string, state: string): Promise<WalletEntry> {
        return TrueLayerClient.api.handleTokenExchange(code, state);
    }

    static async fetchProviders(): Promise<TrueLayerProvider[]> {
        return TrueLayerClient.api.fetchProviders();
    }

    static async fetchAccountsData(walletToken: string): Promise<BankAccount[]> {
        const [res, userID] = await TrueLayerClient.api.fetchAccountsData(walletToken);
        const data: BankAccount[] = res.map((account: TrueLayerAccount) => {
            return {
                ...fromTrueLayerAccount(account),
                users: [{
                    id: userID,
                    walletToken: walletToken, // store the walletToken needed to access the account
                }],
                balance: undefined, // ensure balance is defined
            };
        });
        return data;
    }

    static async fetchCardsData(walletToken: string): Promise<BankAccount[]> {
        const [res, userID] = await TrueLayerClient.api.fetchCardsData(walletToken);
        const data: BankAccount[] = res.map((card: TrueLayerCard) => {
            return {
                ...fromTrueLayerCard(card),
                users: [{
                    id: userID,
                    walletToken: walletToken, // store the walletToken needed to access the account
                }],
                balance: undefined, // ensure balance is defined
            };
        });
        return data;
    }

    static async fetchAccountBalance(walletToken: string, accountId: string): Promise<TrueLayerAccountBalance[]> {
        return TrueLayerClient.api.fetchAccountBalance(walletToken, accountId);
    }

    static async fetchCardBalance(walletToken: string, cardId: string): Promise<TrueLayerCardBalance[]> {
        return TrueLayerClient.api.fetchCardBalance(walletToken, cardId);
    }

    static async fetchAccountTransactions(walletToken: string, accountId: string, from?: string, to?: string): Promise<any[]> {
        return TrueLayerClient.api.fetchAccountTransactions(walletToken, accountId, from, to);
    }

    static async fetchCardTransactions(walletToken: string, cardId: string, from?: string, to?: string): Promise<any[]> {
        return TrueLayerClient.api.fetchCardTransactions(walletToken, cardId, from, to);
    }

}