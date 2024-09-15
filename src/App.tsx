import { useRef, useState, RefObject } from 'react';
import { accounts } from './Accounts';
import BankAccountTable from './components/BankAccountTable';
import SegmentedControl from './components/SegmentedControl';
import { Tooltip, TooltipContent, TooltipTrigger } from './components/Tooltip';

import './styles/App.css';
import { Popover, PopoverContent, PopoverTrigger } from './components/Popover';
import { Dialogue, DialogueClose, DialogueContent, DialogueTrigger } from './components/Dialogue';
import ConfigControl, { Config } from './components/ConfigControl';

function App() {
    // State for selected value
    const [mode, setMode] = useState<string>('idle');
    const [totalDelta, setTotalDelta] = useState<number>(0);
    const [open, setOpen] = useState(false);

    const [config, setConfig] = useState<Config>({
        banks: [],
        customAccounts: [{
            bank: 'Your',
            name: 'Example Savings',
            type: 'savings',
            interestType: 'variable',
            annualInterestRate: 2.67,
            compoundRate: 3,
            compoundOffset: -1,
            minInflow: 0,
            maxInflow: Infinity,
            exclusive: false,
            state: 'owned',
        }],
        personalAllowance: 12570,
        startingRateForSavings: 5000,
        personalSavingsAllowance: 1000,
    });

    const [hideExclusiveAccounts, setHideExclusiveAccounts] = useState(false);

    // Refs for SegmentedControl segments
    const segmentRefs: RefObject<HTMLDivElement>[] = [
        useRef<HTMLDivElement>(null),
        useRef<HTMLDivElement>(null),
        useRef<HTMLDivElement>(null),
        useRef<HTMLDivElement>(null),
    ];

    // Ref for the SegmentedControl container
    const controlRef = useRef<HTMLDivElement>(null);

    let modeLong;
    switch (mode) {
        case 'idle':
            modeLong = 'if you only kept your money in your savings account';
            break;
        case 'crs':
            modeLong = 'if you utilsed your current regular saver, as well as your savings';
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
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger onClick={() => setOpen((v) => !v)}><span className='glyph'>🔬</span></PopoverTrigger>
                <PopoverContent className="Popover">
                    <h2>Settings</h2>
                    <div className="setting">
                        <input
                            type="checkbox"
                            id="hideUnavailableContent"
                            checked={hideExclusiveAccounts}
                            onChange={(e) => setHideExclusiveAccounts(e.target.checked)}
                        />
                        <label htmlFor="hideUnavailableContent">
                            Hide unavailable
                            <Tooltip>
                                <TooltipTrigger><span className=''>ℹ</span></TooltipTrigger>
                                <TooltipContent>Accounts that are only available to existing customers of banks where you are not currently a customer.</TooltipContent>
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
                    <ConfigControl config={config} setConfig={setConfig} />
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
                <h1 hidden={mode === 'yield'}>
                    <span className='glyph' hidden={totalDelta < 0.01}>🎉 </span>
                    You will gain <span style={{ color: '#1ed760' }}>£{totalDelta.toFixed(2)}</span>
                    <Tooltip>
                        <TooltipTrigger>*</TooltipTrigger>
                        <TooltipContent>One or more of your accounts is a variable-rate account, meaning the interest rate could decrease, causing the estimated yield to diminish. This value also does not account for inflation, and assumes that you do not remove money from these accounts.</TooltipContent>
                    </Tooltip>
                    !<span className='glyph' hidden={totalDelta < 0.01}> 🎉</span>
                </h1>
                <BankAccountTable accounts={accounts} mode={mode} setTotalDelta={setTotalDelta} config={config} hideExclusiveAccounts={hideExclusiveAccounts} />
            </div>
        </>
    );
}

export default App;
