import React, { useEffect } from 'react';
import { Account } from '../Accounts';
import { Tooltip, TooltipContent, TooltipTrigger } from './Tooltip';
import Colour from '../utils/Colour';
import banks from '../Banks';

import '../styles/App.css';

interface BankAccountTableProps {
    accounts: Account[];
    mode: string;
    setTotalDelta: (totalDelta: number) => void;
    hideExclusiveAccounts: boolean;
}

export interface AccountInstance extends Account {
    id: string,
    initialDeposit: number;
}

class Cell {
    public value: number = 0;
    public transfer: number = 0;
    public interest: number = 0;
}

const months: string[] = ["SEP", "OCT", "NOV", "DEC", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG"];

// const calculateMonthlyBalance = (initialDeposit: number, annualInterestRate: number, compoundRate: number, compoundOffset: number) => {
//     const monthlyInterestRate = annualInterestRate / 100 / 12;
//     const balanceArray: number[] = [];

//     let currentBalance = initialDeposit;

//     let store = 0;

//     for (let month = 1; month <= 12; month++) {

//         const interest = currentBalance * monthlyInterestRate;
//         store += interest;

//         if ((month - compoundOffset) % compoundRate === 0) {
//             currentBalance += store;
//             store = 0;
//         }
//         balanceArray.push(currentBalance);
//     }

//     return balanceArray;
// };

function createDataTable(accounts: AccountInstance[]): [AccountInstance, Cell[]][] {
    const data: [AccountInstance, Cell[]][] = [];
    accounts.forEach((account) => {
        const row: Cell[] = Array.from({ length: 13 }, () => new Cell());
        row[0].value = account.initialDeposit;
        data.push([account, row]);
    });
    return data;
}

function createYieldTable(accounts: AccountInstance[]): [AccountInstance, number[], number[]][] {
    // generate table of yields
    const data: [AccountInstance, number[], number[]][] = [];
    accounts.forEach((account) => {
        const row: number[] = Array.from({ length: 13 }, () => 0);
        row[0] = NaN; // we keep the x*13 shape, so that values align with the data table, but, the first value is useless.

        // generate yields using reverse-traversal
        const monthlyInterestRate = account.annualInterestRate / 100 / 12;
        let accumulation = 0;
        for (let month = 12; month >= 1; month--) {
            // TODO: I don't think is is done correctly?
            accumulation += monthlyInterestRate;
            const interest = accumulation;
            row[month] = interest;
        }

        data.push([account, row, Array.from({ length: 13 }, () => NaN)]);
    });

    // calculation yield rankings
    const yieldList: [number, number, number][] = []; // [accountIndex, month, yield]
    // insertion sort
    for (let i = 0; i < data.length; i++) {
        for (let month = 1; month <= 12; month++) {
            const yieldValue = data[i][1][month];
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
        const [accountIndex, month, _yield] = yieldList[i];
        data[accountIndex][2][month] = i + 1;
    }

    return data;
}

function enactDataTable(dataTable: [AccountInstance, Cell[]][], yieldTable: [AccountInstance, number[], number[]][]): [AccountInstance, Cell[], number][] {
    console.log(dataTable);
    const data: [AccountInstance, Cell[], number][] = dataTable.map(([account, dataRow]) => [account, dataRow, (account.state === 'owned' ? 1 : account.exclusive ? -1 : 0)]); // shallow copy, with buffer
    const interestBuffer: number[] = new Array(data.length).fill(0);

    // GREEDY HEURISTIC
    // 0. create linear ranking of cells, using the yield table
    const yieldList: [number, number, number][] = []; // [accountIndex, month, yield]
    // insertion sort
    for (let i = 0; i < data.length; i++) {
        for (let month = 1; month <= 12; month++) {
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

    // 1. maximise input into highest yield options
    let workingSum = data[0][1][0].value;
    for (let i = 0; i < yieldList.length; i++) {
        const [accountIndex, month, _yieldValue] = yieldList[i];
        const [account, row, state] = data[accountIndex];

        if (!(account.state === 'owned') && account.exclusive) { // exclusive accounts must be owned
            continue;
        }

        if ((account.maxInflow || 0) > 0) { // we must be able to transfer

            // in order to utilise this cell, we must first ensure that the minimum inflow is met, for all cells in this row
            if (state === 0) {
                // the assumption is that, as this row is inactive, then the transfer will be 0 for all cells in this row
                if ((account.minInflow || 0) * 12 <= workingSum) {
                    for (let j = 0; j < 12; j++) {
                        workingSum -= (account.minInflow || 0);
                        data[accountIndex][1][j].transfer += (account.minInflow || 0);
                        data[0][1][j].transfer -= (account.minInflow || 0);
                    }
                    data[accountIndex][2] = 1;
                }
                else {
                    continue; // skip this cell, as we cannot meet the minimum inflow
                }
            }

            const existingInflow = row[month].transfer;
            const maxExpenditure = Math.max(Math.min(((account.maxInflow || 0) - existingInflow), workingSum), 0);
            if (maxExpenditure > 0) {
                workingSum -= maxExpenditure;
                row[month].transfer += maxExpenditure;
                data[0][1][month].transfer -= maxExpenditure;

                if (workingSum <= 0) {
                    break;
                }
            }
        }
    }

    // CHRONOLOGICAL TRAVERSAL
    // traverse by column, to calculate interest and balance
    for (let month = 1; month <= 12; month++) {

        // TODO: interest in savings last???

        for (let i = 0; i < data.length; i++) {
            const [account, row] = data[i];

            // calculate interest generated from previous month
            if (row[month - 1].value > 0) {
                const monthlyInterestRate = account.annualInterestRate / 100 / 12;
                const interest = row[month - 1].value * monthlyInterestRate;
                interestBuffer[i] += interest; //store interest in buffer
            }

            row[month].value = row[month - 1].value;
            if ((month - account.compoundOffset) % account.compoundRate === 0) {
                // only feed interest into balance if it's a compound month
                row[month].value += interestBuffer[i];
                row[month].interest += interestBuffer[i];
                interestBuffer[i] = 0; // reset buffer

                // if this is a savings account, we should feed this into a regular saver
                if (account.type.toLowerCase() === 'savings') {
                    // find best available cell to transfer to
                    for (let j = 0; j < yieldList.length; j++) {
                        const [idealAccountIndex, idealMonth, _yieldValue] = yieldList[j];
                        // account must not be the same as the current account
                        // cell must not be in the past, relative to when this interest was compounded
                        if (idealAccountIndex === i || idealMonth < month) {
                            continue;
                        }
                        // account must not be exclusive, unless it is owned
                        if (data[idealAccountIndex][2] !== 1) { // only utilise already activated cells (not neccesarily best, but, good enough)
                            continue;
                        }

                        // enforce maxInflow
                        // TODO: enforce minInflow
                        if (data[idealAccountIndex][1][idealMonth].transfer >= (data[idealAccountIndex][0].maxInflow || 0)) {
                            continue;
                        }

                        data[idealAccountIndex][1][idealMonth].transfer += row[month].interest;
                        row[idealMonth].transfer -= row[month].interest;
                        break;
                    }
                }
            }

            // OPTIMISTIC HEURISTIC
            // alter balance; according to heuristic
            if (row[month].transfer !== 0) {
                row[month].value += row[month].transfer;
                data[0][1][month].value -= row[month].transfer;
            }
        }
    }

    return data;
}

const BankAccountTable: React.FC<BankAccountTableProps> = ({ accounts, mode, setTotalDelta, hideExclusiveAccounts }) => {

    const [accountInstances, setAccountInstances] = React.useState<AccountInstance[]>([]);
    const [lumpSum, setLumpSum] = React.useState<number>(0);

    const [dataTable, setDataTable] = React.useState<[AccountInstance, Cell[], number][]>([]);
    const [yieldTable, setYieldTable] = React.useState<[AccountInstance, number[], number[]][]>([]);

    // HANDLE STATE CHANGE
    useEffect(() => {
        setLumpSum(1000); //temp
    }, []);

    useEffect(() => {
        const tempAccounts: AccountInstance[] = accounts.map((account) => {
            return {
                id: `${account.bank}#${account.name}`.replace(/ /g, '-').toLowerCase(),
                ...account,
                initialDeposit: 0,
            };
        });
        setAccountInstances(tempAccounts);
    }, [accounts]);

    useEffect(() => {
        if (accountInstances.length > 0) {
            const tempAccountInstances = accountInstances.slice();
            tempAccountInstances[0].initialDeposit = lumpSum;
            setAccountInstances(tempAccountInstances);
        }
    }, [lumpSum]);

    useEffect(() => {
        if (accountInstances.length > 0) {
            // filter accounts
            const visibleAccounts = accountInstances.filter(account =>
                account.type.toLowerCase() === 'savings'
                || (account.type.toLowerCase() === 'regular saver' && (mode === 'crs' && account.state?.toLowerCase() === 'owned') || mode === 'nrs')
                || mode === 'yield'
            );

            // generate data table
            const tempDataTable = createDataTable(visibleAccounts);

            // generate yield table
            const tempYieldTable = createYieldTable(visibleAccounts);

            // calculate data table
            const newDataTable = enactDataTable(tempDataTable, tempYieldTable);

            setDataTable(newDataTable);
            setYieldTable(tempYieldTable);
        }
    }, [accountInstances, mode]);

    useEffect(() => {
        // handle total delta
        const totalDelta = dataTable.reduce((sum, [, row]) => {
            return sum + (row[row.length - 1].value - row[0].value);
        }, 0);
        setTotalDelta(totalDelta);

    }, [dataTable, setTotalDelta]);

    function updateInitialValue(index: number, value: number) {
        const tempAccounts = accountInstances.slice();
        tempAccounts[index].initialDeposit = value;
        setAccountInstances(tempAccounts);
    }

    return (
        <div>
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
                        {Array.from({ length: 12 }, (_, i) => (
                            <th key={i}>{months[i]}</th>
                        ))}
                        { mode !== 'yield' ? <>
                            <th className='dotted-sides'>
                                <Tooltip>
                                    <TooltipTrigger>Δ</TooltipTrigger>
                                    <TooltipContent>
                                        <div>Difference in balance, at end of the year</div>
                                    </TooltipContent>
                                </Tooltip>
                            </th>
                            <th className='dotted-sides'>
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
                        // const monthlyBalances = calculateMonthlyBalance(account.initialDeposit, account.annualInterestRate, account.compoundRate, account.compoundOffset);

                        const delta = dataRow[dataRow.length - 1].value - account.initialDeposit;

                        const [peakGreen, peakRed] = [new Colour(133, 224, 133) /*#85e085*/, new Colour(255, 105, 97) /*ff6961*/];
                        const heatDelta = peakRed.delta(peakGreen);

                        const bank = banks.find(bank => bank.name === account.bank);

                        return (
                            <tr key={index} className={mode !== 'yield' && state === -1 ? 'locked' : ''} hidden={hideExclusiveAccounts && state === -1}>
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
                                        <span style={{ flex: 1, textAlign: 'center' }}>{bank?.name} <a href={account?.url}>{account.name}</a></span>
                                    </div>
                                </td>
                                <td>{account.annualInterestRate}%</td>
                                { mode === 'yield' ? undefined :
                                    <td className='dotted-sides'>
                                        £ <input type='number'
                                            value={account.initialDeposit} onChange={(e) => updateInitialValue(index, Number(e.target.value))}
                                            disabled={ownedAccount === false}
                                        />
                                    </td>
                                }
                                {dataRow.slice(1).map((balance, month) => {
                                    if (mode !== 'yield') {
                                        const [interestPositive, transferPositive] = [balance.interest >= 0, balance.transfer > 0];
                                        const interestStr = balance.interest >= 0.01 ? `+ ${balance.interest.toFixed(2)}` : undefined;
                                        const transferStr = Math.abs(balance.transfer) >= 0.01 ? (`${transferPositive ? '+' : '-'} ${Math.abs(balance.transfer).toFixed(2)}`) : undefined;
                                        return (
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                                                    <div style={{ flex: '1 0 auto', minHeight: 26, color: interestPositive ? '#1ed760' : 'red' }}>{interestStr}</div>
                                                    <div style={{ flex: '1 0 auto', minHeight: 26, color: transferPositive ? '#b7b7b7' : 'red' }}>{transferStr}</div>
                                                    <div style={{ flex: '1 0 auto', minHeight: 26 }} className='dotted-top'>£{balance.value.toFixed(2)}</div>
                                                </div>
                                            </td>
                                        );
                                    }
                                    else {
                                        const rank = yieldTable[index][2][month+1];
                                        const strength = rank / yieldTable.length / 8;
                                        return (
                                            <td style={{ background: peakGreen.add(heatDelta.multiply(strength)).toCss() }}>
                                                <Tooltip>
                                                    <TooltipTrigger>{yieldTable[index][1][month+1].toFixed(4)}</TooltipTrigger>
                                                    <TooltipContent>
                                                        <div>Ranking: {rank}</div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </td>
                                        );
                                    }
                                })}
                                { mode !== 'yield' ? <>
                                    <td className='dotted-sides'>£{delta.toFixed(2)}</td>
                                    <td className='dotted-sides'>£{dataRow.slice(1).reduce((sum, cell) => sum + cell.interest, 0).toFixed(2)}</td>
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
