import { Account } from "../Accounts";
import banks from '../Banks';
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";
import WebScraper from "../WebScraper";

export type Config = {
    banks: string[];
    customAccounts: Account[];
    personalAllowance: number;
    startingRateForSavings: number;
    personalSavingsAllowance: number;
}

type ConfigControlProps = {
    config: Config;
    setConfig: (config: Config) => void;
    setLoading: (loading: boolean) => void;
}

const defaultAccount: Account = {
    bank: 'Your',
    name: '',
    type: 'savings',
    interestType: 'variable',
    annualInterestRate: 0,
    compoundRate: 0,
    compoundOffset: 0,
    minInflow: 0,
    maxInflow: Infinity,
    exclusive: false,
}

const months: string[] = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function ConfigControl({ config, setConfig, setLoading }: ConfigControlProps) {

    function setPersonalAllowance(value: number) {
        setConfig({ ...config, personalAllowance: value });
    }

    function setStartingRateForSavings(value: number) {
        setConfig({ ...config, startingRateForSavings: value });
    }

    function setPersonalSavingsAllowance(value: number) {
        setConfig({ ...config, personalSavingsAllowance: value });
    }

    function createNewAccount() {
        const newAccount = { ...defaultAccount, state: 'owned' };
        setConfig({ ...config, customAccounts: [...config.customAccounts, newAccount] });
    }

    function deleteAccount(index: number) {
        const newAccounts = [...config.customAccounts];
        newAccounts.splice(index, 1);
        setConfig({ ...config, customAccounts: newAccounts });
    }

    function autoFillAccount(index: number) {
        // const account = config.customAccounts[index];
        // const url = prompt('Enter the URL of the account page') || undefined;
        const url = 'https://www.natwest.com/savings/first-saver.html';

        if (url) {
            const webScraper = new WebScraper(url);
            setLoading(true);
            webScraper.scrapeAccount().then(data => {
                setLoading(false);
                console.log(data);
            });

            // setConfig({ ...config, customAccounts: [...config.customAccounts] });
        }
    }

    return (
        <div>
            <h2>Configuration</h2>
            {/* <h4 style={{ color: 'grey' }}>None of this information is stored. <Tooltip><TooltipTrigger><span className=''>ℹ</span></TooltipTrigger><TooltipContent>todo</TooltipContent></Tooltip></h4> */}

            <hr/>
            <h3>
                Your Banks
                <Tooltip>
                    <TooltipTrigger><span className=''>ℹ</span></TooltipTrigger>
                    <TooltipContent>Some banks offer exclusive deals for existing customers. By knowing who you bank with, we can take these deals into account.</TooltipContent>
                </Tooltip>
            </h3>
            {
                banks.map(bank => bank.name === 'Your' ? null :
                    <div className='setting'>
                        <input
                            type="checkbox"
                            id={bank.name}
                            checked={config.banks.includes(bank.name)}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setConfig({ ...config, banks: [...config.banks, bank.name] });
                                } else {
                                    setConfig({ ...config, banks: config.banks.filter(b => b !== bank.name) });
                                }
                            }}
                        />
                        <label htmlFor={bank.name}>{bank.nameFull || bank.name}</label>
                    </div>
                )
            }

            <hr/><h3>Your Savings Account(s)</h3>
            <table>
                <tr>
                    <th>Bank</th>
                    <th>Account</th>
                    <th>Type</th>
                    <th>Interest Type</th>
                    <th>Gross p.a.</th>
                    <th>
                        <Tooltip>
                            <TooltipTrigger>Compound Rate ℹ</TooltipTrigger>
                            <TooltipContent>
                                <div>How frequently is your accumulated interest added to your account?</div>
                                <ul>
                                    <li>Monthly (1)</li>
                                    <li>Quarterly (3)</li>
                                    <li>Annually (12)</li>
                                    <li>...</li>
                                </ul>
                            </TooltipContent>
                        </Tooltip>
                    </th>
                    <th>
                        <Tooltip>
                            <TooltipTrigger>Compound Offset ℹ</TooltipTrigger>
                            <TooltipContent>What is the first month of the (calander) year on which you recieve your interest?</TooltipContent>
                        </Tooltip>
                    </th>
                    <th>
                        <Tooltip>
                            <TooltipTrigger>Minimum Inflow ℹ</TooltipTrigger>
                            <TooltipContent>What is the minimum amount you must pay into the account, each month, if any?</TooltipContent>
                        </Tooltip>
                    </th>
                    <th>
                        <Tooltip>
                            <TooltipTrigger>Maximum Inflow ℹ</TooltipTrigger>
                            <TooltipContent>What is the upper limit that you can pay into the account, each month, if any?</TooltipContent>
                        </Tooltip>
                    </th>
                </tr>
                {
                    config.customAccounts.map((account, index) =>
                        <tr>
                            <td>
                                <select value={account.bank} onChange={(e) => {
                                    const newAccounts = [...config.customAccounts];
                                    newAccounts[index].bank = e.target.value;
                                    setConfig({ ...config, customAccounts: newAccounts });
                                }}>
                                    {
                                        config.banks.map(bank =>
                                            <option value={bank}>{bank}</option>
                                        )
                                    }
                                    <option value="Your">Other</option>
                                </select>
                            </td>
                            <td>
                                <input type="text" value={account.name} onChange={(e) => {
                                    const newAccounts = [...config.customAccounts];
                                    newAccounts[index].name = e.target.value;
                                    setConfig({ ...config, customAccounts: newAccounts });
                                }} />
                            </td>
                            <td>
                                <select value={account.type} onChange={(e) => {
                                    const newAccounts = [...config.customAccounts];
                                    newAccounts[index].type = e.target.value;
                                    setConfig({ ...config, customAccounts: newAccounts });
                                }}>
                                    <option value="savings">Savings</option>
                                    <option value="regular saver">Regular Saver</option>
                                    <option value="cash isa">Cash ISA</option>
                                    <option value="help to buy">Help to Buy ISA</option>
                                </select>
                            </td>
                            <td>
                                <select value={account.interestType} onChange={(e) => {
                                    const newAccounts = [...config.customAccounts];
                                    newAccounts[index].interestType = e.target.value;
                                    setConfig({ ...config, customAccounts: newAccounts });
                                }}>
                                    <option value="variable">Variable</option>
                                    <option value="fixed">Fixed</option>
                                </select>
                            </td>
                            <td>
                                <input type="number" value={account.annualInterestRate} onChange={(e) => {
                                    const newAccounts = [...config.customAccounts];
                                    newAccounts[index].annualInterestRate = Number(e.target.value);
                                    setConfig({ ...config, customAccounts: newAccounts });
                                }} />%
                            </td>
                            <td>
                                <input type="number" value={account.compoundRate} onChange={(e) => {
                                    const newAccounts = [...config.customAccounts];
                                    newAccounts[index].compoundRate = Number(e.target.value);
                                    setConfig({ ...config, customAccounts: newAccounts });
                                }} />
                            </td>
                            <td>
                                <select value={account.compoundOffset} onChange={(e) => {
                                    const newAccounts = [...config.customAccounts];
                                    newAccounts[index].compoundOffset = Number(e.target.value);
                                    setConfig({ ...config, customAccounts: newAccounts });
                                }}>
                                    {
                                        Array.from(Array(account.compoundRate).keys()).map(i =>
                                            <option value={i+1}>{months[i]}</option>
                                        )
                                    }
                                </select>
                            </td>
                            <td>
                                <input type="number" value={account.minInflow} onChange={(e) => {
                                    const newAccounts = [...config.customAccounts];
                                    newAccounts[index].minInflow = Number(e.target.value);
                                    setConfig({ ...config, customAccounts: newAccounts });
                                }} />
                            </td>
                            <td>
                                <input type="number" value={account.maxInflow} onChange={(e) => {
                                    const newAccounts = [...config.customAccounts];
                                    newAccounts[index].maxInflow = Number(e.target.value);
                                    setConfig({ ...config, customAccounts: newAccounts });
                                }} />
                            </td>
                            <td hidden={true}>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <span className="glyph" style={{ cursor: "pointer" }} onClick={() => autoFillAccount(index)}>🌩</span>
                                    </TooltipTrigger>
                                    <TooltipContent>Autofill from web</TooltipContent>
                                </Tooltip>
                            </td>
                            <td>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <span className="glyph" style={{ cursor: "pointer" }} onClick={() => deleteAccount(index)}>🗑️</span>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete</TooltipContent>
                                </Tooltip>
                            </td>
                        </tr>
                    )
                }
            </table>
            <button style={{marginTop: 12}} onClick={createNewAccount}>Add Another Account <span className="glyph">➕</span></button>

            <hr/>
            <h3>
                Your Tax Rate
                <Tooltip>
                    <TooltipTrigger><span className=''>ℹ</span></TooltipTrigger>
                    <TooltipContent>Some accounts (such as ISAs) are exempt from tax, but typically yield lower interest than regular accounts. Knowing if/how much you are under or over the tax threshold can let us account for these, to maximise your in-hand revenue.</TooltipContent>
                </Tooltip>
            </h3>
            <div className='setting'>
                <label htmlFor="pa">Personal Allowance</label>
                <input type="number" id="pa" value={config.personalAllowance} onChange={(e) => setPersonalAllowance(Number(e.target.value))} />
            </div>
            <div className='setting'>
                <label htmlFor="srfs">Starting rate for savings</label>
                <input type="number" id="srfs" value={config.startingRateForSavings} onChange={(e) => setStartingRateForSavings(Number(e.target.value))} />
            </div>
            <div className='setting'>
                <label htmlFor="psa">Personal Savings Allowance</label>
                <input type="number" id="psa" value={config.personalSavingsAllowance} onChange={(e) => setPersonalSavingsAllowance(Number(e.target.value))} />
            </div>
        </div>
    )
}

export default ConfigControl;
