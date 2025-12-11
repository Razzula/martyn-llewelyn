import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Bar } from 'recharts';

import { toFinancialString } from '../utils/finance';
import { BankAccount, CategoryStat, Channel, TransactionCategory } from '../types/Bagel';
import { getAccountBalance } from '../utils/utils';

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
                const value = Number(Math.abs(stat[1] || 0).toFixed(2));
                if (value !== 0) {
                    data.push({
                        name: stat[0],
                        value: value,
                        colour: channel?.colour,
                    });
                }
            }
        });
        setChannelChart(data);
    }, [channelStats])

    useEffect(() => {
        const data: { name?: string; value?: number; colour?: string }[] = [];
        categoryStats.forEach((stat) => {
            const channel = channels.find(ch => ch.id === stat.channelID);
            if (!channel?.isIncome && stat.totalAmount !== null) {
                const category = categories.find(ca => ca.id === stat.categoryID);
                data.push({
                    name: category?.name,
                    value: Number(Math.abs(stat.totalAmount).toFixed(2)),
                    colour: channel?.colour,
                });
            }
        });
        setCategoryChart(data);
    }, [categoryStats])

    return (
        <>
            <div>
                <h1>
                    {!modesty ? `£ ${toFinancialString(accountsSum)}` : '£ ***'}
                </h1>
            </div>
            <div className='dashboard'>
                <div className='leftPane'>
                    <div className='chartStack'>
                        <div className='chartLayer'>
                            <ResponsiveContainer width='100%' height='100%'>
                                {/* smaller pie (channelChart) */}
                                <PieChart>
                                    <Pie
                                        data={channelChart} dataKey='value' nameKey='name' 
                                        cx='50%' cy='50%' outerRadius={125}
                                        startAngle={90} endAngle={-270}
                                    >
                                        {channelChart.map((entry, i) => (
                                            <Cell key={i} fill={entry.colour ?? '#cccccc'} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className='chartLayer'>
                            <ResponsiveContainer width='100%' height='100%'>
                                {/* larger pie (categoryChart) */}
                                <PieChart>
                                    <Pie
                                        data={categoryChart} dataKey='value' nameKey='name'
                                        cx='50%' cy='50%' outerRadius={225} innerRadius={125}
                                        startAngle={90} endAngle={-270}
                                        label
                                    >
                                        {categoryChart.map((entry, i) => (
                                            <Cell key={i} fill={entry.colour ?? '#cccccc'} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
                <div className='rightPane'>
                    <ResponsiveContainer width='100%' height='100%'>
                        <BarChart data={categoryChart} margin={{ top: 20, right: 20, left: 0, bottom: 60 }}>
                            <CartesianGrid strokeDasharray='3 3' />
                            <XAxis dataKey='name' angle={-45} textAnchor='end' interval={0} height={60} />
                            <YAxis />
                            {/* <Tooltip /> */}
                            <Bar dataKey='value'>
                                {categoryChart.map((entry, index) => (
                                    <Cell key={index} fill={entry.colour ?? '#999999'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </>
    );
}

export default DashboardPanel;
