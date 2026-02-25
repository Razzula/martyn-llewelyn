type Availability = {
    start?: string; // YYYY-MM-DD
    end?: string;   // YYYY-MM-DD
    withdrawn?: { date: string; label?: string };
};

type Headline = {
    credit?: number;     // money into account
    credit2?: number;    // optional second credit
    credit2Text?: string;// e.g. "3x £50 credit"
    amazon?: number;
    prize?: string;
};

export type RequirementOp = 'AND' | 'OR' | 'XOR';

export type RequirementLeaf = {
    kind?: 'req';
    type: string;
    scheme?: 'CASS';
    mustBeFull?: boolean;
    amount?: number;
    count?: number;
    countAtLeast?: number;
    countAtMost?: number;
    mustBeActive?: boolean | null;
    windowDaysFrom?: string;
    windowDays?: number | null;
    windowMonthsFrom?: string;
    windowMonths?: number | null;
    byDate?: string;
    afterDate?: string;
    beforeDate?: string;
    anchor?: string;
    mustRequestBy?: string;
    mustCompleteBy?: string;
    url?: string;
    accountTypes?: string[];
    channel?: string;
    meta?: string;
    notes?: string[];
};

export type RequirementGroup = {
    kind: 'group';
    op: RequirementOp;
    label?: string;
    children: Requirement[];
    notes?: string[];
};

export type Requirement = RequirementLeaf | RequirementGroup;

export type Payment = {
    type: 'credit' | 'amazon' | 'prize';
    amount?: number;
    payout?: {
        windowDays?: number,
        windowDaysFrom?: string;
        days?: number;
        date?: string;
        label?: string;
        deliveryMethod?: string;
        sender?: string;
        claimWindowDays?: number;
    };
    notes?: string[];
};

type Component = {
    id: string;
    title: string;
    headline?: Headline;
    requirements?: Requirement[];
    payment?: Payment;
};

export type Offer = {
    id: string;
    bankID: string;
    scheme: 'CASS' | 'PROMO';
    title: string;
    headline?: Headline;
    value: number;
    availability?: Availability;
    links?: { label?: string; url: string }[];
    eligibility?: string[];
    requirements?: Requirement[]; // optional, for offer-level criteria
    components?: Component[];
    bonuses?: { type: string; title?: string; openBy?: string; maxSavePerMonth?: number; notes?: string[], }[];
    canRepeat?: 'joint';
    payment?: Payment;
};

export const incentives: { data: Offer[] } = {
    data: [
        {
            id: 'firstDirect_cass_sep2025_amazon',
            bankID: 'ob-first-direct',
            scheme: 'CASS',
            title: '£225 Switch',
            headline: { credit: 175, amazon: 50 },
            value: 225,
            availability: { start: '2025-09-09', end: '2026-02-15', },
            components: [
                {
                    id: 'amazon',
                    title: '£50 Amazon Gift Card',
                    requirements: [
                        {
                            type: 'form',
                            url: 'https://rewards.giftcloud.com/uk/capture/msmltd/46286?urn=26b58f92-7f2f-4fdb-bb86-a0420d018163',
                            notes: [
                                'Offer provided by Mony Group Financial Limited.',
                                'Requires email information.',
                                'Requires opening of a new first direct 1st Account after completion.'
                            ],
                        },
                    ],
                    payment: {
                        type: 'amazon',
                        amount: 50,
                        payout: {
                            label: 'Sent by email within up to 75 days of account opening.',
                            windowDaysFrom: 'accountOpenedAt',
                            windowDays: 75,
                            deliveryMethod: 'email',
                            sender: 'no-reply@giftcloud.com',
                            claimWindowDays: 90,
                        },
                        notes: [
                            'You must claim the eGift within 90 days of the email, or it is forfeited.',
                            'Reward is issued by Mony Group Financial Limited via Giftcloud, not by first direct.',
                        ],
                    },
                },
                {
                    id: 'credit',
                    title: '£175 Switch Incentive',
                    requirements: [
                        {
                            kind: 'group',
                            op: 'AND',
                            children: [
                                {
                                    type: 'openAccount',
                                    accountTypes: ['1st Account'],
                                    notes: ['Open a 1st Account on or after 9 September until the offer is withdrawn.'],
                                },
                                {
                                    type: 'switch',
                                    scheme: 'CASS',
                                    mustBeFull: true,
                                    windowDaysFrom: 'accountOpenedAt',
                                    windowDays: 45,
                                    notes: [
                                        'Switch using CASS within 45 days.',
                                        'For joint 1st Accounts, at least one joint holder must switch from a sole account in their own name or another joint account in the same names.',
                                    ],
                                },
                                {
                                    type: 'standingOrdersOrDirectDebits',
                                    countAtLeast: 2,
                                    windowDaysFrom: 'accountOpenedAt',
                                    windowDays: 45,
                                    mustBeActive: null as unknown as boolean,
                                    notes: [
                                        'Switch must include at least two Direct Debits or standing orders.',
                                        'It is not stated that there must be a minimum amount or who the payments must be to.',
                                        'It is not stated that they must be active, collected from, or collect within any timeframe.',
                                    ],
                                },
                                {
                                    type: 'payIn',
                                    amount: 1000,
                                    windowDaysFrom: 'accountOpenedAt',
                                    windowDays: 45,
                                    notes: ['This amount can be paid in all at once or at different times within the 45 days.'],
                                },
                                {
                                    type: 'debitCardTx',
                                    countAtLeast: 5,
                                    windowDaysFrom: 'accountOpenedAt',
                                    windowDays: 45,
                                    notes: [
                                        'It is not stated that there must be a minimum amount.',
                                        'Excludes gambling transactions, credit card or insurance payments, cash withdrawals, and card to card payments.',
                                    ],
                                },
                                {
                                    type: 'login',
                                    channel: 'appOrOnlineBanking',
                                    windowDaysFrom: 'accountOpenedAt',
                                    windowDays: 45,
                                    notes: ['Register and log into the App or Online Banking.'],
                                },
                            ],
                        },
                    ],
                    payment: {
                        type: 'credit',
                        amount: 175,
                        payout: {
                            label: 'Credited to your 1st Account by the 20th of the following month after criteria fulfilment.',
                            windowDaysFrom: 'criteriaMetAt',
                            date: '20th',
                            deliveryMethod: 'credit',
                            sender: 'first direct',
                        },
                        notes: [
                            'Paid only if you meet all criteria and still have the new 1st Account on the payment date.',
                            'For joint accounts, only one £175 payment is made into the joint account.',
                        ],
                    },
                },
            ],
            eligibility: [
                "Not eligible if you're already a first direct customer, have previously held a first direct product, or opened an HSBC current account on or after 1 January 2018.",
            ],
            links: [
                { label: 'first direct Switch Page', url: 'https://www.firstdirect.com/banking/switching-bank-accounts/' },
                { label: 'first direct Terms & Conditions', url: './documents/first direct/Sep26-Switch_T&Cs.pdf' },
                { label: 'Giftcloud Terms & Conditions', url: './documents/first direct/Feb26-Giftcloud_T&Cs.pdf' },
            ],
        },
        {
            id: 'firstDirect_cass_sep2025',
            bankID: 'ob-first-direct',
            scheme: 'CASS',
            title: '£175 Switch',
            headline: { credit: 175 },
            value: 175,
            availability: { start: '2025-09-09', },
            components: [
                {
                    id: 'credit',
                    title: '£175 Switch Incentive',
                    requirements: [
                        {
                            kind: 'group',
                            op: 'AND',
                            children: [
                                {
                                    type: 'openAccount',
                                    accountTypes: ['1st Account'],
                                    notes: ['Open a 1st Account on or after 9 September until the offer is withdrawn.'],
                                },
                                {
                                    type: 'switch',
                                    scheme: 'CASS',
                                    mustBeFull: true,
                                    windowDaysFrom: 'accountOpenedAt',
                                    windowDays: 45,
                                    notes: [
                                        'Switch using CASS within 45 days.',
                                        'For joint 1st Accounts, at least one joint holder must switch from a sole account in their own name or another joint account in the same names.',
                                    ],
                                },
                                {
                                    type: 'standingOrdersOrDirectDebits',
                                    countAtLeast: 2,
                                    windowDaysFrom: 'accountOpenedAt',
                                    windowDays: 45,
                                    mustBeActive: null as unknown as boolean,
                                    notes: [
                                        'Switch must include at least two Direct Debits or standing orders.',
                                        'It is not stated that there must be a minimum amount or who the payments must be to.',
                                        'It is not stated that they must be active, collected from, or collect within any timeframe.',
                                    ],
                                },
                                {
                                    type: 'payIn',
                                    amount: 1000,
                                    windowDaysFrom: 'accountOpenedAt',
                                    windowDays: 45,
                                    notes: ['This amount can be paid in all at once or at different times within the 45 days.'],
                                },
                                {
                                    type: 'debitCardTx',
                                    countAtLeast: 5,
                                    windowDaysFrom: 'accountOpenedAt',
                                    windowDays: 45,
                                    notes: [
                                        'It is not stated that there must be a minimum amount.',
                                        'Excludes gambling transactions, credit card or insurance payments, cash withdrawals, and card to card payments.',
                                    ],
                                },
                                {
                                    type: 'login',
                                    channel: 'appOrOnlineBanking',
                                    windowDaysFrom: 'accountOpenedAt',
                                    windowDays: 45,
                                    notes: ['Register and log into the App or Online Banking.'],
                                },
                            ],
                        },
                    ],
                    payment: {
                        type: 'credit',
                        amount: 175,
                        payout: {
                            label: 'Credited to your 1st Account by the 20th of the following month after criteria fulfilment.',
                            windowDaysFrom: 'criteriaMetAt',
                            date: '20th',
                            deliveryMethod: 'credit',
                            sender: 'first direct',
                        },
                        notes: [
                            'Paid only if you meet all criteria and still have the new 1st Account on the payment date.',
                            'For joint accounts, only one £175 payment is made into the joint account.',
                        ],
                    },
                },
            ],
            eligibility: [
                "Not eligible if you're already a first direct customer, have previously held a first direct product, or opened an HSBC current account on or after 1 January 2018.",
            ],
            links: [
                { label: 'first direct Switch Page', url: 'https://www.firstdirect.com/banking/switching-bank-accounts/' },
                { label: 'Terms & Conditions', url: './documents/first direct/Sep26-Switch_T&Cs.pdf' },
            ],
        },
        {
            id: 'santander_cass_nov2025',
            bankID: 'ob-santander',
            scheme: 'CASS',
            title: '£225 Switch',
            headline: { credit: 200, amazon: 25 },
            value: 225,
            availability: { start: '2025-11-10' },
            components: [
                {
                    id: 'amazon',
                    title: '£25 Amazon Gift Card',
                    requirements: [
                        {
                            type: 'form',
                            url: 'https://rewards.vouchersent.com/FOD/Reward/Registration?key=F66BBE84-A27E-4F2A-83F8-D017CA7C360B&UID=24d12396-af26-4aa8-80b3-4833d9889ce6',
                            notes: [
                                'Offer provided by VoucherSent, a brand of Optimise Media (UK) Ltd.',
                                'Requires name and email information.',
                                'Requires full completion of "£200 Switch Incentive" criteria.',
                                'Must be 18+.',
                            ],
                        },
                    ],
                    payment: { type: 'amazon', amount: 25 },
                },
                {
                    id: 'credit',
                    title: '£200 Switch Incentive',
                    requirements: [
                        {
                            kind: 'group',
                            op: 'AND',
                            children: [
                                {
                                    type: 'openAccount',
                                    accountTypes: ['Santander Everyday', 'Edge', 'Edge Up', 'Edge Explorer', 'Private (v2)'],
                                    notes: ['Or use an existing account.'],
                                },
                                { type: 'switch', scheme: 'CASS', mustBeFull: true, },
                                {
                                    type: 'payIn', amount: 1500, windowDaysFrom: 'switchRequest', windowDays: 60,
                                    notes: ['Through 1 or more payments.'],
                                },
                                {
                                    type: 'directDebits',
                                    count: 2,
                                    mustBeActive: true,
                                    windowDaysFrom: 'switchRequest',
                                    windowDays: 60,
                                    notes: [
                                        'Direct Debits must be active at the point of eligibility assesment.',
                                        'Must satisfy Santander\'s list of "Household Direct Debits" (Direct Debits for the payment of your council tax, mobile phone, home phone, broadband, paid-for TV packages, and water, gas and electricity bills.)',
                                        'Does not include Direct Debits set up to fund a savings account you have with Santander, cahoot, or Cater Allen.',
                                    ],
                                },
                            ],
                        }
                    ],
                    payment: {
                        type: 'credit', amount: 200,
                        payout: {
                            label: 'Credited to your Santander account within 30 days of assesment (which will be 60 days after instruction to switch).',
                            windowDaysFrom: 'switchRequest', days: 90,
                            deliveryMethod: 'credit',
                            sender: 'Santander',
                        },
                        notes: [
                            'Single payment, credited directly.',
                            'Joint account holder(s) won’t be entitled to more than 1 payment between them.',
                            'If you request a switch after the switcher offer starts but the offer is withdrawn before the switch completes: you will still be eligible for the payment as long as you meet the eligibility criteria.',
                        ],
                    },
                },
            ],
            eligibility: [
                'Cannot switch from an account with Santander, cahoot, or Cater Allen.',
                'Nobody named on the Santander account can have held a Santander current account on 1 Jan 2025.',
                'Nobody named on the Santander account can have previously received an incentive payment to switch to a Santander current account.',
                'Must be a UK resident.',
            ],
            links: [
                { label: 'Santander Switch Page', url: 'https://www.santander.co.uk/personal/support/current-accounts/switching' },
                { label: 'Santander Terms & Conditions', url: './documents/santander/Nov25-Switch_T&Cs.pdf' },
                { label: 'VoucherSent Terms & Conditions', url: './documents/santander/Jan26-VoucherSent_T&Cs.pdf' },
            ],
        },
        {
            id: 'tsb_cass_jan2026',
            bankID: 'ob-tsb',
            scheme: 'CASS',
            title: '£200 Switch',
            headline: { credit: 150, credit2: 50 },
            value: 200,
            availability: { start: '2026-01-01', end: '2026-02-17', },
            components: [
                {
                    id: '150_switch_incentive',
                    title: '£150 Switch Incentive',
                    headline: { credit: 150 },
                    requirements: [
                        {
                            kind: 'group',
                            op: 'AND',
                            children: [
                                {
                                    type: 'openAccount',
                                    accountTypes: ['Spend & Save', 'Spend & Save Plus'],
                                    notes: [
                                        'Or, hold a TSB personal current account (which is not an Under 19s current account) that you opened before 13 January 2026.',
                                    ],
                                },
                                {
                                    type: 'switch', scheme: 'CASS', mustBeFull: true,
                                    byDate: '2026-03-20',
                                    notes: [
                                        'Complete a full switch, using CASS, by 20 March 2026.',
                                        'NB. The switch will take at least 7 working days to complete from submission.',
                                    ],
                                },
                                {
                                    type: 'debitCardTx', countAtLeast: 5,
                                    byDate: '2026-03-20',
                                    notes: [
                                        'Payments can be of any value.',
                                        'Payments made by the account\'s debit card includes Apple Pay, Samsung Pay, and Google Pay.',
                                    ],
                                },
                                {
                                    type: 'login', channel: 'tsbApp',
                                    byDate: '2026-03-20',
                                },
                                {
                                    type: 'payIn', amount: 1000,
                                    byDate: '2026-03-20',
                                    notes: [
                                        'Payment can be made in one or more deposits.',
                                        'Deposits must come from any account held with another bank or building society.',
                                        'Funds already held in a TSB personal current account prior to 13 January 2026 will not count.',
                                        'Funds must be in your account by 23.59pm on 20 March 2026.',
                                    ],
                                },
                            ],
                        },
                    ],
                    payment: {
                        type: 'credit', amount: 150,
                        payout: {
                            label: 'Credited to your TSB account by 7 April 2026.',
                            date: '2026-04-07',
                            deliveryMethod: 'credit',
                            sender: 'TSB',
                        },
                    },
                },
                {
                    id: '50_additional',
                    title: '£50 Additional Credit Reward',
                    headline: { credit: 50 },
                    requirements: [
                        {
                            type: 'payIn', amount: 1000,
                            beforeDate: '2026-05-01', afterDate: '2026-04-01',
                            notes: [
                                'Must have completed all "£150 Switch Incentive" criteria.',
                                '£1,000 payment made for "£150 Switch Incentive" criteria does not count towards this.',
                                'Funds must be deposited into account during month of April 2026.',
                                'Payment can be made in one or more deposits.',
                                'Deposits must come from any account held with another bank or building society.',
                                'Funds already held in a TSB personal current account prior to 1 April 2026 will not count.',
                                'Funds must be in your account before 1 May 2026.',
                            ],
                        },
                    ],
                    payment: {
                        type: 'credit', amount: 50,
                        payout: {
                            label: 'Credited to your TSB account by 31 May 2026.',
                            date: '2026-05-31',
                            deliveryMethod: 'credit',
                            sender: 'TSB',
                        },
                    },
                },
            ],
            links: [
                { label: 'TSB Switch Page', url: 'https://www.tsb.co.uk/current-accounts/switcher-spend-and-save.html' },
                { label: 'Terms & Conditions', url: './documents/tsb/Jan26-Switch_T&Cs.pdf' },
            ],
        },
        {
            id: 'rbs_cass_feb2026',
            bankID: 'ob-rbs',
            scheme: 'CASS',
            title: '£150 Switch',
            headline: { credit: 150 },
            value: 150,
            availability: { start: '2026-02-17', end: '2026-05-28', },
            requirements: [
                {
                    kind: 'group',
                    op: 'AND',
                    children: [
                        {
                            type: 'openAccount',
                            accountTypes: ['Select', 'Reward'],
                            notes: [
                                'Apply for a new account between 17th February 2026 and 28th May 2026.',
                                'Must not be a joint account.',
                            ],
                        },
                        {
                            type: 'switch', scheme: 'CASS', mustBeFull: true,
                            mustRequestBy: '2026-05-28', mustCompleteBy: '2026-06-36',
                            notes: [
                                'Original account cannot be RBS, NatWest, or Ulster Bank.',
                            ],
                        },
                        {
                            type: 'payIn', amount: 1250,
                            windowDaysFrom: 'switchCompletedAt', windowDays: 60,
                            notes: [
                                'This can be made of multiple payments into your account.',
                                'Funds transferred during the switch process count towards the deposit requirement.'
                            ],
                        },
                        {
                            type: 'login', channel: 'royalBankApp',
                            windowDaysFrom: 'switchCompletedAt', windowDays: 60,
                            notes: ['This can be done on any device that supports the RBS Mobile Banking App.'],
                        },
                    ],
                },
            ],
            eligibility: [
                'Offer not valid if you had an existing current or savings account on 17 Feb 2026.',
                'Must not have received cash from an RBS, NatWest, or Ulster Bank switch offer before.',
                'Must be a UK resident.',
            ],
            payment: {
                type: 'credit', amount: 150,
                payout: {
                    label: 'Credited to your RBS account by 31 May 2026.',
                    windowDaysFrom: 'criteriaMetAt', windowDays: 30,
                    deliveryMethod: 'credit',
                    sender: 'Royal Bank of Scotland',
                },
                notes: [
                    'Account must remain open at time of payment.',
                ],
            },
            // bonuses: [
            //     {
            //         type: 'regularSaver',
            //         title: 'Digital Regular Saver',
            //         openBy: '2026-06-16',
            //         maxSavePerMonth: 150,
            //         notes: ['Interest paid monthly (per note).'],
            //     },
            // ],
            links: [
                { label: 'RBS Switch Page', url: 'https://www.rbs.co.uk/current-accounts/switch-your-bank-account-to-rbs.html' },
                { label: 'Terms & Conditions', url: './documents/rbs/2026-Switch_T&Cs.pdf' },
            ],
        },
        {
            id: 'natwest_cass_feb2026',
            bankID: 'ob-natwest',
            scheme: 'CASS',
            title: '£150 Switch',
            headline: { credit: 150 },
            value: 150,
            availability: { start: '2026-02-17', end: '2026-05-28', },
            requirements: [
                {
                    kind: 'group',
                    op: 'AND',
                    children: [
                        {
                            type: 'openAccount',
                            accountTypes: ['Select', 'Reward'],
                            notes: [
                                'Apply for a new account between 17th February 2026 and 28th May 2026.',
                                'Must not be a joint account.',
                            ],
                        },
                        {
                            type: 'switch', scheme: 'CASS', mustBeFull: true,
                            mustRequestBy: '2026-05-28', mustCompleteBy: '2026-06-36',
                            notes: [
                                'Original account cannot be RBS, NatWest, or Ulster Bank.',
                            ],
                        },
                        {
                            type: 'payIn', amount: 1250,
                            windowDaysFrom: 'switchCompletedAt', windowDays: 60,
                            notes: [
                                'This can be made of multiple payments into your account.',
                                'Funds transferred during the switch process count towards the deposit requirement.'
                            ],
                        },
                        {
                            type: 'login', channel: 'royalBankApp',
                            windowDaysFrom: 'switchCompletedAt', windowDays: 60,
                            notes: ['This can be done on any device that supports the Natwest Mobile Banking App.'],
                        },
                    ],
                },
            ],
            eligibility: [
                'Offer not valid if you had an existing current or savings account on 17 Feb 2026.',
                'Must not have received cash from an RBS, NatWest, or Ulster Bank switch offer before.',
                'Must be a UK resident.',
            ],
            payment: {
                type: 'credit', amount: 150,
                payout: {
                    label: 'Credited to your Natwest account by 31 May 2026.',
                    windowDaysFrom: 'criteriaMetAt', windowDays: 30,
                    deliveryMethod: 'credit',
                    sender: 'Royal Bank of Scotland',
                },
                notes: [
                    'Account must remain open at time of payment.',
                ],
            },
            // bonuses: [
            //     {
            //         type: 'regularSaver',
            //         title: 'Digital Regular Saver',
            //         openBy: '2026-06-16',
            //         maxSavePerMonth: 150,
            //         notes: ['Interest paid monthly (per note).'],
            //     },
            // ],
            links: [
                { label: 'Natwest Switch Page', url: 'https://www.natwest.com/current-accounts/switch-your-banking-to-natwest.html' },
                { label: 'Terms & Conditions', url: './documents/natwest/2026-Switch_T&Cs.pdf' },
            ],
        },
        {
            id: 'nationwide_cass_sep2025',
            bankID: 'ob-nationwide',
            scheme: 'CASS',
            title: '£175 Switch',
            headline: { credit: 175 },
            availability: { start: '2025-09-18', end: '2026-03-04' },
            value: 175,
            requirements: [
                {
                    kind: 'group',
                    op: 'AND',
                    children: [
                        {
                            type: 'openAccount',
                            accountTypes: ['FlexDirect', 'FlexAccount', 'FlexPlus'],
                            notes: ['Or use existing one of these accounts.'],
                        },
                        {
                            type: 'switch', scheme: 'CASS', mustBeFull: true,
                            windowDaysFrom: 'accountOpenedAt', windowDays: 28,
                            notes: [
                                'Switched account must contain Direct Debits (see below).',
                                'Switched accoutn must be in your name.',
                                'The switch must not habe been requested before 18 September 2025, even if it completes after this date.',
                            ],
                        },
                        {
                            type: 'directDebits',
                            countAtLeast: 2,
                            mustBeActive: null as unknown as boolean,
                            notes: [
                                'Other automatic payments, like standing orders and recurring card payments, do not count.',
                                'It is not stated that there must be a minimum amount or who the payments must be to.',
                                'It is not stated that they must be active, collected from, or collect within any timeframe.',
                            ],
                        },
                        {
                            type: 'payIn', amount: 1000,
                            windowDaysFrom: 'accountOpenedAt', windowDays: 31,
                            notes: [
                                'Includes money transferred as part of the switch.',
                                'Transferring money from other Nationwide accounts or Visa credits will not count.',
                                'Money already held in a Natiopnwide account will not count.',
                            ],
                        },
                        {
                            type: 'debitCardTx', count: 1,
                            windowDaysFrom: 'accountOpenedAt', windowDays: 31,
                            notes: [
                                'Payments made by the account\'s debit card includes Apple Pay, Samsung Pay, Google Pay, and recurring card payments.',
                                'Excludes gambling and crypto transactions, taking out cash and money transfers, buying foreign currency or traveller’s cheques, money orders, loan, lease and mortgage payments.',
                            ],
                        },
                    ],
                },
            ],
            payment: {
                type: 'credit', amount: 175,
                payout: {
                    label: 'Credited to your Nationwide account within 10 days of criteria completion.',
                    windowDaysFrom: 'criteriaMetAt', windowDays: 10,
                    deliveryMethod: 'credit',
                    sender: 'Nationwide',
                },
                notes: [
                    'The account must be open when the payment is made.',
                    'Joint accounts will receive one payment between them.',
                    'It will appear on statement as "Switching Offer".',
                ],
            },
            eligibility: [
                'You can’t get this offer if you’ve had one of Nationwide’s current account switch offers in the past (which began in 2021).',
                'Unless you received an offer before on a sole current account: you can get it when switching into a joint current account, if you have not received an offer before on a joint current account.',
                'Or, unless you received an offer before on a joint current account: you can get it when switching into a sole current account, if you have not received an offer before on a sole current account.',
                'An account holder must not: have an account in collections, be subject to sanctions or a restraint order, or be suspected of fraud or unlawful activity.',
            ],
            canRepeat: 'joint',
            links: [
                { label: 'Nationwide Switch Page', url: 'https://www.nationwide.co.uk/current-accounts/switch/' },
                { label: 'Terms & Conditions', url: './documents/nationwide/Sep25-Switch_T&Cs.pdf' },
            ],
        },
        {
            id: 'co-op_cass_jan2026',
            bankID: 'bagel-coop',
            scheme: 'CASS',
            title: '£175 Switch',
            headline: { credit: 100, credit2Text: '3x £25 credit' },
            availability: { start: '2026-01-28', },
            value: 175,
            components: [
                {
                    id: '100_credit',
                    title: '£100 Switch Incentive',
                    requirements: [
                        {
                            kind: 'group',
                            op: 'AND',
                            children: [
                                {
                                    type: 'openAccount',
                                    accountTypes: ['Standard Current Account', 'Current Account Plus', 'Privilege', 'Privilege Premier', 'Everyday Extra'],
                                    notes: ['Or use an existing one.'],
                                },
                                {
                                    type: 'switch', scheme: 'CASS', mustBeFull: true,
                                    windowDaysFrom: 'accountOpenedAt', windowDays: 14,
                                    notes: [
                                        'smile current accounts, student accounts, and Cashminder accounts are excluded from this offer.',
                                        'Current Account Switch Service request must be received from between 28/01/2026 and offer withdrawal date.',
                                    ],
                                },
                                {
                                    type: 'payIn', amount: 1000,
                                    windowDaysFrom: 'accountOpenedAt', windowDays: 30,
                                    notes: [
                                        'Payment can be made in one or more deposits.',
                                        'Includes money transferred as part of the switch.',
                                    ],
                                },
                                {
                                    type: 'directDebits', countAtLeast: 2, mustBeActive: true,
                                    windowDaysFrom: 'accountOpenedAt', windowDays: 30,
                                    notes: [
                                        'Active at the point of payment.',
                                        'This can include any that are transferred as part of the switch.',
                                    ],
                                },
                                {
                                    type: 'debitCardTx', countAtLeast: 10,
                                    windowDaysFrom: 'accountOpenedAt', windowDays: 30,
                                    notes: [
                                        'Payments made by the account\'s debit card includes any digital wallet transactions.',
                                        'Excludes pending transactions.',
                                    ],
                                },
                                {
                                    type: 'register', channel: 'appOrOnlineBanking',
                                    windowDaysFrom: 'accountOpenedAt', windowDays: 30,
                                    notes: ['Register and log into the App or Online Banking.'],
                                },
                            ],
                        },
                    ],
                    payment: {
                        type: 'credit', amount: 100,
                        payout: {
                            label: 'Credited to your account within 7 days of criteria completion.',
                            windowDaysFrom: 'criteriaMetAt', windowDays: 7,
                            deliveryMethod: 'credit',
                            sender: 'Co-operative Bank',
                        },
                        notes: [
                            'Your current account must be open at the time the incentive is paid to be eligible to receive the payment.',
                            'You are entitled to only one incentive payment, even if you switch more than one account.',
                            'If the account is in joint names, Co-op will only credit the account with £100, not £100 for each person named on the account.',
                            'The transaction will be labelled as ‘Adjustment’ in your account.',
                        ],
                    },
                },
                {
                    id: '25_credit_1',
                    title: '£25 \'Stay\' Incentive (1)',
                    requirements: [
                        {
                            kind: 'group',
                            op: 'AND',
                            children: [
                                {
                                    type: 'payIn', amount: 1000,
                                    windowMonthsFrom: 'switchPayment', windowMonths: 1,
                                    notes: [
                                        'Payment can be made in one or more deposits.',
                                        'Deposits must be within 1 month of "£100 Switch Incentive" payment.',
                                    ],
                                },
                                {
                                    type: 'debitCardTx', countAtLeast: 10,
                                    windowMonthsFrom: 'switchPayment', windowMonths: 1,
                                    notes: [
                                        'Payments made by the account\'s debit card includes any digital wallet transactions.',
                                        'Excludes pending transactions.',
                                    ],
                                },
                                {
                                    type: 'directDebits', countAtLeast: 2, mustBeActive: true,
                                    windowMonthsFrom: 'switchPayment', windowMonths: 1,
                                    notes: [
                                        'Active on the final day of the qualifying period.',
                                    ],
                                },
                            ],
                        },
                    ],
                    payment: {
                        type: 'credit', amount: 25,
                        payout: {
                            label: 'Credited to your account within 7 days of criteria completion.',
                            windowDaysFrom: 'criteriaMetAt', windowDays: 7,
                            deliveryMethod: 'credit',
                            sender: 'Co-operative Bank',
                        },
                        notes: [
                            'Must have completed all "£100 Switch Incentive" criteria.',
                            'Your current account must be open at the time the incentive is paid to be eligible to receive the payment.',
                            'If the account is in joint names, Co-op will only credit the account with £25, not £25 for each person named on the account.',
                        ],
                    },
                },
                {
                    id: '25_credit_2',
                    title: '£25 \'Stay\' Incentive (2)',
                    requirements: [
                        {
                            kind: 'group',
                            op: 'AND',
                            children: [
                                {
                                    type: 'payIn', amount: 1000,
                                    windowMonthsFrom: 'switchPayment', windowMonths: 1,
                                    notes: [
                                        'Payment can be made in one or more deposits.',
                                        'Deposits must be within 1 month of "£100 Switch Incentive" payment.',
                                    ],
                                },
                                {
                                    type: 'debitCardTx', countAtLeast: 10,
                                    windowMonthsFrom: 'switchPayment', windowMonths: 1,
                                    notes: [
                                        'Payments made by the account\'s debit card includes any digital wallet transactions.',
                                        'Excludes pending transactions.',
                                    ],
                                },
                                {
                                    type: 'directDebits', countAtLeast: 2, mustBeActive: true,
                                    windowMonthsFrom: 'switchPayment', windowMonths: 1,
                                    notes: [
                                        'Active on the final day of the qualifying period.',
                                    ],
                                },
                            ],
                        },
                    ],
                    payment: {
                        type: 'credit', amount: 25,
                        payout: {
                            label: 'Credited to your account within 7 days of criteria completion.',
                            windowDaysFrom: 'criteriaMetAt', windowDays: 7,
                            deliveryMethod: 'credit',
                            sender: 'Co-operative Bank',
                        },
                        notes: [
                            'Must have completed all "£100 Switch Incentive" criteria.',
                            'Your current account must be open at the time the incentive is paid to be eligible to receive the payment.',
                            'If the account is in joint names, Co-op will only credit the account with £25, not £25 for each person named on the account.',
                        ],
                    },
                },
                {
                    id: '25_credit_3',
                    title: '£25 \'Stay\' Incentive (3)',
                    requirements: [
                        {
                            kind: 'group',
                            op: 'AND',
                            children: [
                                {
                                    type: 'payIn', amount: 1000,
                                    windowMonthsFrom: 'switchPayment', windowMonths: 1,
                                    notes: [
                                        'Payment can be made in one or more deposits.',
                                        'Deposits must be within 1 month of "£100 Switch Incentive" payment.',
                                    ],
                                },
                                {
                                    type: 'debitCardTx', countAtLeast: 10,
                                    windowMonthsFrom: 'switchPayment', windowMonths: 1,
                                    notes: [
                                        'Payments made by the account\'s debit card includes any digital wallet transactions.',
                                        'Excludes pending transactions.',
                                    ],
                                },
                                {
                                    type: 'directDebits', countAtLeast: 2, mustBeActive: true,
                                    windowMonthsFrom: 'switchPayment', windowMonths: 1,
                                    notes: [
                                        'Active on the final day of the qualifying period.',
                                    ],
                                },
                            ],
                        },
                    ],
                    payment: {
                        type: 'credit', amount: 25,
                        payout: {
                            label: 'Credited to your account within 7 days of criteria completion.',
                            windowDaysFrom: 'criteriaMetAt', windowDays: 7,
                            deliveryMethod: 'credit',
                            sender: 'Co-operative Bank',
                        },
                        notes: [
                            'Must have completed all "£100 Switch Incentive" criteria.',
                            'Your current account must be open at the time the incentive is paid to be eligible to receive the payment.',
                            'If the account is in joint names, Co-op will only credit the account with £25, not £25 for each person named on the account.',
                        ],
                    },
                },
            ],
            eligibility: [
                'Must have not previously benefitted as a new customer from this, or any previous Co-operative Bank current account switch offers since 01/11/2022.',
                'This offer cannot be used in conjunction with any other switching offer with The Co-operative Bank.',
                'You will not be eligible for this offer if you are an existing customer that closes a Co-operative Bank or Smile current account of any type within the offer period.',
            ],
            links: [
                { label: 'Co-op Switch Page', url: 'https://www.co-operativebank.co.uk/products/bank-accounts/switch-to-us/' },
                { label: 'Terms & Conditions', url: './documents/co-op/Jan26-Switch_T&Cs.pdf' },
            ],
        },
        {
            id: 'tsb_yes_days_prizedraw_mar2026',
            bankID: 'ob-tsb',
            scheme: 'PROMO',
            title: '£35,000 Yes Days Prize Draw',
            headline: { prize: 'Two £35,000 prize draws' },
            value: 35000, // sorting only, not expected value
            availability: { start: '2026-01-20', end: '2026-03-02' },
            requirements: [
                {
                    kind: 'group',
                    op: 'AND',
                    children: [
                        {
                            type: 'holdAccount', accountTypes: ['personal savings account'],
                            notes: [
                                'All TSB personal savings accounts are eligible, except for: Monthly Saver; Matured Funds; Young Saver; Young Saver Passbook; and Junior Cash ISA.',
                            ],
                        },
                        {
                            kind: 'group',
                            op: 'OR',
                            children: [
                                {
                                    type: 'entry_deposit', countAtMost: 25, amount: 2500,
                                    notes: [
                                        'One entry per single deposit of £2,500 (or multiple of) made before 23:59 on 2 Mar 2026.',
                                        'Funds must originate from outside TSB and must be deposited in pounds Sterling.',
                                        'A maximum of 25 deposit entries per customer (or, 24 deposit entries, if a postal entry is made).',
                                        'Money must not leave until on/after 3 Mar 2026.',
                                    ],
                                },
                                {
                                    type: 'entry_notice', channel: 'postal', countAtMost: 1,
                                    notes: [
                                        'You can enter the prize draw by writing to us by first or second class post in a sealed envelope to arrive with us during the Promotion Period to:',
                                        'TSB Bank plc Prize Draw, 1st Floor, Henry Duncan House, 120 George Street, Edinburgh, EH2 4LH,',
                                        'with your full name, address, and sort code and account number of your TSB Personal Current Account, requesting to be entered into the TSB Yes Days Prize Draw.',
                                        'Maximum one entry by this route per customer.',
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
            eligibility: [
                'Must hold a TSB personal current account',
                'Must be an 18+ UK resident.',
                'An account holder must not: have an account in collections, be subject to sanctions or a restraint order, or be suspected of fraud or unlawful activity.',
                'Must not be involved in arranging the prize draw.',
            ],
            payment: {
                type: 'credit', amount: 35000,
                payout: {
                    label: 'Two winners will be drawn at random and notified by 20 April 2026.',
                    date: '2026-04-20',
                    deliveryMethod: 'credit',
                    sender: 'TSB',
                },
                notes: [],
            },
            links: [{ label: 'TSB Yes Days Page', url: 'https://www.tsb.co.uk/savings/yes-days.html' }],
        },
        {
            id: 'nationwide_fairer_share_2026',
            bankID: 'ob-nationwide',
            scheme: 'PROMO',
            title: '£100 Fairer Share',
            headline: { credit: 100 },
            value: 100,
            availability: { start: '2026' },
            requirements: [
                {
                    kind: 'group',
                    op: 'AND',
                    children: [
                        // A: qualifying account
                        {
                            kind: 'group', op: 'OR',
                            label: 'Qualifying Account',
                            children: [
                                // FlexPlus
                                {
                                    kind: 'group', op: 'AND',
                                    label: 'FlexPlus',
                                    children: [
                                        { type: 'holdAccount', accountTypes: ['FlexPlus'], anchor: '2025-03-31' },
                                        {
                                            type: 'payFee', anchor: '2025-03-31',
                                            meta: 'monthly',
                                        },
                                    ],
                                },
                                // FlexOne / Student / Graduate
                                {
                                    kind: 'group', op: 'AND',
                                    label: 'FlexOne, FlexStudent, or FlexGraduate',
                                    children: [
                                        { type: 'holdAccount', accountTypes: ['FlexOne', 'FlexStudent', 'FlexGraduate'], anchor: '2025-03-31' },
                                        {
                                            kind: 'group',
                                            op: 'OR',
                                            children: [
                                                {
                                                    type: 'payments', countAtLeast: 1,
                                                    // month: '2025-03',
                                                    notes: ['At least one payment in OR one payment out in March 2025 (excluding interest/charges/adjustments).'],
                                                },
                                                { type: 'switch', afterDate: '2025-01-01', byDate: '2025-03-31', notes: ['CASS switch into FlexOne/FlexStudent between 1 Jan and 31 Mar 2025.'] },
                                            ],
                                        },
                                    ],
                                },
                                // FlexAccount / FlexDirect / FlexBasic
                                {
                                    kind: 'group', op: 'AND',
                                    label: 'FlexAccount, FlexDirect, or FlexBasic',
                                    children: [
                                        { type: 'holdAccount', accountTypes: ['FlexAccount', 'FlexDirect', 'FlexBasic'], anchor: '2025-03-31' },
                                        {
                                            kind: 'group',
                                            op: 'OR',
                                            children: [
                                                {
                                                    kind: 'group',
                                                    op: 'AND',
                                                    children: [
                                                        {
                                                            type: 'meetsInTwoOfThreeMonths',
                                                            // months: ['2025-01', '2025-02', '2025-03'],
                                                        },
                                                        { type: 'payIn', amount: 500, notes: ['Transfers from other Nationwide accounts do not count.'] },
                                                        { type: 'paymentsOut', countAtLeast: 2 },
                                                    ],
                                                },
                                                {
                                                    kind: 'group',
                                                    op: 'AND',
                                                    children: [
                                                        {
                                                            type: 'meetsInTwoOfThreeMonths',
                                                            // months: ['2025-01', '2025-02', '2025-03'],
                                                        },
                                                        { type: 'paymentsOut', countAtLeast: 10 },
                                                    ],
                                                },
                                                { type: 'switch', afterDate: '2025-01-01', byDate: '2025-03-31', notes: ['CASS switch into the account between 1 Jan and 31 Mar 2025.'] },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                        // B: qualifying savings / mortgage
                        {
                            kind: 'group', op: 'OR',
                            children: [
                                {
                                    type: 'balance', amount: 100, accountTypes: ['savings'],
                                    // inMonth: '2025-03',
                                    notes: ['At least £100 total at end of any day in March 2025 (eligible personal savings/cash ISAs).'],
                                },
                                {
                                    type: 'balance', amount: 100, accountTypes: ['mortgage'],
                                    anchor: '2025-03-31', notes: ['Owed at least £100 on Nationwide residential mortgage on 31 March 2025.'],
                                },
                            ],
                        },
                    ],
                },
            ],
            eligibility: [
                'Eligiblity criteria is not yet known, but it is expected to be similar to previous "Fairer Share" offers. Information in this is based on 2025\'s offer.'
            ],
            payment: {
                type: 'credit', amount: 100,
                payout: {
                    label: 'Paid into a Nationwide current account between 18 Jun 2025 and 4 Jul 2025.',
                    afterDate: '2025-06-18',
                    beforeDate: '2025-07-04',
                    deliveryMethod: 'credit',
                    sender: 'Nationwide',
                } as any,
                notes: [
                    'Only one £100 payment per eligible member.',
                    'Appears as “Nationwide Fairer Share Payment”.',
                    'Treated as interest for UK income tax; Nationwide reports it to HMRC.',
                ],
            },
            links: [
                { label: 'Nationwide Fairer Share Page', url: 'https://www.nationwide.co.uk/about-us/fairer-share' },
                { label: 'Terms & Conditions (2025)', url: 'https://www.nationwide.co.uk/about-us/fairer-share/terms-and-conditions' },
                { label: 'Terms & Conditions (2025) (PDF)', url: './documents/nationwide/2025-FairerShare_T&Cs.pdf' },
            ],
        },
        {
            id: 'natwest_invest_isa_2026',
            bankID: 'ob-natwest',
            scheme: 'PROMO',
            title: 'Up to £100,000 Invest Prize Draw',
            headline: { prize: '1,051 prize draws • 1x £100,000 • 50x £1,000 • 1,000x £100' },
            value: 100000, // sorting only, not expected value
            availability: { start: '2026-01-12', end: '2026-04-30' },
            requirements: [
                {
                    kind: 'group',
                    op: 'AND',
                    children: [
                        {
                            type: 'holdAccount', accountTypes: ['Stocks and Shares ISA'],
                            notes: [
                                'ISA must remain open until 23:59 on 30 April 2026.'
                            ]
                        },
                        {
                            kind: 'group',
                            op: 'XOR',
                            children: [
                                {
                                    type: 'entry_deposit', amount: 50,
                                    notes: [
                                        'One entry per £50 invested into a NatWest Invest Stocks & Shares ISA during the entry period.',
                                        'Includes regular and lump sum contributions.',
                                        'ISA transfers do not count.',
                                        'Entries calculated on total contributions minus withdrawals.'
                                    ]
                                },
                                {
                                    type: 'entry_notice', channel: 'email', countAtMost: 1,
                                    notes: [
                                        'Free entry by emailing Investprizedraw@natwest.com.',
                                        'Must include full name, DOB, telephone number, email, first line of address and postcode.',
                                        'Must be received before 23:59 on 30 April 2026.',
                                        'Not available if eligible for deposit-based entries.'
                                    ]
                                }
                            ]
                        }
                    ],
                },
            ],
            eligibility: [
                'Account must not be closed before 30 April 2026.',
                'Must be 18+ and UK resident.',
                'Not open to NatWest Group employees or associated persons.',
            ],
            payment: {
                type: 'credit',
                payout: {
                    label: 'Draw by 31 May 2026. Prizes paid by 15 June 2026.',
                    deliveryMethod: 'credit',
                    sender: 'NatWest'
                },
                notes: [
                    '1x £100,000 prize.',
                    '50x £1,000 prizes.',
                    '1,000x £100 prizes.',
                    'One prize per customer.'
                ]
            },
            links: [
                { label: 'NatWest Prize Draw Page', url: 'https://www.natwest.com/investments/prize-draw.html' },
                { label: 'Terms & Consitions', url: './documents/natwest/2026-InvestISA-PrizeDraw_T&Cs.pdf' },
            ]
        },
    ]
} as const;
