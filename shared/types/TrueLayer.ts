export type TrueLayerAccessTokenResponse = {
    access_token: string;
    expires_in: number; // seconds
    token_type: 'Bearer';
    scope: string;
};

export type TrueLayerAccount = {
    update_timestamp: string;
    account_id: string;
    account_type: 'TRANSACTION' | 'SAVINGS' | string;
    display_name: string;
    currency: string;
    account_number: {
        iban: string;
        swift_bic: string;
        number: string;
        sort_code: string;
    };
    provider: {
        display_name: string;
        provider_id: string;
        logo_uri: string;
    };
};
