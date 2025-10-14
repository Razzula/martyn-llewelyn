/**
 * Mock data cached from TrueLayer sandbox, for use in development and testing.
 * This avoids the need to make real API calls to TrueLayer, which can be slow and
 * cannot be done safely in a browser environment.
 */

import {
  TrueLayerAccount,
  TrueLayerAccountBalance,
  TrueLayerCard,
  TrueLayerCardBalance,
  TrueLayerCardTransaction,
  TrueLayerProvider,
  TrueLayerTransactionCategory
} from '../types/TrueLayer';
import { toYYYYMMDD } from '../utils/utils';

export const providers = (): TrueLayerProvider[] => [
  {
    provider_id: 'mock',
    display_name: 'Not A Real Bank',
    country: 'uk',
    logo_url: 'https://truelayer-provider-assets.s3.amazonaws.com/global/logos/mock.svg',
    scopes: [],
    availability: {
      recommended_status: '',
      updated_at: '',
    },
  },
];

export const accountsForUser = (userID: string): string[] => {
  if (userID === 'mock-user-1') {
    return [
      '89c3139784a055b9b47998f9dce9122e',
      '328df3a40b828340fa4c3100e17de121',
      '8de2de9eab01b935b21abcbed11adf26',
    ];
  }
  else if (userID === 'mock-user-2') {
    return [
      '56c7b029e0f8ec5a2334fb0ffc2fface',
      '3c6edb9484ecd581dc1cedde8bedb1f1',
      '89c3139784a055b9b47998f9dce9122e',
    ];
  }
  return [];
};

export const accounts = (): TrueLayerAccount[] => [
  {
    account_id: '56c7b029e0f8ec5a2334fb0ffc2fface',
    account_number: {
      number: '10000000',
      iban: 'GB08CLRB04066800003435',
      sort_code: '01-21-31',
      swift_bic: 'CPBKGB00',
    },
    account_type: 'TRANSACTION',
    currency: 'GBP',
    display_name: 'TRANSACTION ACCOUNT 1',
    provider: {
      provider_id: 'mock',
      display_name: 'Not A Real Bank',
      logo_uri: 'https://truelayer-client-logos.s3-eu-west-1.amazonaws.com/banks/banks-icons/mock-icon.svg',
    },
    update_timestamp: '2025-08-28T18:29:09.1682758Z',
  },
  {
    account_id: '3c6edb9484ecd581dc1cedde8bedb1f1',
    account_number: {
      number: '20000000',
      iban: 'GB08CLRB04066800003435',
      sort_code: '01-21-31',
      swift_bic: 'CPBKGB00',
    },
    account_type: 'SAVINGS',
    currency: 'GBP',
    display_name: 'SAVINGS ACCOUNT 1',
    provider: {
      provider_id: 'mock',
      display_name: 'Not A Real Bank',
      logo_uri: 'https://truelayer-client-logos.s3-eu-west-1.amazonaws.com/banks/banks-icons/mock-icon.svg',
    },
    update_timestamp: '2025-08-28T18:29:09.1682828Z',
  },
  {
    account_id: '89c3139784a055b9b47998f9dce9122e',
    account_number: {
      number: '30000000',
      iban: 'GB08CLRB04066800003435',
      sort_code: '01-21-31',
      swift_bic: 'CPBKGB00',
    },
    account_type: 'TRANSACTION',
    currency: 'GBP',
    display_name: 'TRANSACTION ACCOUNT 2',
    provider: {
      provider_id: 'mock',
      display_name: 'Not A Real Bank',
      logo_uri: 'https://truelayer-client-logos.s3-eu-west-1.amazonaws.com/banks/banks-icons/mock-icon.svg',
    },
    update_timestamp: '2025-08-28T18:29:09.1682863Z',
  },
  {
    account_id: '328df3a40b828340fa4c3100e17de121',
    account_number: {
      number: '40000000',
      iban: 'GB08CLRB04066800003435',
      sort_code: '01-21-31',
      swift_bic: 'CPBKGB00',
    },
    account_type: 'SAVINGS',
    currency: 'GBP',
    display_name: 'SAVINGS ACCOUNT 2',
    provider: {
      provider_id: 'mock',
      display_name: 'Not A Real Bank',
      logo_uri: 'https://truelayer-client-logos.s3-eu-west-1.amazonaws.com/banks/banks-icons/mock-icon.svg',
    },
    update_timestamp: '2025-08-28T18:29:09.1682895Z',
  },
  {
    account_id: '8de2de9eab01b935b21abcbed11adf26',
    account_number: {
      number: '50000000',
      iban: 'GB08CLRB04066800003435',
      sort_code: '01-21-31',
      swift_bic: 'CPBKGB00',
    },
    account_type: 'TRANSACTION',
    currency: 'GBP',
    display_name: 'TRANSACTION ACCOUNT 3',
    provider: {
      provider_id: 'mock',
      display_name: 'Not A Real Bank',
      logo_uri: 'https://truelayer-client-logos.s3-eu-west-1.amazonaws.com/banks/banks-icons/mock-icon.svg',
    },
    update_timestamp: '2025-08-28T18:29:09.1682937Z',
  },
];

export const cardsForUser = (userID: string): string[] => {
  if (userID === 'mock-user-1') {
    return [
      '2cbf9b6063102763ccbe3ea62f1b3e72',
    ];
  }
  else if (userID === 'mock-user-2') {
    return [
      '328f557c68aebd532cbbd05ce5bcb6c8',
    ];
  }
  return [];
}

export const cards = (): TrueLayerCard[] => [
  {
    account_id: '2cbf9b6063102763ccbe3ea62f1b3e72',
    card_network: 'MASTERCARD',
    card_type: 'CREDIT',
    currency: 'GBP',
    display_name: 'CREDIT CARD 1',
    name_on_card: 'John Doe ',
    partial_card_number: '1000',
    provider: {
      provider_id: 'mock',
      display_name: 'Not A Real Bank',
      logo_uri: 'https://truelayer-client-logos.s3-eu-west-1.amazonaws.com/banks/banks-icons/mock-icon.svg',
    },
    update_timestamp: '2025-08-28T18:29:09.1663258Z',
  },
  {
    account_id: '328f557c68aebd532cbbd05ce5bcb6c8',
    card_network: 'VISA',
    card_type: 'CREDIT',
    currency: 'GBP',
    display_name: 'CREDIT CARD 2',
    name_on_card: 'John Doe ',
    partial_card_number: '2000',
    provider: {
      provider_id: 'mock',
      display_name: 'Not A Real Bank',
      logo_uri: 'https://truelayer-client-logos.s3-eu-west-1.amazonaws.com/banks/banks-icons/mock-icon.svg',
    },
    update_timestamp: '2025-08-28T18:29:09.1663319Z',
  },
];

export const accountBalances = (): Record<string, TrueLayerAccountBalance[]> => ({
  '89c3139784a055b9b47998f9dce9122ee': [{
    available: 37.26,
    currency: 'GBP',
    current: 29,
    overdraft: 100,
    update_timestamp: '2025-08-28T19:32:14.2473658Z',
  }],
  '56c7b029e0f8ec5a2334fb0ffc2fface': [{
    available: 37.26,
    currency: 'GBP',
    current: 29,
    overdraft: 100,
    update_timestamp: '2025-08-28T19:32:14.2473658Z',
  }],
  '3c6edb9484ecd581dc1cedde8bedb1f1': [{
    available: 166.26,
    currency: 'GBP',
    current: 58,
    overdraft: 200,
    update_timestamp: '2025-08-28T19:32:14.2455894Z',
  }],
  '89c3139784a055b9b47998f9dce9122e': [{
    available: 295.26,
    currency: 'GBP',
    current: 87,
    overdraft: 300,
    update_timestamp: '2025-08-28T19:32:14.3066553Z',
  }],
  '328df3a40b828340fa4c3100e17de121': [{
    available: 424.26,
    currency: 'GBP',
    current: 116,
    overdraft: 400,
    update_timestamp: '2025-08-28T19:32:14.2924166Z',
  }],
  '8de2de9eab01b935b21abcbed11adf26': [{
    available: 553.26,
    currency: 'GBP',
    current: 145,
    overdraft: 500,
    update_timestamp: '2025-08-28T19:32:14.2565614Z',
  }],
});

export const cardBalances = (): Record<string, TrueLayerCardBalance[]> => ({
  '2cbf9b6063102763ccbe3ea62f1b3e72': [{
    available: 81,
    credit_limit: 120,
    currency: 'GBP',
    current: 39,
    last_statement_balance: 7,
    last_statement_date: '2025-08-06T00:00:00Z',
    payment_due: 8,
    payment_due_date: '2025-09-01T00:00:00Z',
    update_timestamp: '2025-08-28T19:32:14.32429Z',
  }],
  '328f557c68aebd532cbbd05ce5bcb6c8': [{
    available: 172,
    credit_limit: 240,
    currency: 'GBP',
    current: 68,
    last_statement_balance: 14,
    last_statement_date: '2025-08-06T00:00:00Z',
    payment_due: 16,
    payment_due_date: '2025-09-01T00:00:00Z',
    update_timestamp: '2025-08-28T19:32:14.3095517Z',
  }],
});

export const cardTransactions = (): Record<string, Array<TrueLayerCardTransaction>> => ({
  '2cbf9b6063102763ccbe3ea62f1b3e72': [
    {
      amount: 15.86,
      currency: 'GBP',
      description: 'MR ANDREAS BEAUX',
      meta: {
        provider_transaction_category: 'TFR',
        bagel_category: 'GIVING:GIFTS', // added for categorisation in demo mode
      },
      normalised_provider_transaction_id: 'txn-2df23cef02f5fef92',
      provider_transaction_id: 'd505e768dd2619af10',
      running_balance: { amount: -588.79, currency: 'GBP' },
      timestamp: toYYYYMMDD(new Date(Date.now() - 86400000)),
      transaction_category: TrueLayerTransactionCategory.TRANSFER,
      transaction_classification: [],
      transaction_id: '47649351f7db8bbdd3287f088f4e655a',
      transaction_type: 'CREDIT',
    },
    {
      amount: -7.56,
      currency: 'GBP',
      description: 'MASTER BAGEL GILLESPIE',
      meta: {
        provider_transaction_category: 'DEB',
        bagel_category: 'INCOME:INVESTMENTYIELD', // added for categorisation in demo mode
      },
      normalised_provider_transaction_id: 'txn-1f56a713901bae410',
      provider_transaction_id: '5f2975362be3d5a8d1',
      running_balance: { amount: -643.52, currency: 'GBP' },
      timestamp: toYYYYMMDD(new Date(Date.now() - 86400000 * 3)),
      transaction_category: TrueLayerTransactionCategory.STANDING_ORDER,
      transaction_classification: [],
      transaction_id: '1158331b3496a29fa29d6ac02dd2490a',
      transaction_type: 'DEBIT',
    },
    {
      amount: -7,
      currency: 'GBP',
      description: 'INTEREST',
      meta: {
        provider_transaction_category: 'CSH',
        bagel_category: 'INCOME:INTEREST', // added for categorisation in demo mode
      },
      normalised_provider_transaction_id: 'txn-74d0bca7901c9e1b7',
      provider_transaction_id: '71e6e06ef28711edba',
      running_balance: { amount: -573.52, currency: 'GBP' },
      timestamp: toYYYYMMDD(new Date(Date.now() - 86400000)),
      transaction_category: TrueLayerTransactionCategory.INTEREST,
      transaction_classification: [],
      transaction_id: 'e562140aee2cb65836763df538fe4b17',
      transaction_type: 'CREDIT',
    },
    {
      amount: 150,
      currency: 'GBP',
      description: 'DIGITAL REGULAR SAVER',
      meta: { 
        provider_transaction_category: 'DEP',
        bagel_category: 'SAVINGS:SAVINGS' // added for categorisation in demo mode
      },
      normalised_provider_transaction_id: 'txn-0c4bf57ead82ca43e',
      provider_transaction_id: '3cc118c336d8475f6e',
      running_balance: { amount: -637.01, currency: 'GBP' },
      timestamp: toYYYYMMDD(new Date()),
      transaction_category: TrueLayerTransactionCategory.ATM,
      transaction_classification: [],
      transaction_id: '8cc4e68b7265cef8db5ced713a42596e',
      transaction_type: 'CREDIT',
    },
  ],
  '328f557c68aebd532cbbd05ce5bcb6c8': [
    {
      amount: 420,
      currency: 'GBP',
      description: 'THE BATTERED HEN INN',
      meta: {
        provider_transaction_category: 'CSH',
        bagel_category: 'ESSENTIAL:RENT', // added for categorisation in demo mode
      },
      normalised_provider_transaction_id: 'txn-8062417e3a4934296',
      provider_transaction_id: '7ad0d85593575df9f9',
      running_balance: { amount: -640.42, currency: 'GBP' },
      timestamp: toYYYYMMDD(new Date()),
      transaction_category: TrueLayerTransactionCategory.DIRECT_DEBIT,
      transaction_classification: [],
      transaction_id: '1d7d0e91a257fda71538befc1fecbc67',
      transaction_type: 'CREDIT',
    },
    {
      amount: 36.59,
      currency: 'GBP',
      description: 'BOBLIN & BORG CHEESE DELIVERY SERVICES LTD',
      meta: {
        provider_transaction_category: 'DEB',
        bagel_category: 'ESSENTIAL:GROCERIES', // added for categorisation in demo mode
      },
      normalised_provider_transaction_id: 'txn-c370c77e9b12134f7',
      provider_transaction_id: '4832e65bddacd1d01d',
      running_balance: { amount: -677.01, currency: 'GBP' },
      timestamp: toYYYYMMDD(new Date()),
      transaction_category: TrueLayerTransactionCategory.PURCHASE,
      transaction_classification: [],
      transaction_id: 'cbb6ba8db507c27fd544d16233606b1f',
      transaction_type: 'DEBIT',
    },
    {
      amount: 40,
      currency: 'GBP',
      description: 'ATM WITHDRAWAL',
      meta: { 
        provider_transaction_category: 'DEP',
        bagel_category: 'NON-ESSENTIAL:MISC.' // added for categorisation in demo mode
      },
      normalised_provider_transaction_id: 'txn-0c4bf57ead82ca43c',
      provider_transaction_id: '3cc118c336d8475f6d',
      running_balance: { amount: -637.01, currency: 'GBP' },
      timestamp: toYYYYMMDD(new Date()),
      transaction_category: TrueLayerTransactionCategory.ATM,
      transaction_classification: [],
      transaction_id: '8cc4e68b7265cef8db5ced713a425969',
      transaction_type: 'CREDIT',
    },
  ]
});
