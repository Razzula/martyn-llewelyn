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

type Requirement = {
    type: string;
    scheme?: 'CASS';
    mustBeFull?: boolean;
    amount?: number;
    count?: number;
    countAtLeast?: number;
    mustBeActive?: boolean | null;
    windowDaysFrom?: string;
    windowDays?: number | null;
    anchor?: string;
    mustRequestBy?: string;
    url?: string;
    accountTypes?: string[];
    channel?: string;
    note?: string;
};

type Payment = {
    type: 'credit' | 'amazon' | 'prize';
    amount?: number;
    payout?: { windowDaysFrom?: string; days?: number; date?: string; label?: string };
    note?: string;
};

type Component = {
    id: string;
    title: string;
    headline?: Headline;
    requirements?: Requirement[];
    deadlines?: { type: string; date: string; label?: string }[];
    payment?: Payment[];
    noteLong?: string;
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
    timelineNotes?: { date: string; label: string }[];
    bonuses?: { type: string; title?: string; openBy?: string; maxSavePerMonth?: number; note?: string }[];
    noteLong?: string;
    canRepeat?: 'joint';
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
            links: [
                { label: 'first  direct Page', url: 'https://www.firstdirect.com/banking/switching-bank-accounts/' },
                { label: 'Terms & Conditions', url: './documents/first direct/Sep26-Switch_T&Cs.pdf' },
            ],
            eligibility: [
                "Not eligible if you're already a first direct customer, have previously held a first direct product, or opened an HSBC current account on or after 1 January 2018.",
            ],
            components: [
                {
                    id: 'amazon',
                    title: '£50 Amazon Gift Card',
                    requirements: [
                        {
                            type: 'form',
                            url: 'https://rewards.giftcloud.com/uk/capture/msmltd/46286?urn=26b58f92-7f2f-4fdb-bb86-a0420d018163',
                        },
                    ],
                    payment: [
                        {
                            type: 'amazon',
                            amount: 50,
                        },
                    ],
                },
                {
                    id: 'credit',
                    title: '£175 Switch Incentive',
                    requirements: [
                        {
                            type: 'openAccount',
                            accountTypes: ['1st Account'],
                            note: 'Open a 1st Account on or after 9 September until the offer is withdrawn.',
                        },
                        {
                            type: 'switch',
                            scheme: 'CASS',
                            mustBeFull: true,
                            windowDaysFrom: 'accountOpenedAt',
                            windowDays: 45,
                            note: 'Switch using CASS within 45 days. For joint 1st Accounts, at least one joint holder must switch from a sole account in their own name or another joint account in the same names.',
                        },
                        {
                            type: 'standingOrdersOrDirectDebits',
                            countAtLeast: 2,
                            windowDaysFrom: 'accountOpenedAt',
                            windowDays: 45,
                            mustBeActive: null as unknown as boolean,
                            note: 'Switch must include at least two Direct Debits or standing orders.',
                        },
                        {
                            type: 'payIn',
                            amount: 1000,
                            windowDaysFrom: 'accountOpenedAt',
                            windowDays: 45,
                            note: 'Minimum £1,000 (can be paid in all at once or in multiple amounts within the 45 days).',
                        },
                        {
                            type: 'debitCardTx',
                            countAtLeast: 5,
                            windowDaysFrom: 'accountOpenedAt',
                            windowDays: 45,
                            note: 'At least 5 debit card payments. Excludes gambling, credit card or insurance payments, cash withdrawals, and card-to-card payments.',
                        },
                        {
                            type: 'login',
                            channel: 'appOrOnlineBanking',
                            windowDaysFrom: 'accountOpenedAt',
                            windowDays: 45,
                            note: 'Register and log into the app or Online Banking.',
                        },
                    ],
                    payment: [
                        {
                            type: 'credit',
                            amount: 175,
                            payout: {
                                windowDaysFrom: 'criteriaMetAt',
                                date: '20th',
                                label: 'by 20th of following month',
                            },
                            note: 'Paid only if you meet all criteria and still have the new 1st Account on the payment date. For joint accounts, only one £175 payment is made into the joint account.',
                        },
                    ],
                },
            ],
        }, {
            id: 'firstDirect_cass_sep2025',
            bankID: 'ob-first-direct',
            scheme: 'CASS',
            title: '£175 Switch',
            headline: { credit: 175 },
            value: 175,
            availability: { start: '2025-09-09', },
            links: [
                { label: 'first  direct Page', url: 'https://www.firstdirect.com/banking/switching-bank-accounts/' },
                { label: 'Terms & Conditions', url: './documents/first direct/Sep26-Switch_T&Cs.pdf' },
            ],
            eligibility: [
                "Not eligible if you're already a first direct customer, have previously held a first direct product, or opened an HSBC current account on or after 1 January 2018.",
            ],
            components: [
                {
                    id: 'firstDirect_cass_sep2025_credit',
                    title: '£175 Switch Incentive',
                    requirements: [
                        {
                            type: 'openAccount',
                            accountTypes: ['1st Account'],
                            note: 'Open a 1st Account on or after 9 September until the offer is withdrawn.',
                        },
                        {
                            type: 'switch',
                            scheme: 'CASS',
                            mustBeFull: true,
                            windowDaysFrom: 'accountOpenedAt',
                            windowDays: 45,
                            note: 'Switch using CASS within 45 days. For joint 1st Accounts, at least one joint holder must switch from a sole account in their own name or another joint account in the same names.',
                        },
                        {
                            type: 'standingOrdersOrDirectDebits',
                            countAtLeast: 2,
                            windowDaysFrom: 'accountOpenedAt',
                            windowDays: 45,
                            mustBeActive: null as unknown as boolean,
                            note: 'Switch must include at least two Direct Debits or standing orders.',
                        },
                        {
                            type: 'payIn',
                            amount: 1000,
                            windowDaysFrom: 'accountOpenedAt',
                            windowDays: 45,
                            note: 'Minimum £1,000 (can be paid in all at once or in multiple amounts within the 45 days).',
                        },
                        {
                            type: 'debitCardTx',
                            countAtLeast: 5,
                            windowDaysFrom: 'accountOpenedAt',
                            windowDays: 45,
                            note: 'At least 5 debit card payments. Excludes gambling, credit card or insurance payments, cash withdrawals, and card-to-card payments.',
                        },
                        {
                            type: 'login',
                            channel: 'appOrOnlineBanking',
                            windowDaysFrom: 'accountOpenedAt',
                            windowDays: 45,
                            note: 'Register and log into the app or Online Banking.',
                        },
                    ],
                    payment: [
                        {
                            type: 'credit',
                            amount: 175,
                            payout: {
                                windowDaysFrom: 'criteriaMetAt',
                                date: '20th',
                                label: 'by 20th of following month',
                            },
                            note: 'Paid only if you meet all criteria and still have the new 1st Account on the payment date. For joint accounts, only one £175 payment is made into the joint account.',
                        },
                    ],
                },
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
            links: [{ label: 'Switching support page', url: 'https://www.santander.co.uk/personal/support/current-accounts/switching' }],
            eligibility: [
                'Must be 18+ and live in the UK permanently.',
                'Not eligible if switching from Santander/cahoot/Cater Allen.',
                'Not eligible if you (or anyone named on the Santander account) held a Santander current account on 1 Jan 2025.',
                'Not eligible if anyone named on the Santander account has previously received an incentive payment to switch to a Santander current account.',
            ],
            noteLong: 'Offer can be withdrawn at any time. T&Cs apply.',
            components: [
                {
                    id: 'santander_cass_nov2025_amazon',
                    title: '£25 Amazon Gift Card',
                    requirements: [
                        {
                            type: 'form',
                            url: 'https://rewards.giftcloud.com/uk/capture/msmltd/46286?urn=26b58f92-7f2f-4fdb-bb86-a0420d018163',
                        },
                    ],
                    payment: [{ type: 'amazon', amount: 25 }],
                },
                {
                    id: 'santander_cass_nov2025_credit',
                    title: '£200 Switch Incentive',
                    requirements: [
                        {
                            type: 'openAccount',
                            accountTypes: ['Santander Everyday', 'Edge', 'Edge Up', 'Edge Explorer', 'Private (v2)'],
                            note: 'Or use an existing account.',
                        },
                        { type: 'switch', scheme: 'CASS', mustBeFull: true, windowDaysFrom: 'switchRequest', windowDays: 60 },
                        { type: 'payIn', amount: 1500, windowDaysFrom: 'switchRequest', windowDays: 60 },
                        {
                            type: 'directDebits',
                            count: 2,
                            mustBeActive: true,
                            windowDaysFrom: 'switchRequest',
                            windowDays: 60,
                            note: `Must satisfy Santander's list of "Household Direct Debits".`,
                        },
                    ],
                    payment: [{ type: 'credit', amount: 200, payout: { windowDaysFrom: 'switchRequest', days: 90, label: 'after' } }],
                },
            ],
        },
        {
            id: 'tsb_cass_jan2026',
            bankID: 'ob-tsb',
            scheme: 'CASS',
            title: '£200 Switch',
            headline: { credit: 150, credit2: 50 },
            value: 200,
            availability: { start: '2026-01-01' },
            links: [{ label: 'Offer page', url: 'https://www.tsb.co.uk/current-accounts/switcher-spend-and-save.html' }],
            timelineNotes: [
                { date: '2026-03-04', label: 'CASS Rewards Offer Withdrawn (per note)' },
                { date: '2026-04-07', label: '£150 Switch Incentive payout by (per note)' },
            ],
            components: [
                {
                    id: 'tsb_150_switch',
                    title: '£150 Switch Incentive',
                    headline: { credit: 150 },
                    requirements: [
                        { type: 'switch', scheme: 'CASS', mustBeFull: true },
                        { type: 'login', channel: 'tsbApp', windowDaysFrom: 'accountOpenedAt', windowDays: null, note: 'Within offer qualifying window.' },
                        { type: 'payIn', amount: 1000, windowDaysFrom: 'accountOpenedAt', windowDays: null, note: 'Within offer qualifying window.' },
                        { type: 'debitCardTx', count: 5, windowDaysFrom: 'accountOpenedAt', windowDays: null, note: 'Within offer qualifying window.' },
                    ],
                    deadlines: [{ type: 'mustCompleteBy', date: '2026-03-20', label: 'Complete by (per note)' }],
                    noteLong: 'Noted: £150 Switch Incentive (before 20 March 2026).',
                    payment: [{ type: 'credit', amount: 150 }],
                },
                {
                    id: 'tsb_50_additional',
                    title: '£50 Additional Credit Reward',
                    headline: { credit: 50 },
                    requirements: [
                        {
                            type: 'payIn',
                            amount: 1000,
                            anchor: 'april_2026_calendar_month',
                            note: 'Deposit £1,000 into your TSB account in April 2026.',
                        },
                    ],
                    deadlines: [
                        { type: 'mustCompleteBy', date: '2026-05-30', label: 'Deadline (per note)' },
                        { type: 'payoutBy', date: '2026-05-31', label: 'Payout by (per note)' },
                    ],
                    payment: [{ type: 'credit', amount: 50 }],
                },
            ],
        },
        {
            id: 'rbs_cass_feb2026',
            bankID: 'ob-rbs',
            scheme: 'CASS',
            title: '£150 Switch',
            headline: { credit: 150 },
            value: 150,
            availability: { start: '2026-02-17', withdrawn: { date: '2026-02-17', label: 'CASS Rewards Offer Withdrawn (per note)' } },
            links: [{ label: 'Offer page', url: 'https://www.rbs.co.uk/current-accounts/select_account.html' }],
            eligibility: [
                'Offer not valid if you had an existing current or savings account on 17 Feb 2026.',
                'Original account cannot be RBS, NatWest, or Ulster Bank.',
            ],
            requirements: [
                { type: 'openAccount', accountTypes: ['Select', 'Reward'], note: 'Open a new Select or Reward account.' },
                { type: 'switch', scheme: 'CASS', mustBeFull: true, mustRequestBy: '2026-05-28' },
                { type: 'payIn', amount: 1250, windowDaysFrom: 'switchCompletedAt', windowDays: 60 },
                { type: 'login', channel: 'royalBankApp', windowDaysFrom: 'switchCompletedAt', windowDays: 60 },
            ],
            bonuses: [
                {
                    type: 'regularSaver',
                    title: 'Digital Regular Saver',
                    openBy: '2026-06-16',
                    maxSavePerMonth: 150,
                    note: 'Interest paid monthly (per note).',
                },
            ],
        },
        {
            id: 'natwest_cass_feb2026',
            bankID: 'ob-natwest',
            scheme: 'CASS',
            title: '£150 Switch',
            headline: { credit: 150 },
            value: 150,
            availability: { start: '2026-02-17', withdrawn: { date: '2026-02-17', label: 'CASS Rewards Offer Withdrawn (per note)' } },
            links: [{ label: 'Offer page', url: 'https://www.rbs.co.uk/current-accounts/select_account.html' }],
            eligibility: [
                'Offer not valid if you had an existing current or savings account on 17 Feb 2026.',
                'Original account cannot be RBS, NatWest, or Ulster Bank.',
            ],
            requirements: [
                { type: 'openAccount', accountTypes: ['Select', 'Reward'], note: 'Open a new Select or Reward account.' },
                { type: 'switch', scheme: 'CASS', mustBeFull: true, mustRequestBy: '2026-05-28' },
                { type: 'payIn', amount: 1250, windowDaysFrom: 'switchCompletedAt', windowDays: 60 },
                { type: 'login', channel: 'royalBankApp', windowDaysFrom: 'switchCompletedAt', windowDays: 60 },
            ],
            bonuses: [
                {
                    type: 'regularSaver',
                    title: 'Digital Regular Saver',
                    openBy: '2026-06-16',
                    maxSavePerMonth: 150,
                    note: 'Interest paid monthly (per note).',
                },
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
            eligibility: [
                "You can’t get this offer if you’ve had one of Nationwide’s current account switch offers in the past (began in 2021).",
                'If you received an offer before on a sole current account, you may still get it when switching into a joint current account if you have not received an offer before on a joint current account.',
            ],
            requirements: [
                { type: 'openAccount', accountTypes: ['FlexDirect'], note: 'Open FlexDirect and switch in application.' },
                {
                    type: 'directDebits',
                    count: 2,
                    mustBeActive: null as unknown as boolean,
                    note: 'Noted as not stating they must be active/collected/within timeframe or minimum amount.',
                },
                { type: 'payIn', amount: 1000, windowDaysFrom: 'accountOpenedAt', windowDays: 31 },
                { type: 'debitCardTx', count: 1, windowDaysFrom: 'accountOpenedAt', windowDays: 31 },
            ],
            canRepeat: 'joint',
        },
        {
            id: 'co-op_cass_jan2026',
            bankID: 'bagel-coop',
            scheme: 'CASS',
            title: '£175 Switch',
            headline: { credit: 100, credit2Text: '3x £25 credit' },
            availability: { start: '2026-01-28', },
            value: 175,
        },
        {
            id: 'tsb_yes_days_prizedraw_mar2026',
            bankID: 'ob-tsb',
            scheme: 'PROMO',
            title: '£35,000 Yes Days Prize Draw',
            headline: { prize: 'Two £35,000 prize draws' },
            value: 35000, // sorting only, not expected value
            availability: { start: '2026-03-01' },
            links: [{ label: 'Promo page', url: 'https://www.tsb.co.uk/savings/yes-days.html' }],
            requirements: [
                {
                    type: 'entry_method_deposit',
                    note: 'One entry per single deposit of £2,500 (or multiple of) made before 23:59 on 2 Mar 2026, with money not leaving until on/after 3 Mar 2026.',
                },
                {
                    type: 'entry_method_post',
                    note: 'Postal entry: one entry by this route per customer, must arrive during promotion period, with full name/address/sort code/account number, requesting entry.',
                },
            ],
            timelineNotes: [{ date: '2026-04-20', label: 'Winners announced by (per note)' }],
        },
        {
            id: 'nationwide_fairer_share_2026',
            bankID: 'ob-nationwide',
            scheme: 'PROMO',
            title: '£100 Fairer Share',
            headline: { credit: 100 },
            value: 100,
            availability: { start: '2026-01', end: '2026-03' },
            eligibility: ['If you completed a CASS switch to FlexAccount, FlexDirect, or FlexBasic between 1 Jan–31 Mar 2025.'],
        },
    ]
} as const;
