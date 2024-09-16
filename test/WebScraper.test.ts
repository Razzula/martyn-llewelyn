import { expect, test, describe } from "bun:test";
import accounts from '../src/Accounts';
import WebScraper from '../src/WebScraper';

accounts.forEach(account => {
    describe(`${account.bank} - ${account.name}`, async () => {

        expect(account.url).toBeDefined();

        const webScraper = new WebScraper(account.url || '', false);
        console.log(`Pinging ${account.url}...`);
        const accountData = await webScraper.scrapeAccount();

        test(`bank`, () => {
            expect(accountData.bank).toEqual(account.bank);
        });

        // test(`name`, () => {
        //     expect(accountData.name).toEqual(account.name);
        // });

    });
});
