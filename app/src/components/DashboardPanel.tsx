import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

import { toFinancialString } from '../utils/finance';
import { BankAccount, CategoryStat, Channel, TransactionCategory } from '../types/Bagel';

import './DashboardPanel.css'

type DashboardPanelProps = {
    accounts: Record<string, BankAccount>;
    modesty: boolean;
    categories: TransactionCategory[];
    channels: Channel[];
    categoryStats: CategoryStat[];
    channelStats: Record<string, number>;
};

function DashboardPanel({
    accounts,
    modesty,
    categories,
    channels,
    categoryStats,
    channelStats,
    
}: DashboardPanelProps) {

    const [accountsSum, setAccountsSum] = useState<number>(0);

    const [channelChart, setChannelChart] = useState<{ name?: string; value?: number; colour?: string }[]>([]);
    const [categoryChart, setCategoryChart] = useState<{ name?: string; value?: number; colour?: string }[]>([]);

    useEffect(() => {
        setAccountsSum(
            Object.values(accounts || {}).reduce((sum, account) => sum + getAccountBalance(account), 0)
        )
    }, [accounts])

    useEffect(() => {
        if (categories && channels) {
            const expenditures = [];
            const incomes = [];
            categories.forEach(category => {
                const channel = channels.find(channel => channel.id === category.channelID);
                if (channel?.isIncome) {
                    incomes.push(category);
                }
                else {
                    expenditures.push(category);
                }
            });
        }
    }, [categories, channels])

    useEffect(() => {
        const data: { name?: string; value?: number; colour?: string }[] = [];
        Object.entries(channelStats).forEach((stat) => {
            const channel = channels.find(ch => ch.id === stat[0]);
            if (!channel?.isIncome) {
                const value = stat[1] || 0;
                data.push({
                    name: stat[0],
                    value: Math.round((Math.abs(value))),
                    colour: channel?.colour,
                });
            }
        });
        setChannelChart(data);
    }, [channelStats])

    useEffect(() => {
        const data: { name?: string; value?: number; colour?: string }[] = [];
        categoryStats.forEach((stat) => {
            const channel = channels.find(ch => ch.id === stat.channelID);
            if (!channel?.isIncome) {
                const category = categories.find(ca => ca.id === stat.categoryID);
                data.push({
                    name: category?.name,
                    value: Math.round((Math.abs(stat.totalAmount))),
                    colour: channel?.colour,
                });
            }
        });
        setCategoryChart(data);
    }, [categoryStats])

    function getAccountBalance(account: BankAccount) {
        // TODO this needs to be done pre-db
        const isCard = account.cardNetwork !== undefined;
        const current = account.balance?.current ?? 0;
        const available = account.balance?.available ?? 0;
        const balance = isCard ? -current : available; // cards are negative, others are positive
        return balance;
    }

    return (
        <>
            <div>
                <h1>
                    {!modesty ? `£ ${toFinancialString(accountsSum)}` : '£ ***'}
                </h1>
            </div>
            <div className="chartStack">
                <div className="chartLayer">
                    <ResponsiveContainer width="100%" height={600}>
                        <PieChart>
                            <Pie
                                data={channelChart}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label
                            >
                                {channelChart.map((entry, index) => (
                                    <Cell key={index} fill={entry.colour} />
                                ))}
                            </Pie>
                            <Tooltip />
                            {/* <Legend /> */}
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="chartLayer">
                    <ResponsiveContainer width="100%" height={600}>
                        <PieChart>
                            <Pie
                                data={categoryChart}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={200}
                                innerRadius={112}
                                label
                            >
                                {categoryChart.map((entry, index) => (
                                    <Cell key={index} fill={entry.colour ?? ''} />
                                ))}
                            </Pie>
                            <Tooltip />
                            {/* <Legend /> */}
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </>
    );
}

export default DashboardPanel;
