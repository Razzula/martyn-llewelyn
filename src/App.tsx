import { useRef, useState, RefObject } from 'react';
import { accounts } from './Accounts';
import BankAccountTable from './components/BankAccountTable';
import SegmentedControl from './components/SegmentedControl';

import './styles/App.css';
import { Tooltip, TooltipContent, TooltipTrigger } from './components/Tooltip';

// Define the type for account objects
export interface Account {
  name: string;
  type: string;
  initialDeposit: number;
  annualInterestRate: number;
  compoundRate: number;
  compoundOffset: number;
  state?: string;

  minInflow?: number;
  maxInflow?: number;
}

function App() {
  // State for selected value
  const [mode, setMode] = useState<string>('idle');
  const [totalDelta, setTotalDelta] = useState<number>(0);

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
      modeLong = 'from adding £1, in any given month';
      break;
    default:
  }

  return (
    <>
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
              label: "Current Regular Saver",
              value: "crs",
              ref: segmentRefs[1]
            },
            {
              label: "New Regular Savers",
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
        <h4 style={{ color: 'grey' }}>Let's see how much you would get {modeLong}.</h4>
        <h1 hidden={mode === 'yield'}>
          You will gain <span style={{color: '#1ed760'}}>£{totalDelta.toFixed(2)}</span>
          <Tooltip>
            <TooltipTrigger>*</TooltipTrigger>
            <TooltipContent>One or more of your accounts is a variable-rate account, meaning the interest rate could decrease, causing the estimated yield to diminish. This value also does not account for inflation, and assumes that you do not remove money from these accounts.</TooltipContent>
          </Tooltip>
          !
        </h1>
        <BankAccountTable accounts={accounts} mode={mode} setTotalDelta={setTotalDelta} />
      </div>
    </>
  );
}

export default App;
