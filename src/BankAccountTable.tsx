import React from 'react';
import {Account} from './App';

import './App.css';

interface BankAccountTableProps {
    accounts: Account[];
    mode: string;
    setTotalDelta: (totalDelta: number) => void;
}

const months: string[] = [ "SEP", "OCT", "NOV", "DEC", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG"] ;

const calculateMonthlyBalance = (initialDeposit: number, annualInterestRate: number, compoundRate: number, compoundOffset: number) => {
    const monthlyInterestRate = annualInterestRate / 100 / 12;
    const balanceArray: number[] = [];

    let currentBalance = initialDeposit;

    let store = 0;

    for (let month = 1; month <= 12; month++) {

        const interest = currentBalance * monthlyInterestRate;
        store += interest;

        if ((month - compoundOffset) % compoundRate === 0) {
            currentBalance += store;
            store = 0;
        }
        balanceArray.push(currentBalance);
    }

    return balanceArray;
};

const BankAccountTable: React.FC<BankAccountTableProps> = ({ accounts, mode, setTotalDelta}) => {

    const visibleAccounts = accounts.filter(account =>
        account.type.toLowerCase() === 'savings'
        || (account.type.toLowerCase() === 'regular saver' && (mode === 'crs' && account.state?.toLowerCase() === 'owned') || mode === 'nrs')
    );

    let totalDelta = 0;

    const res = (
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
                    {visibleAccounts.map((account, index) => {

                        const ownedAccount = account.state?.toLowerCase() === 'owned';
                        const monthlyBalances = calculateMonthlyBalance(account.initialDeposit, account.annualInterestRate, account.compoundRate, account.compoundOffset);

                        const delta = monthlyBalances[monthlyBalances.length-1] - account.initialDeposit;
                        totalDelta += delta;

                        return (
                            <tr key={index}>
                                <td><input type="checkbox" defaultChecked={ownedAccount} disabled={ownedAccount}/></td>
                                <td>
                                    <img src="https://www.shropshire-chamber.co.uk/wp-content/uploads/2021/06/Natwest-Logo.png" alt="Icon" width={26} height={32}/>
                                    {account.name}
                                </td>
                                <td>{account.annualInterestRate}%</td>
                                <td className='column-border'>£{account.initialDeposit.toFixed(2)}</td>
                                {monthlyBalances.map((balance, month) => (
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

    setTotalDelta(totalDelta);

    return res;
};

export default BankAccountTable;
