import { useRef, useState, RefObject, useEffect } from 'react';
import { accounts } from './Accounts';
import BankAccountTable from './components/BankAccountTable';
import SegmentedControl from './components/SegmentedControl';
import { Tooltip, TooltipContent, TooltipTrigger } from './components/Tooltip';
import { Popover, PopoverContent, PopoverTrigger } from './components/Popover';
import { Dialogue, DialogueClose, DialogueContent, DialogueTrigger } from './components/Dialogue';
import ConfigControl, { Config } from './components/ConfigControl';
import { taxBrackets } from './utils.ts';

import './styles/App.css';

const defaultConfig: Config = {
    banks: [],
    customAccounts: [
        {
            bank: 'Your',
            name: 'Example Savings',
            type: 'savings',
            interestType: 'variable',
            annualInterestRate: 2.67,
            compoundRate: 3,
            compoundOffset: 1,
            minInflow: 0,
            maxInflow: Infinity,
            exclusive: false,
            state: 'owned',
        },
        {
            bank: 'Your',
            name: 'Example Regular Saver',
            type: 'regular saver',
            interestType: 'variable',
            annualInterestRate: 4,
            compoundRate: 1,
            compoundOffset: 1,
            minInflow: 0,
            maxInflow: 100,
            exclusive: false,
            state: 'owned',
        },
    ],
    annualIncome: 0,
};

export type Settings = {
    hideExclusiveAccounts: boolean;
    prioritiseSpecialAccounts: boolean;
};

const defaultSettings: Settings = {
    hideExclusiveAccounts: false,
    prioritiseSpecialAccounts: true,
};

function App() {
    // State for selected value
    const [mode, setMode] = useState<string>('idle');
    const [totalDelta, setTotalDelta] = useState({ totalDelta: 0, taxableDelta: 0 });
    const [open, setOpen] = useState(false);

    const [loading, setLoading] = useState(false);

    const [config, setConfig] = useState<Config>(getInitialConfig);
    const [settings, setSettings] = useState<Settings>(getInitialSettings);

    const [profitElement, setProfitElement] = useState(<></>);

    const personalAllowance = Math.max(12570 - config.annualIncome, 0);
    const startingRateForSavings = Math.min(Math.max(17570 - config.annualIncome, 0), 5000);
    const personalSavingsAllowance = config.annualIncome <= 37700 ? 1000 : config.annualIncome <= 125140 ? 500 : 0;

    // useEffect(() => {
    //     setLoading(true);
    //     setTimeout(() => {
    //         setLoading(false);
    //     }, 500);
    // }, []);

    useEffect(() => {
        // store the config in local storage
        const configString = JSON.stringify(config);
        localStorage.setItem('config', configString);
    }, [config]);

    useEffect(() => {
        // store the settings in local storage
        const settingsString = JSON.stringify(settings);
        localStorage.setItem('settings', settingsString);
    }, [settings]);

    useEffect(() => {
        let taxableIncome = totalDelta.taxableDelta;

        const taxFreeBuffer = personalAllowance + startingRateForSavings + personalSavingsAllowance;
        let taxBracketIndex = taxBrackets.findIndex(bracket => config.annualIncome < bracket.max);

        let totalYield = totalDelta.totalDelta - totalDelta.taxableDelta;

        if (taxFreeBuffer > 0) {
            const delta = Math.min(taxFreeBuffer, taxableIncome);
            totalYield += delta;
            taxableIncome -= delta;
        }
        while (taxableIncome > 0) {
            const taxBracket = taxBrackets[taxBracketIndex];
            const taxBuffer = taxBracket.max - (taxBrackets[taxBracketIndex - 1]?.max || 0);

            const delta = Math.min(taxableIncome, taxBuffer);
            totalYield += delta * (1 - taxBracket.rate);
            taxableIncome -= delta;
            taxBracketIndex++;
        }

        const usingVariableInterest = config.customAccounts.some(account => account.interestType === 'variable');

        const worthyOfCelebration = mode !== 'idle' && totalYield > 0;

        setProfitElement(
            <h1 hidden={mode === 'yield'}>
                <span className='glyph' hidden={!worthyOfCelebration}>🎉 </span>
                You will gain
                <Tooltip>
                    <TooltipTrigger><span style={{ color: '#1ed760' }}> £{totalYield.toFixed(2)} </span></TooltipTrigger>
                    {totalDelta.totalDelta - totalYield >= 0.01 &&
                        <TooltipContent>
                            <table>
                                <tr>
                                    <th>Tax-Free Yield</th>
                                    <th>Taxable Yield</th>
                                    <th>Tax Paid</th>
                                </tr>
                                <tr>
                                    <td>£{(totalDelta.totalDelta - totalDelta.taxableDelta).toFixed(2)}</td>
                                    <td>£{totalDelta.taxableDelta.toFixed(2)}</td>
                                    <td>£{(totalDelta.totalDelta - totalYield).toFixed(2)}</td>
                                </tr>
                            </table>
                        </TooltipContent>
                    }
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger>*</TooltipTrigger>
                    <TooltipContent>
                        {usingVariableInterest && 'One or more of your accounts is a variable-rate account, meaning the interest rate could decrease, causing the estimated yield to diminish.'}
                        This value also does not account for inflation, and assumes that you do not remove money from these accounts.
                    </TooltipContent>
                </Tooltip>
                {worthyOfCelebration && '!'}
                <span className='glyph' hidden={!worthyOfCelebration}> 🎉</span>
            </h1>
        );

    }, [totalDelta, personalAllowance, startingRateForSavings, personalSavingsAllowance]);

    // Refs for SegmentedControl segments
    const segmentRefs: RefObject<HTMLDivElement>[] = [
        useRef<HTMLDivElement>(null),
        useRef<HTMLDivElement>(null),
        useRef<HTMLDivElement>(null),
        useRef<HTMLDivElement>(null),
    ];

    // Ref for the SegmentedControl container
    const controlRef = useRef<HTMLDivElement>(null);

    function getInitialConfig(): Config {
        const storedConfig = localStorage.getItem('config');
        if (storedConfig) {
            try {
                return JSON.parse(storedConfig) as Config;
            } catch (e) {
                console.error('Failed to parse config from localStorage:', e);
                return defaultConfig;
            }
        }
        return defaultConfig;
    }

    function getInitialSettings(): Settings {
        const storedSettings = localStorage.getItem('settings');
        if (storedSettings) {
            try {
                return JSON.parse(storedSettings) as Settings;
            } catch (e) {
                console.error('Failed to parse settings from localStorage:', e);
                return defaultSettings;
            }
        }
        return defaultSettings;
    }

    let modeLong;
    switch (mode) {
        case 'idle':
            modeLong = 'if you only kept your money in your savings account';
            break;
        case 'crs':
            modeLong = 'if you utilsed your other existing accounts, as well as your savings';
            break;
        case 'nrs':
            modeLong = 'if you utilised other available regular savers, as well as your existing accounts';
            break;
        case 'yield':
            modeLong = 'from adding only £1, in any given month, and leaving it until the end of the year';
            break;
        default:
    }

    return (
        <>
            {loading &&
                <div className="spinnerOverlay">
                    <div className="spinner"></div>
                </div>
            }

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger onClick={() => setOpen((v) => !v)}><span className='glyph'>🔬</span></PopoverTrigger>
                <PopoverContent className="Popover">
                    <h2>Settings</h2>
                    <div className="setting">
                        <input
                            type="checkbox"
                            id="hideUnavailableContent"
                            checked={settings.hideExclusiveAccounts}
                            onChange={(e) => setSettings({ ...settings, hideExclusiveAccounts: e.target.checked })}
                        />
                        <label htmlFor="hideUnavailableContent">
                            Hide unavailable
                            <Tooltip placement='right'>
                                <TooltipTrigger><span className=''>ℹ</span></TooltipTrigger>
                                <TooltipContent>Accounts that are only available to existing customers of banks where you are not currently a customer.</TooltipContent>
                            </Tooltip>
                            accounts
                        </label>
                    </div>

                    <div className="setting">
                        <input
                            type="checkbox"
                            id="prioritiseSpecialAccounts"
                            checked={settings.prioritiseSpecialAccounts}
                            onChange={(e) => setSettings({ ...settings, prioritiseSpecialAccounts: e.target.checked })}
                        />
                        <label htmlFor="prioritiseSpecialAccounts">
                            Prioritise special
                            <Tooltip placement='right'>
                                <TooltipTrigger><span className=''>ℹ</span></TooltipTrigger>
                                <TooltipContent>
                                    <div>Some accounts have benefits that make them more valuable, even if they yield less interst.</div>
                                    <div className='mini'>
                                        For example, a Help to Buy ISA offers a bonus upon purchasing a house,
                                        making it good to invest into, despite offering low monthly interest.
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                            accounts
                        </label>
                    </div>
                    {/* <PopoverClose>Close</PopoverClose> */}
                </PopoverContent>
            </Popover>

            <Dialogue>
                <DialogueTrigger><span className='glyph'>👤</span></DialogueTrigger>
                <DialogueContent className="Dialogue">
                    <ConfigControl
                        config={config} personalAllowance={personalAllowance} startingRateForSavings={startingRateForSavings} personalSavingsAllowance={personalSavingsAllowance}
                        setConfig={setConfig} setLoading={setLoading}
                    />
                    <DialogueClose>Close</DialogueClose>
                </DialogueContent>
            </Dialogue>

            <div className="container">
                <SegmentedControl
                    name="group-1"
                    callback={(val: string) => setMode(val)}
                    controlRef={controlRef}
                    segments={[
                        {
                            label: "Idle",
                            value: "idle",
                            ref: segmentRefs[0]
                        },
                        {
                            label: "Active",
                            value: "crs",
                            ref: segmentRefs[1]
                        },
                        {
                            label: "Proactive",
                            value: "nrs",
                            ref: segmentRefs[2]
                        },
                        {
                            label: "Yield",
                            value: "yield",
                            ref: segmentRefs[3]
                        },
                    ]}
                />
            </div>

            <div className="App">
                <h4 style={{ color: 'grey' }}>Let's see how much you would get {modeLong}. {mode === 'yield' && <Tooltip><TooltipTrigger><span className='glyph'>🤖</span></TooltipTrigger><TooltipContent>This data is primarily used for optimisation of the application's calculations; however, as a heatmap, it can provide some useful insights even to you humans.</TooltipContent></Tooltip>}</h4>
                {profitElement}
                <BankAccountTable
                    accounts={accounts} mode={mode} setTotalDelta={setTotalDelta} config={config} settings={settings}
                    personalAllowance={personalAllowance} startingRateForSavings={startingRateForSavings} personalSavingsAllowance={personalSavingsAllowance}
                />
            </div>
        </>
    );
}

export default App;
