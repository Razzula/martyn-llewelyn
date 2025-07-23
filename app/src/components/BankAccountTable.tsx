import React, { useEffect } from 'react';
import { Account } from '../Accounts.ts';
import { Tooltip, TooltipContent, TooltipTrigger } from './Tooltip.tsx';
import Colour from '../utils/Colour.ts';
import banks from '../Banks.ts';
import { Config } from './ConfigControl.tsx';
import { Settings } from '../Old.tsx';
import { ToggleSwitch } from './ToggleSwitch.tsx';
import { months, taxBrackets } from '../utils.ts';

import '../styles/App.css';

interface BankAccountTableProps {
    accounts: Account[];
    mode: string;
    setTotalDelta: ({ totalDelta, taxableDelta }: { totalDelta: number, taxableDelta: number }) => void;
    config: Config;
    settings: Settings;

    personalAllowance: number;
    startingRateForSavings: number;
    personalSavingsAllowance: number;
}

export interface AccountInstance extends Account {
    id: string,
    initialDeposit: number;
    monthlyDeposit?: number;
}

class Cell {
    public value: number = 0;
    public transfer: number = 0;
    public interest: number = 0;
}

function createDataTable(accounts: AccountInstance[]): [AccountInstance, Cell[]][] {
    const data: [AccountInstance, Cell[]][] = [];
    accounts.forEach((account) => {
        const row: Cell[] = Array.from({ length: 13 }, () => new Cell());
        row[0].value = account.initialDeposit;
        data.push([account, row]);
    });
    return data;
}

function createYieldTable(accounts: AccountInstance[], monthOffset = 0, taxRate = 0): [AccountInstance, number[], number[]][] {
    // generate table of yields
    const yieldTable: [AccountInstance, number[], number[]][] = []; // [account, yield, rank]
    accounts.forEach((account) => {
        const row: number[] = Array.from({ length: 12 }, () => 0);

        // generate yields using reverse-traversal
        const monthlyInterestRate = account.annualInterestRate / 100 / 12;
        let balance = 1;
        let buffer = 0;
        for (let month = 11; month >= 0; month--) {
            const interest = balance * monthlyInterestRate;
            buffer += interest;

            if ((month + account.compoundOffset + monthOffset) % account.compoundRate === 0) {
                balance += buffer;
                buffer = 0;
            }

            const isAccountTaxable = account.type.toLowerCase() !== 'cash isa' && account.type.toLowerCase() !== 'help to buy';
            const yieldBeforeTax = balance - 1;
            const yieldAfterTax = isAccountTaxable ? yieldBeforeTax * (1 - taxRate) : yieldBeforeTax;

            row[month] = yieldAfterTax;
        }

        yieldTable.push([account, row, Array.from({ length: 12 }, () => NaN)]);
    });

    // calculation yield rankings
    const yieldList: [number, number, number][] = []; // [accountIndex, month, yield]
    // insertion sort
    for (let i = 0; i < yieldTable.length; i++) {
        for (let month = 0; month < 12; month++) {
            const yieldValue = yieldTable[i][1][month];
            let dirty = false;
            for (let j = 0; j < yieldList.length; j++) {
                if (yieldList[j][2] < yieldValue) {
                    yieldList.splice(j, 0, [i, month, yieldValue]);
                    dirty = true;
                    break;
                }
            }
            if (!dirty) {
                yieldList.push([i, month, yieldValue]);
            }
        }
    }
    // assign rankings
    for (let i = 0; i < yieldList.length; i++) {
        const [accountIndex, month] = yieldList[i];
        yieldTable[accountIndex][2][month] = i + 1;
    }

    return yieldTable;
}

function enactDataTable(
    dataTable: [AccountInstance, Cell[]][],
    // yieldTable: [AccountInstance, number[], number[]][],
    config: Config,
    settings: Settings,
    monthOffset = 0,
    allowTransfers = true,
    startingTaxFreeBuffer = 0,
    startingTaxFreeBracketIndex = 0,
): [AccountInstance, Cell[], number][] {

    let taxFreeBuffer = startingTaxFreeBuffer;
    let taxBuffer = 0;
    let taxBracketIndex = startingTaxFreeBracketIndex;

    const data: [AccountInstance, Cell[], number][] = dataTable.map(([account, dataRow]) => {
        const state = account.state === 'owned'
            ? 1
            : (account.exclusive && !config.banks.includes(account.bank))
                ? -1
                : 0;
        return [account, dataRow, state];
    });

    const accountInstances = dataTable.map(([account]) => account);
    let yieldTable = createYieldTable(accountInstances, monthOffset, taxFreeBuffer <= 0 ? taxBrackets[taxBracketIndex].rate : 0);
    let yieldList = createYieldList();

    let interestTally = 0;

    function handleTaxOnInterest(interest: number, accountType: string): void {
        interestTally += interest;

        if (accountType.toLowerCase() === 'cash isa' || accountType.toLowerCase() === 'help to buy') {
            return;
        }

        if (taxFreeBuffer > 0) {
            taxFreeBuffer -= interest;
            taxBuffer = taxBrackets[taxBracketIndex].max - (taxBracketIndex > 0 ? taxBrackets[taxBracketIndex - 1].max : 0);
            if (taxFreeBuffer <= 0) {
                taxBuffer += taxFreeBuffer; // carry over
                taxFreeBuffer = 0;

                yieldTable = createYieldTable(accountInstances, monthOffset, taxBrackets[taxBracketIndex].rate);
                yieldList = createYieldList();
                console.log('Tax free buffer exhausted');
            }
        }
        else {
            taxBuffer -= interest;
            if (taxBuffer <= 0) {
                const delta = taxBuffer;
                taxBracketIndex++;
                if (taxBracketIndex === 0) {
                    taxBuffer = taxBrackets[taxBracketIndex].max + delta;
                }
                else {
                    taxBuffer = taxBrackets[taxBracketIndex].max - taxBrackets[taxBracketIndex - 1].max + delta;
                }

                yieldTable = createYieldTable(accountInstances, monthOffset, taxBrackets[taxBracketIndex].rate);
                yieldList = createYieldList();
                console.log('Tax bracket moving to', taxBracketIndex);
            }
        }
    }

    function transfer(sourceIndex: number, destinationIndex: number, month: number, amount: number, handleTax = true): void {

        // transfer
        data[destinationIndex][1][month].transfer += amount;
        data[sourceIndex][1][month].transfer -= amount;

        // account for tax
        const forecastedYield = amount * yieldTable[destinationIndex][1][month];
        if (handleTax) {
            handleTaxOnInterest(forecastedYield, data[destinationIndex][0].type);
        }
    }

    function distribute(source: [AccountInstance, number], amount: number, prioritiseSpecialAccounts = false, handleTax = true): number {
        let workingSum = amount;

        for (let i = 0; i < yieldList.length; i++) {
            const [sourceAccount, sourceMonth] = source;
            const [desiredAccountIndex, desiredMonth] = yieldList[i];
            const [desiredAccount, row, state] = data[desiredAccountIndex];


            if (desiredAccount.id === sourceAccount.id) { // ensure non-reflexive
                continue;
            }
            if (desiredMonth < sourceMonth) { // ensure chronological
                continue;
            }
            if (state === -1) { // exclusive accounts must be owned
                continue;
            }

            if (prioritiseSpecialAccounts) {
                if (desiredAccount.type.toLowerCase() !== 'help to buy') {
                    continue;
                }
            }

            const maxInflow = desiredAccount.maxInflow || 0;
            const minInflow = desiredAccount.minInflow || 0;
            if (maxInflow > 0) { // we must be able to transfer

                // MIN INFLOW
                // in order to utilise this cell, we must first ensure that the minimum inflow is met, for all cells in this row
                if (state === 0 && minInflow > 0) {
                    // the assumption is that, as this row is inactive, then the transfer will be 0 for all cells in this row
                    if (minInflow * 12 <= workingSum) {
                        for (let j = 0; j < 12; j++) {
                            workingSum -= minInflow;
                            transfer(0, desiredAccountIndex, j, minInflow, handleTax);
                        }
                        data[desiredAccountIndex][2] = 1;
                    }
                    else {
                        continue; // skip this cell, as we cannot meet the minimum inflow
                        // this may be an issue for positional usage; tbd
                    }
                }

                // TRANSFER
                const existingInflow = row[desiredMonth].transfer;
                const maxExpenditure = Math.max(Math.min((maxInflow - existingInflow), workingSum), 0);
                if (maxExpenditure > 0) {
                    workingSum -= maxExpenditure;
                    transfer(0, desiredAccountIndex, desiredMonth, maxExpenditure, handleTax);

                    if (state === 0) {
                        data[desiredAccountIndex][2] = 1;
                    }

                    if (workingSum <= 0) {
                        break;
                    }
                }
            }
        }

        if (prioritiseSpecialAccounts && workingSum > 0) {
            // priority has not exhausted the lump sum, so we should distribute the remainder
            workingSum = distribute(source, workingSum, false);
        }

        return workingSum;
    }

    function createYieldList(): [number, number, number][] {
        const tempYieldList: [number, number, number][] = []; // [accountIndex, month, yield]

        // create linear ranking of cells, using the yield table
        // insertion sort
        for (let i = 0; i < data.length; i++) {
            for (let month = 0; month < 12; month++) {
                const yieldValue = yieldTable[i][1][month];
                let dirty = false;
                for (let j = 0; j < tempYieldList.length; j++) {
                    if (tempYieldList[j][2] < yieldValue) {
                        tempYieldList.splice(j, 0, [i, month, yieldValue]);
                        dirty = true;
                        break;
                    }
                }
                if (!dirty) {
                    tempYieldList.push([i, month, yieldValue]);
                }
            }
        }
        return tempYieldList;
    }

    /*  ======================================
    *   CURRENT LIMITATIONS OF THE SYSTEM
    *   =======================================
    *   - interest distribution does not consider minimum inflow of destination
    *   - savers do not support withdrawals (is this ever worthwhile?)
    *   - the consequence of an account's minimum inflow is not considered when activating an account (though, it is validated if it is viable)
    *   - tax (and the benefit of ISA exemptions) is not considered
    */

    /*  ======================================
    *   ASSUMED DATES
    *   =======================================
    *   - interest is paid on the 1st of each month
    *   - transfers are all made on the 1st of each month
    *   - the 'total' is the balance in the account at the end of that month
    */

    const interestBuffer: number[] = new Array(data.length).fill(0);

    if (allowTransfers) {
        // GREEDY HEURISTIC
        let workingSum = data[0][1][0].value;

        // 1. enforce minimum inflow of owned accounts
        for (let i = 0; i < data.length; i++) {
            const [account, , state] = data[i];

            if (state === 1) {
                const inflow = account.minInflow || 0;
                if (inflow > 0) {
                    for (let j = 0; j < 12; j++) {
                        if (inflow <= workingSum) {
                            workingSum -= inflow;
                            transfer(0, i, j+1, inflow, true);
                        }
                        else {
                            console.warn('Lump sum is insufficient to meet minimum inflow requirements');
                            alert('Lump sum is insufficient to meet minimum inflow requirements');
                            break;
                        }
                    }
                }
            }
        }

        // 2. maximise input into highest yield options
        workingSum = distribute([data[0][0], 0], workingSum, settings.prioritiseSpecialAccounts);
    }

    // 3. maximise input into regular income accounts
    for (let i = 0; i < data.length; i++) {
        const [account] = data[i];
        const monthlyDeposit = account.monthlyDeposit || 0;
        if (monthlyDeposit > 0) {
            for (let j = 0; j < 12; j++) {
                data[i][1][j].transfer += monthlyDeposit;
                if (allowTransfers) {
                    distribute([account, j], monthlyDeposit, settings.prioritiseSpecialAccounts);
                }
            }
        }
    }

    // CHRONOLOGICAL TRAVERSAL

    // firstly, we need to reset the tax buffers
    taxFreeBuffer = startingTaxFreeBuffer;
    taxBuffer = 0;
    taxBracketIndex = startingTaxFreeBracketIndex;

    yieldTable = createYieldTable(accountInstances, monthOffset, taxFreeBuffer <= 0 ? taxBrackets[taxBracketIndex].rate : 0);
    yieldList = createYieldList();

    interestTally = 0;

    // traverse by column, to calculate interest and balance
    for (let month = 0; month <= 12; month++) {

        // traverse column's cells by descending yield
        for (let i = 0; i < data.length; i++) {
            const [account, row] = data[i];

            if (month > 0) {
                // calculate interest generated from previous month
                if (row[month - 1].value > 0) {
                    const monthlyInterestRate = account.annualInterestRate / 100 / 12;
                    const interest = row[month - 1].value * monthlyInterestRate;
                    interestBuffer[i] += interest; //store interest in buffer
                }

                row[month].value = row[month - 1].value;
                if ((month + account.compoundOffset + monthOffset) % account.compoundRate === 0) {
                    // only feed interest into balance if it's a compound month
                    row[month].value += interestBuffer[i];
                    row[month].interest += interestBuffer[i];


                    handleTaxOnInterest(interestBuffer[i], account.type);
                    interestBuffer[i] = 0; // reset buffer

                    // RE-SOW INTEREST
                    if (allowTransfers) {
                        // if this is a savings account, we should feed this into a regular saver
                        if (account.type.toLowerCase() === 'savings') {
                            distribute(
                                [account, month], row[month].interest, settings.prioritiseSpecialAccounts,
                                false // this flag prevents the transfer from affecting the tax buffer
                                // as this is a 'real-time' series of calculations, in theory, we do not need to pre-calculate tax
                                // this simplifies the process
                                // TODO: it remains to be seen if this is a valid assumption
                                // XXX: this will probably cause an issue if the destination is above this row, and in the same column?
                            );
                        }
                    }
                }
            }

            // OPTIMISTIC HEURISTIC
            // alter balance; according to heuristic (enact plan)
            if (row[month].transfer !== 0) {
                data[i][1][month].value += row[month].transfer;
                if (data[i][1][month].value < 0) {
                    console.error(data[i][0].id, 'month', month, 'balance below 0 by', data[i][1][month].value);
                    data[i][1][month].value = 0
                }
            }
        }
    }

    // checksum
    const totalDelta = dataTable.reduce((sum, [account, row]) => {
        return sum + (row[row.length - 1].value - account.initialDeposit - (account.monthlyDeposit || 0) * 12);
    }, 0);
    if (totalDelta.toFixed(2) !== interestTally.toFixed(2)) {
        console.warn('Interest tally mismatch', totalDelta, interestTally);
    }

    return data;
}

const BankAccountTable: React.FC<BankAccountTableProps> = ({ accounts, mode, setTotalDelta, config, settings, personalAllowance, startingRateForSavings, personalSavingsAllowance }) => {

    const localDate = new Date();

    const [accountInstances, setAccountInstances] = React.useState<AccountInstance[]>([]);
    const [lumpSum, setLumpSum] = React.useState<number>(0);

    const [dataTable, setDataTable] = React.useState<[AccountInstance, Cell[], number][]>([]);
    const [yieldTable, setYieldTable] = React.useState<[AccountInstance, number[], number[]][]>([]);

    const [monthOffset, setMonthOffset] = React.useState<number>(localDate.getMonth());

    const [afterTax, setAfterTax] = React.useState<boolean>(false);
    const [taxRate, setTaxRate] = React.useState<number>(0.2);


    // HANDLE STATE CHANGE
    useEffect(() => {
        setLumpSum(1000); //temp
    }, []);

    useEffect(() => {
        if (config === undefined) {
            return;
        }

        const accountToInstance = (account: Account): AccountInstance => {
            return {
                id: `${account.bank}#${account.name}`.replace(/ /g, '-').toLowerCase(),
                ...account,
                initialDeposit: 0,
            };
        };

        const allAccounts: AccountInstance[] = [];

        config.customAccounts.forEach((account) => {
            // check is the user's custom account is already in the system
            const existingAccount = accounts.find((a) =>
                a.bank === account.bank && (
                    a.name === account.name
                    || ( a.type === account.type
                        && a.annualInterestRate === account.annualInterestRate
                        && a.compoundRate === account.compoundRate
                        && a.compoundOffset === account.compoundOffset
                        && a.minInflow === account.minInflow
                        && a.maxInflow === account.maxInflow
                    )
                )
            );

            if (existingAccount) {
                const existingAccountInstance = accountToInstance(existingAccount);
                existingAccountInstance.state = 'owned';
                allAccounts.push(existingAccountInstance);
            }
            else {
                allAccounts.push(accountToInstance(account));
            }
        });
        accounts.forEach((account) => {
            const alreadyAddedAccount = allAccounts.find((a) => a.bank === account.bank && a.name === account.name);
            if (!alreadyAddedAccount) {
                allAccounts.push(accountToInstance(account));
            }
        });

        // const allAccounts = [...config.customAccounts, ...accounts];
        // const tempAccounts: AccountInstance[] = allAccounts.map((account) => {
        //     return {
        //         id: `${account.bank}#${account.name}`.replace(/ /g, '-').toLowerCase(),
        //         ...account,
        //         initialDeposit: 0,
        //     };
        // });
        setAccountInstances(allAccounts);
    }, [accounts, config]);

    useEffect(() => {
        if (accountInstances !== undefined && accountInstances.length > 0) {
            const tempAccountInstances = accountInstances.slice();
            tempAccountInstances[0].initialDeposit = lumpSum;
            setAccountInstances(tempAccountInstances);
        }
    }, [lumpSum]);

    useEffect(() => {
        if (accountInstances.length > 0) {
            // filter accounts // TODO: this is a mess
            const visibleAccounts = accountInstances.filter(account =>
                account.state?.toLowerCase() === 'owned'
                || (settings.hideExclusiveAccounts === false || (account.exclusive === false || config.banks.includes(account.bank)))
                    && (
                        (account.type.toLowerCase() === 'regular saver' && mode === 'nrs')
                        || mode === 'yield'
                    )
            );

            if (mode === 'yield') {
                visibleAccounts.sort((a, b) => {
                    return b.annualInterestRate - a.annualInterestRate;
                });
            }

            // generate data table
            const tempDataTable = createDataTable(visibleAccounts);

            // generate yield table
            const tempYieldTable = createYieldTable(visibleAccounts, monthOffset);
            const tempTaxedYieldTable = createYieldTable(visibleAccounts, monthOffset, taxRate);

            // calculate data table
            const taxFreeBuffer = personalAllowance + startingRateForSavings + personalSavingsAllowance;
            // const taxFreeBuffer = 50; // DEBUG
            const taxBracketIndex = taxBrackets.findIndex(bracket => config.annualIncome < bracket.max) || 0;
            const newDataTable = enactDataTable(tempDataTable, /*tempYieldTable,*/ config, settings, monthOffset, mode !== 'idle', taxFreeBuffer, taxBracketIndex);

            setDataTable(newDataTable);
            setYieldTable(afterTax ? tempTaxedYieldTable : tempYieldTable);
        }
    }, [accountInstances, mode, monthOffset, config, settings, afterTax, taxRate, personalAllowance, startingRateForSavings, personalSavingsAllowance, setTotalDelta]);

    useEffect(() => {
        // handle total delta
        const totalDelta = dataTable.reduce((sum, [account, row]) => {
            return sum + (row[row.length - 1].value - account.initialDeposit - (account.monthlyDeposit || 0) * 12);
        }, 0);

        const taxableDelta = dataTable.reduce((sum, [account, row]) => {
            const isAccountTaxable = account.type.toLowerCase() !== 'cash isa' && account.type.toLowerCase() !== 'help to buy';
            if (isAccountTaxable) {
                return sum + (
                    row.reduce((subsum, cell) => {
                        return subsum + cell.interest;
                    }, 0)
                );
            }
            else {
                return sum;
            }
        }, 0);

        setTotalDelta({totalDelta, taxableDelta});

    }, [dataTable, setTotalDelta]);

    useEffect(() => {
        const newTaxRate = (
            config.annualIncome < 50270 ? 0.2
            : config.annualIncome < 125140 ? 0.4
            : 0.45
        );
        setTaxRate(newTaxRate);
    }, [config]);

    useEffect(() => {
        if (mode !== 'yield') {
            setAfterTax(false);
        }
    }, [mode]);

    function updateInitialValue(account: AccountInstance, value: number) {
        const tempAccounts = accountInstances.slice();
        for (let i = 0; i < tempAccounts.length; i++) {
            if (tempAccounts[i].id === account.id) {
                tempAccounts[i].initialDeposit = value;
                break;
            }
        }
        setAccountInstances(tempAccounts);
    }

    function updateMonthlyValue(account: AccountInstance, value: number) {
        const tempAccounts = accountInstances.slice();
        for (let i = 0; i < tempAccounts.length; i++) {
            if (tempAccounts[i].id === account.id) {
                tempAccounts[i].monthlyDeposit = value;
                break;
            }
        }
        setAccountInstances(tempAccounts);
    }

    const maxSavingsGPA = dataTable.reduce((max, [account]) => {
        return (account.type in { 'cash isa': 1, 'savings': 1 } && account.annualInterestRate > max) ? account.annualInterestRate : max;
    }, 0);

    return (
        <div className='main'>
            { mode === 'yield' &&
                <div>
                    <label style={{ width: 200, minWidth: 200 }}>{ afterTax ? 'After' : 'Before' } Tax</label>
                    <ToggleSwitch isOn={afterTax} handleToggle={() => { setAfterTax(!afterTax) }} />
                    { afterTax && <span>({taxRate * 100}%)</span> }
                </div>
            }

            <table>
                <thead>
                    <tr>
                        { mode !== 'yield' && <th></th> }
                        <th>Account</th>
                        <th>
                            <Tooltip>
                                <TooltipTrigger>gross p.a.</TooltipTrigger>
                                <TooltipContent>
                                    <div>Gross per annum is the amount of interest the account will yield over the course of a year.<br/><br/> In reality, most banks use a daily rate (1/365th of this), which they will use to calculate your interest each day, and slowly accumulate it, before then adding it to your account at the compound rate (monthly, quarterly, etc.). This rate does not take into account compound interest, like AER does.<br/><br/>This application uses a monthly rate, which takes compound interest into account.</div>
                                </TooltipContent>
                            </Tooltip>
                        </th>
                        { mode !== 'yield' ? <th className='dotted-sides'>START</th> : undefined}

                        <th>
                            <select value={monthOffset} onChange={(e) => setMonthOffset(Number(e.target.value))}>
                                {months.map((month, index) => (
                                    <option key={index} value={index}>{month}</option>
                                ))}
                            </select>
                        </th>
                        {Array.from({ length: 11 }, (_, i) => (
                            <th key={i}>
                                {months[(i + 1 + monthOffset) % months.length]}
                            </th>
                        ))}

                        { mode !== 'yield' ? <>
                            <th className='dotted-sides'>
                                <Tooltip>
                                    <TooltipTrigger>END</TooltipTrigger>
                                    <TooltipContent>
                                        <div>1st of {months[(monthOffset) % months.length]}</div>
                                    </TooltipContent>
                                </Tooltip>
                            </th>
                            <th>
                                <Tooltip>
                                    <TooltipTrigger>Δ</TooltipTrigger>
                                    <TooltipContent>
                                        <div>Difference in balance, at end of the year</div>
                                    </TooltipContent>
                                </Tooltip>
                            </th>
                            <th>
                                <Tooltip>
                                    <TooltipTrigger>Σᵢ {"{"}Δᵢ | Δᵢ &gt; 0{"}"}</TooltipTrigger>
                                    <TooltipContent>
                                        <div>Total interest generated</div>
                                    </TooltipContent>
                                </Tooltip>
                            </th>
                            </> : undefined
                        }
                    </tr>
                </thead>
                <tbody>
                    {dataTable.map(([account, dataRow, state], index) => {

                        const ownedAccount = account.state?.toLowerCase() === 'owned';

                        const delta = dataRow[dataRow.length - 1].value - account.initialDeposit;

                        const [peakGreen, peakRed] = [new Colour(133, 224, 133) /*#85e085*/, new Colour(255, 105, 97) /*ff6961*/];
                        const heatDelta = peakRed.delta(peakGreen);

                        const bank = banks.find(bank => bank.name === account.bank);

                        const nonOptimalStart = account.type in { 'cash isa': 1, 'savings': 1 } && account.initialDeposit !== 0 && account.annualInterestRate < maxSavingsGPA;

                        const pointsOfNote = [];
                        if (account.minInflow && account.minInflow > 0) {
                            pointsOfNote.push(`Minimum monthly inflow: £${account.minInflow}`);
                        }
                        if (account.type.toLowerCase() === 'help to buy') {
                            pointsOfNote.push('25% government bonus on savings, when used towards a first home (see https://www.gov.uk/help-to-buy-isa)');
                        }

                        return (
                            <tr key={index} className={mode !== 'yield' && state === -1 ? 'locked' : ''} hidden={settings.hideExclusiveAccounts && state === -1}>
                                { mode !== 'yield' &&
                                    <td>
                                        { (state !== -1) ?
                                            <input type="checkbox" checked={state === 1} disabled={ownedAccount}/>
                                            : <Tooltip><TooltipTrigger><span className='glyph'style={{ opacity: 1 }}>🔒</span></TooltipTrigger><TooltipContent>This account is only available to existing {account.bank} customers.<br/><br/><span className='mini'>You can hide these in the settings!</span></TooltipContent></Tooltip>
                                        }
                                    </td>
                                }
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', verticalAlign: 'middle', justifyContent: 'flex-start', height: '100%' }}>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <img style={{ marginRight: 8, marginLeft: 10, borderRadius: '20%' }} src={bank?.logoUrl} alt="Icon" width={32} height={32} />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {bank?.nameFull || bank?.name}
                                            </TooltipContent>
                                        </Tooltip>
                                        <span style={{ flex: 1, textAlign: 'center' }} className='accountName'>{bank?.name} <a href={account?.url}>{account.name}</a></span>
                                        { pointsOfNote.length > 0 &&
                                            <Tooltip>
                                                <TooltipTrigger><span>ℹ</span></TooltipTrigger>
                                                <TooltipContent>
                                                    <ul>{pointsOfNote.map((note, index) => <li key={index}>{note}</li>)}</ul>
                                                </TooltipContent>
                                            </Tooltip>
                                        }
                                    </div>
                                </td>
                                <td>{account.annualInterestRate}%</td>
                                { mode === 'yield' ? undefined :
                                    <td className='dotted-sides'>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                £ <input type='number' className={nonOptimalStart ? 'warn' : ''}
                                                    value={account.initialDeposit} onChange={(e) => updateInitialValue(account, Number(e.target.value))}
                                                    disabled={ownedAccount === false}
                                                />
                                            </TooltipTrigger>
                                            {nonOptimalStart && <TooltipContent><span className='glyph'>⚠️</span>For optimal yield, it is advised to move any 'lump sum' money into your single highest-yielding savings account.</TooltipContent>}
                                        </Tooltip>
                                        { !account.maxInflow &&
                                            <div>
                                                + £ <input type='number'
                                                    value={account.monthlyDeposit} onChange={(e) => updateMonthlyValue(account, Number(e.target.value))}
                                                    disabled={ownedAccount === false}
                                                />
                                                <span> p/m</span>
                                            </div>
                                        }
                                    </td>
                                }
                                {dataRow.slice(mode === 'yield' ? 1 : 0).map((balance, month) => {
                                    if (mode !== 'yield') {
                                        const [interestPositive, transferPositive] = [balance.interest >= 0, balance.transfer > 0];
                                        const interestStr = balance.interest >= 0.01 ? `+ ${balance.interest.toFixed(2)}` : undefined;
                                        const transferStr = Math.abs(balance.transfer) >= 0.01 ? (`${transferPositive ? '+' : '-'} ${Math.abs(balance.transfer).toFixed(2)}`) : undefined;

                                        return (
                                            <td className={month === 12 ? 'dotted-sides' : ''}>
                                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                                                    <div style={{ flex: '1 0 auto', minHeight: 26, color: interestPositive ? '#1ed760' : 'red' }}>{interestStr}</div>
                                                    <div style={{ flex: '1 0 auto', minHeight: 26, color: transferPositive ? '#b7b7b7' : 'red' }}>{transferStr}</div>
                                                    <div style={{ flex: '1 0 auto', minHeight: 26 }} className='dotted-top'>£{balance.value.toFixed(2)}</div>
                                                </div>
                                            </td>
                                        );
                                    }
                                    else {
                                        const rank = yieldTable[index][2][month];
                                        const strength = rank / yieldTable.length / 8;

                                        return (
                                            <td style={{ background: peakGreen.add(heatDelta.multiply(strength)).toCss() }}>
                                                <Tooltip>
                                                    <TooltipTrigger>{yieldTable[index][1][month].toFixed(4)}</TooltipTrigger>
                                                    <TooltipContent>
                                                        <span>{rank} (/{yieldTable.length * 12})</span>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </td>
                                        );
                                    }
                                })}
                                { mode !== 'yield' ? <>
                                    <td>£{delta.toFixed(2)}</td>
                                    <td>£{dataRow.slice(1).reduce((sum, cell) => sum + cell.interest, 0).toFixed(2)}</td>
                                </> : undefined }
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default BankAccountTable;
