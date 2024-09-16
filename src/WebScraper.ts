import { Account } from "./Accounts";
import banks from "./Banks";

export class WebScraper {
    private url: string;
    private proxyUrl: string;

    constructor(url: string, useProxy = true) {
        this.url = url.toLowerCase();

        if (!useProxy) {
            this.proxyUrl = url;
        }
        else {
            this.proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        }
    }

    async scrape() {
        return fetch(this.proxyUrl)
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`Network response was not ok: ${response.statusText}. Response body: ${text}`);
                    });
                }

                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return response.json();
                } else {
                    return response.text();
                }
            })
            .catch(error => console.error('Error fetching through proxy:', error));
    }

    async scrapeAccount() {
        return this.scrape().then(data => {

            const accountData: Account = {
                bank: 'Other',
                name: 'Unnamed Account',
                type: '',
                annualInterestRate: NaN,
                compoundRate: NaN,
                compoundOffset: NaN,
                exclusive: false,
                url: this.url,
            };

            // infer bank from url
            for (const bank of banks) {
                const bankName = bank.name.toLowerCase().replace(/ /g, '');
                if (this.url.includes(bank?.url || bankName)) {
                    accountData.bank = bank.name;
                    break;
                }

                if (this.url.includes(bankName)) {
                    accountData.bank = bank.name;
                    break;
                }
            }

            // infer from data
            if (typeof data === 'string') {
                const nameMatch = data.match(/Account name:\s*[^<]*/i);
                if (nameMatch && nameMatch[1]) {
                    accountData.name = nameMatch[1].trim();
                    console.log(accountData.name);
                }
            }

            return accountData;
        });
    }
}

export default WebScraper;
