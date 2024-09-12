import React, { useEffect } from 'react';
import { Account } from './App';

import './App.css';

interface BankAccountTableProps {
    accounts: Account[];
    mode: string;
    setTotalDelta: (totalDelta: number) => void;
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

function createDataTable(accounts: Account[]): [Account, number[]][] {
    const data: [Account, number[]][] = [];
    accounts.forEach((account) => {
        const row: number[] = new Array(13).fill(NaN);
        row[0] = account.initialDeposit;
        data.push([account, row]);
    });
    return data;
}

function enactDataTable(dataTable: [Account, number[]][]): [Account, number[]][] {
    const data: [Account, number[]][] = dataTable.map(([account, dataRow]) => [account, dataRow]); // shallow copy, with buffer
    const interestBuffer: number[] = new Array(data.length).fill(0);

    // traverse by column
    for (let month = 1; month <= 12; month++) {
        let balance = data[0][1][month - 1];

        // TODO: interest in savings last???

        for (let i = 0; i < data.length; i++) {
            const [account, row] = data[i];

            // calculate interest generated from previous month
            if (row[month - 1] > 0) {
                const monthlyInterestRate = account.annualInterestRate / 100 / 12;
                const interest = row[month - 1] * monthlyInterestRate;
                interestBuffer[i] += interest; //store interest in buffer
            }

            row[month] = row[month - 1];
            if (month % account.compoundRate === 0) {
                // only feed interest into balance if it's a compound month
                row[month] += interestBuffer[i];
                interestBuffer[i] = 0; // reset buffer
            }

            // alter balance
            // currently, we just max out, where possible
            const maxExpenditure = Math.min(account.maxInflow || 0, balance);
            if (maxExpenditure > 0) {
                balance -= maxExpenditure;
                row[month] += maxExpenditure;
                data[0][1][month] -= maxExpenditure;
            }
        }
    }

    return data;
}

const BankAccountTable: React.FC<BankAccountTableProps> = ({ accounts, mode, setTotalDelta }) => {

    const [dataTable, setDataTable] = React.useState<[Account, number[]][]>([]);

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
        //     // console.log(monthlyBalances);
        //     for (let i = 1; i < row.length; i++) {
        //         row[i] = monthlyBalances[i - 1];
        //     }
        // });
        const newDataTable = enactDataTable(tempDataTable);

        setDataTable(newDataTable);

    }, [accounts, mode]);

    useEffect(() => {
        console.log(dataTable);
        // handle total delta
        const totalDelta = dataTable.reduce((sum, [, row]) => {
            return sum + (row[row.length - 1] - row[0]);
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
                        <th>Gross p.a.</th>
                        <th className='column-border'>START</th>
                        {Array.from({ length: 12 }, (_, i) => (
                            <th key={i}>{months[i]}</th>
                        ))}
                        <th className='column-border'>Δ</th>
                    </tr>
                </thead>
                <tbody>
                    {dataTable.map(([account, dataRow], index) => {

                        const ownedAccount = account.state?.toLowerCase() === 'owned';
                        // const monthlyBalances = calculateMonthlyBalance(account.initialDeposit, account.annualInterestRate, account.compoundRate, account.compoundOffset);

                        const delta = dataRow[dataRow.length - 1] - account.initialDeposit;

                        return (
                            <tr key={index}>
                                <td><input type="checkbox" defaultChecked={ownedAccount} disabled={ownedAccount} /></td>
                                <td>
                                    <img src="https://www.shropshire-chamber.co.uk/wp-content/uploads/2021/06/Natwest-Logo.png" alt="Icon" width={26} height={32} />
                                    {account.name}
                                </td>
                                <td>{account.annualInterestRate}%</td>
                                <td className='column-border'>£{account.initialDeposit.toFixed(2)}</td>
                                {dataRow.slice(1).map((balance, month) => (
                                    <td key={month}>£{balance.toFixed(2)}</td>
                                ))}
                                <td className='column-border'>£{delta.toFixed(2)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default BankAccountTable;
