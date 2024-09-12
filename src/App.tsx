import { useRef, useState, RefObject } from 'react';
import BankAccountTable from './BankAccountTable';
import SegmentedControl from './SegmentedControl';

import './App.css';

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
  const [selectedValue, setSelectedValue] = useState<string>('idle');
  const [totalDelta, setTotalDelta] = useState<number>(0);

  // Define the accounts array with typed objects
  const accounts: Account[] = [
    { name: 'Natwest First Saver', type: 'savings', initialDeposit: 1000, annualInterestRate: 2.67, compoundRate: 3, compoundOffset: -1, state: 'owned' },
    { name: 'Natwest Digital Regular Saver', type: 'regular saver', initialDeposit: 0, annualInterestRate: 6, compoundRate: 1, compoundOffset: 0, state: 'owned', maxInflow: 150 },
    { name: 'Test', type: 'regular saver', initialDeposit: 0, annualInterestRate: 5, compoundRate: 1, compoundOffset: 0, maxInflow: 150 },
  ];

  // Refs for SegmentedControl segments
  const segmentRefs: RefObject<HTMLDivElement>[] = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];

  // Ref for the SegmentedControl container
  const controlRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div className="container">
        <SegmentedControl
          name="group-1"
          callback={(val: string) => setSelectedValue(val)}
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
            }
          ]}
        />
      </div>

      <div className="App">
        <h1>You will gain <span style={{color: '#1ed760'}}>£{totalDelta.toFixed(2)}</span>!</h1>
        <BankAccountTable accounts={accounts} mode={selectedValue} setTotalDelta={setTotalDelta} />
      </div>
    </>
  );
}

export default App;
