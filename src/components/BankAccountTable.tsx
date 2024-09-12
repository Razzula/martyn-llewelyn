import React, { useEffect } from 'react';
import { Account } from '../App';
import { Tooltip, TooltipContent, TooltipTrigger } from './Tooltip';

import '../styles/App.css';

interface BankAccountTableProps {
    accounts: Account[];
    mode: string;
    setTotalDelta: (totalDelta: number) => void;
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

function createDataTable(accounts: Account[]): [Account, Cell[]][] {
    const data: [Account, Cell[]][] = [];
    accounts.forEach((account) => {
        const row: Cell[] = Array.from({ length: 13 }, () => new Cell());
        row[0].value = account.initialDeposit;
        data.push([account, row]);
    });
    return data;
}

function enactDataTable(dataTable: [Account, Cell[]][]): [Account, Cell[]][] {
    const data: [Account, Cell[]][] = dataTable.map(([account, dataRow]) => [account, dataRow]); // shallow copy, with buffer
    const interestBuffer: number[] = new Array(data.length).fill(0);

    // traverse by column
    for (let month = 1; month <= 12; month++) {
        let balance = data[0][1][month - 1].value;

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
            }

            // alter balance
            // currently, we just max out, where possible
            const maxExpenditure = Math.min(account.maxInflow || 0, balance);
            if (maxExpenditure > 0) {
                balance -= maxExpenditure;
                row[month].value += maxExpenditure;
                row[month].transfer += maxExpenditure;
                data[0][1][month].value -= maxExpenditure;
                data[0][1][month].transfer -= maxExpenditure;
            }
        }
    }

    return data;
}

const BankAccountTable: React.FC<BankAccountTableProps> = ({ accounts, mode, setTotalDelta }) => {

    const [dataTable, setDataTable] = React.useState<[Account, Cell[]][]>([]);

    // HANDLE STATE CHANGE
    useEffect(() => {
        // filter accounts
        const visibleAccounts = accounts.filter(account =>
            account.type.toLowerCase() === 'savings'
            || (account.type.toLowerCase() === 'regular saver' && (mode === 'crs' && account.state?.toLowerCase() === 'owned') || mode === 'nrs')
        );

        // generate data table
        const tempDataTable = createDataTable(visibleAccounts);

        // TODO: reverse-generate a yield table

        // calculate data table
        // tempDataTable.forEach(([account, row]) => {
        //     const monthlyBalances = calculateMonthlyBalance(account.initialDeposit, account.annualInterestRate, account.compoundRate, account.compoundOffset);
        //     for (let i = 1; i < row.length; i++) {
        //         row[i] = monthlyBalances[i - 1];
        //     }
        // });
        const newDataTable = enactDataTable(tempDataTable);

        setDataTable(newDataTable);

    }, [accounts, mode]);

    useEffect(() => {
        // handle total delta
        const totalDelta = dataTable.reduce((sum, [, row]) => {
            return sum + (row[row.length - 1].value - row[0].value);
        }, 0);
        setTotalDelta(totalDelta);

    }, [dataTable]);

    return (
        <div>
            <table>
                <thead>
                    <tr>
                        <th></th>
                        <th>Account</th>
                        <th className='dotted-sides'>
                            <Tooltip>
                                <TooltipTrigger>gross p.a.</TooltipTrigger>
                                <TooltipContent>
                                    <div>Gross per annum is the amount of interest the account will yield over the course of a year.<br/><br/> In reality, most banks use a daily rate (1/365th of this), which they will use to calculate your interest each day, and slowly accumulate it, before then adding it to your account at the compound rate (monthly, quarterly, etc.). This rate does not take into account compound interest, like AER does.<br/><br/>This application uses a monthly rate, which takes compound interest into account.</div>
                                </TooltipContent>
                            </Tooltip>
                        </th>
                        <th className='dotted-sides'>START</th>
                        {Array.from({ length: 12 }, (_, i) => (
                            <th key={i}>{months[i]}</th>
                        ))}
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
                    </tr>
                </thead>
                <tbody>
                    {dataTable.map(([account, dataRow], index) => {

                        const ownedAccount = account.state?.toLowerCase() === 'owned';
                        // const monthlyBalances = calculateMonthlyBalance(account.initialDeposit, account.annualInterestRate, account.compoundRate, account.compoundOffset);

                        const delta = dataRow[dataRow.length - 1].value - account.initialDeposit;

                        return (
                            <tr key={index}>
                                <td><input type="checkbox" defaultChecked={ownedAccount} disabled={ownedAccount} /></td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', verticalAlign: 'middle', justifyContent: 'flex-start', height: '100%' }}>
                                        <img style={{ marginRight: 8, marginLeft: 10 }} src="https://www.shropshire-chamber.co.uk/wp-content/uploads/2021/06/Natwest-Logo.png" alt="Icon" width={26} height={32} />
                                        <span style={{ flex: 1, textAlign: 'center' }}>{account.name}</span>
                                    </div>
                                </td>
                                <td>{account.annualInterestRate}%</td>
                                <td className='dotted-sides'>£{account.initialDeposit.toFixed(2)}</td>
                                {dataRow.slice(1).map((balance, _month) => {
                                    const [interestPositive, transferPositive] = [balance.interest >= 0, balance.transfer > 0];
                                    const interestStr = balance.interest >= 0.01 ? `+ ${balance.interest.toFixed(2)}` : undefined;
                                    const transferStr = Math.abs(balance.transfer) >= 0.01 ? (`${transferPositive ? '+' : '-'} ${Math.abs(balance.transfer).toFixed(2)}`) : undefined;
                                    return (
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                                                <div style={{ flex: '1 0 auto', minHeight: 26, color: interestPositive ? '#1ed760' : 'red' }}>{interestStr}</div>
                                                <div style={{ flex: '1 0 auto', minHeight: 26, color: transferPositive ? '#1ed760' : 'red' }}>{transferStr}</div>
                                                <div style={{ flex: '1 0 auto', minHeight: 26 }} className='dotted-top'>£{balance.value.toFixed(2)}</div>
                                            </div>
                                        </td>
                                    );
                            })}
                                <td className='dotted-sides'>£{delta.toFixed(2)}</td>
                                <td className='dotted-sides'>£{dataRow.slice(1).reduce((sum, cell) => sum + cell.interest, 0).toFixed(2)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default BankAccountTable;
