import { TrueLayerProvider } from '../types/TrueLayer';

export const closedProviders: TrueLayerProvider[] = [
    // ACCOUNTS and/or CARDS
    {
        provider_id: 'bagel-kingdom-bank',
        display_name: 'Kingdom Bank',
        country: 'uk',
        logo_url: '/Finance/Banks/KingdomBank.png',
        scopes: [],
        availability: {
            recommended_status: '',
            updated_at: ''
        },
    },
    {
        provider_id: 'bagel-ns&i',
        display_name: 'National Savings and Investments',
        country: 'uk',
        logo_url: '/Finance/Banks/NS&I.png',
        scopes: [],
        availability: {
            recommended_status: '',
            updated_at: ''
        },
    },
    {
        provider_id: 'bagel-cahoot',
        display_name: 'Cahoot',
        country: 'uk',
        logo_url: '/Finance/Banks/Cahoot.png',
        accountLogo: '/Finance/Banks/CahootSquare.png',
        scopes: [],
        availability: {
            recommended_status: '',
            updated_at: ''
        },
    },
    {
        provider_id: 'bagel-progressivebs',
        display_name: 'Progressive Building Society',
        country: 'uk',
        logo_url: '/Finance/Banks/ProgressiveBS.png',
        accountLogo: '/Finance/Banks/ProgressiveBSSquare.png',
        scopes: [],
        availability: {
            recommended_status: '',
            updated_at: ''
        },
    },
    {
        provider_id: 'bagel-chip',
        display_name: 'Chip',
        country: 'uk',
        logo_url: '/Finance/Banks/chip.svg',
        accountLogo: '/Finance/Banks/chipSquare.png',
        scopes: [],
        availability: {
            recommended_status: '',
            updated_at: ''
        },
    },
    {
        provider_id: 'bagel-ukpo',
        display_name: 'Post Office',
        country: 'uk',
        logo_url: '/Finance/Banks/PostOffice.svg',
        scopes: [],
        availability: {
            recommended_status: '',
            updated_at: ''
        },
    },
    {
        provider_id: 'bagel-ubs',
        display_name: 'Union Bank of Switzerland',
        country: 'ch',
        logo_url: '/Finance/Banks/UBS.png',
        accountLogo: '/Finance/Banks/UBSSquare.jpeg',
        scopes: [],
        availability: {
            recommended_status: '',
            updated_at: ''
        },
    },
    // PENSION SCHEMES
    {
        provider_id: 'bagel-landg',
        display_name: 'Legal & General',
        country: 'uk',
        logo_url: '/Finance/Pensions/LegalAndGeneral.svg',
        accountLogo: '/Finance/Pensions/LegalAndGeneralSquare.png',
        scopes: [],
        availability: {
            recommended_status: '',
            updated_at: ''
        },
    },
    // GIFT CARDS
    {
        provider_id: 'bagel-one4all',
        display_name: 'One4All',
        country: 'uk',
        logo_url: '/Finance/GiftCards/One4all.jpg',
        accountLogo: '/Finance/GiftCards/One4allSquare.png',
        scopes: [],
        availability: {
            recommended_status: '',
            updated_at: ''
        },
    },
    // YBS always has sort code 60-92-04
];

export const providerPatches: Record<string, Partial<Omit<TrueLayerProvider, 'provider_id'>>> = {
    'ob-yorkshire-building-society': {
        accountLogo: '/Finance/Banks/YBSSquare.png',
    },
};
